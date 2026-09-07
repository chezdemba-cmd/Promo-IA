import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { api, checked, HttpError, jsonBody } from '@/lib/api';
import { uuid, clientSchema, contactSchema, contactPatch, campaignSchema, campaignPatch, reservationSchema, handledSchema, replySchema } from '@/lib/contracts';
import { normalizePhone } from '@/lib/phone';
import { maskClient } from '@/lib/mask';
import { computeReminderAt } from '@/lib/campaigns';
import { suggestedReply } from '@/lib/ai';
import { sendText } from '@/lib/whatsapp';

export function validId(id) { if (!uuid.safeParse(id).success) throw new HttpError(400, 'Identifiant invalide.'); return id; }
export async function row(table, id) {
  const data = checked(await db().from(table).select('*').eq('id', validId(id)).maybeSingle());
  if (!data) throw new HttpError(404, 'Ressource introuvable.');
  return data;
}
export function paging(request, max = 100) {
  const q = new URL(request.url).searchParams;
  const page = Number(q.get('page') || 1), size = Number(q.get('page_size') || max);
  if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(size) || size < 1 || size > max) throw new HttpError(400, 'Pagination invalide.');
  return { q, start: (page - 1) * size, end: page * size - 1 };
}
export async function allRows(table, select = '*', apply = q => q) {
  const out = []; let start = 0;
  while (true) {
    const batch = checked(await apply(db().from(table).select(select)).order('id').range(start, start + 499));
    out.push(...batch); if (batch.length < 500) return out; start += 500;
    if (start >= 100000) throw new HttpError(413, 'Volume trop important pour cette opération.');
  }
}
function ensureCampaign(c) {
  if (c.status === 'programme' && (!c.send_at || !c.message_main)) throw new HttpError(400, 'Date d’envoi et message obligatoires pour programmer.');
  if (c.send_at && c.event_at && new Date(c.send_at) >= new Date(c.event_at)) throw new HttpError(400, 'L’envoi doit précéder l’événement.');
  if (c.status === 'programme' && new Date(c.send_at) <= new Date()) throw new HttpError(400, 'La date d’envoi doit être future.');
  if (c.reminder_hours && (!c.event_at || !c.message_reminder)) throw new HttpError(400, 'Un rappel nécessite une date et un message.');
  for (const field of ['message_main','message_reminder']) if (c[field] && !/\bstop\b/i.test(c[field])) throw new HttpError(400, 'Chaque message doit indiquer comment se désinscrire avec STOP.');
  c.reminder_at = computeReminderAt(c.event_at, c.reminder_hours);
  if (c.reminder_at && c.send_at && new Date(c.reminder_at) <= new Date(c.send_at)) throw new HttpError(400, 'Le rappel doit suivre l’envoi initial.');
  return c;
}
export const clientsGet = api(async request => {
  const { start, end } = paging(request, 500);
  const data = checked(await db().from('clients').select('*').order('name').range(start, end));
  return NextResponse.json(data.map(maskClient));
});
export const clientsPost = api(async request => {
  const b = await jsonBody(request, clientSchema);
  if (!b.wa_phone_number_id) b.wa_phone_number_id = null;
  return NextResponse.json(maskClient(checked(await db().from('clients').insert(b).select().single())), { status: 201 });
});
export const clientsPut = api(async (request, { params }) => {
  await row('clients', params.id);
  const b = await jsonBody(request, clientSchema.partial());
  if ('wa_access_token' in b && b.wa_access_token?.includes('•')) delete b.wa_access_token;
  if ('wa_phone_number_id' in b && !b.wa_phone_number_id) b.wa_phone_number_id = null;
  return NextResponse.json(maskClient(checked(await db().from('clients').update(b).eq('id', params.id).select().single())));
});
export const contactsGet = api(async request => {
  const { q, start, end } = paging(request);
  let query = db().from('contacts').select('*').order('created_at', { ascending: false }).order('id').range(start, end);
  for (const k of ['client_id','status','category']) if (q.get(k)) query = query.eq(k, k === 'client_id' ? validId(q.get(k)) : q.get(k).slice(0,100));
  const search = q.get('q');
  if (search) {
    if (search.length > 100 || !/^[\p{L}\p{N}\s+.'’-]+$/u.test(search)) throw new HttpError(400, 'Recherche invalide.');
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }
  return NextResponse.json(checked(await query));
});
export const contactsPost = api(async request => {
  const b = await jsonBody(request, contactSchema);
  b.phone = normalizePhone(b.phone);
  if (!b.phone || b.consent !== true || b.status === 'stop') throw new HttpError(400, 'Téléphone et consentement explicite obligatoires.');
  b.consent_date = new Date().toISOString();
  return NextResponse.json(checked(await db().from('contacts').insert(b).select().single()), { status: 201 });
});
export const contactsPut = api(async (request, { params }) => {
  const current = await row('contacts', params.id);
  const b = await jsonBody(request, contactPatch);
  if (b.phone) { b.phone = normalizePhone(b.phone); if (!b.phone) throw new HttpError(400, 'Téléphone invalide.'); }
  if (b.status === 'stop') b.consent = false;
  if (b.consent === true && (!current.consent || current.status === 'stop')) {
    if (!b.consent_source || b.status === 'stop' || (!b.status && current.status === 'stop')) throw new HttpError(400, 'Un nouveau consentement exige sa source et un statut actif.');
    b.consent_date = new Date().toISOString();
  }
  return NextResponse.json(checked(await db().from('contacts').update(b).eq('id', params.id).select().single()));
});
export function deleteResource(table) { return api(async (_request, { params }) => {
  await row(table, params.id);
  if (table === 'clients' || table === 'campaigns') {
    const pending = checked(await db().from('messages').select('id').eq(table === 'clients' ? 'client_id' : 'campaign_id', params.id).in('status',['sending','unknown']).limit(1));
    if (pending.length) throw new HttpError(409, 'Vérifiez les livraisons en cours ou incertaines avant suppression.');
  }
  checked(await db().from(table).delete().eq('id', params.id));
  return NextResponse.json({ ok: true });
}); }
export const campaignsGet = api(async request => {
  const { q, start, end } = paging(request);
  let query = db().from('campaigns').select('*, clients(name, sector)').order('created_at',{ascending:false}).order('id').range(start,end);
  if (q.get('client_id')) query = query.eq('client_id',validId(q.get('client_id')));
  const campaigns = checked(await query);
  const stats = campaigns.length ? checked(await db().from('campaign_stats').select('*').in('campaign_id',campaigns.map(c=>c.id))) : [];
  return NextResponse.json(campaigns.map(c=>({...c,stats:stats.find(s=>s.campaign_id===c.id)||null})));
});
export const campaignsPost = api(async request => {
  const b = ensureCampaign(await jsonBody(request,campaignSchema));
  return NextResponse.json(checked(await db().from('campaigns').insert(b).select().single()),{status:201});
});
export const campaignsPut = api(async (request,{params}) => {
  const current = await row('campaigns',params.id);
  const b = await jsonBody(request,campaignPatch);
  if (current.main_prepared_at || current.main_sent_at) {
    if (Object.keys(b).length !== 1 || b.status !== 'annule') throw new HttpError(409,'La campagne est déjà engagée. Seule son annulation est autorisée.');
  } else b.reminder_at = ensureCampaign({...current,...b}).reminder_at;
  return NextResponse.json(checked(await db().from('campaigns').update(b).eq('id',params.id).select().single()));
});
export const campaignGet = api(async (request,{params}) => {
  validId(params.id);
  const campaign = checked(await db().from('campaigns').select('*, clients(name,sector,city,demo_mode)').eq('id',params.id).maybeSingle());
  if (!campaign) throw new HttpError(404,'Campagne introuvable.');
  const { start,end } = paging(request);
  const [messages,reservations,stats] = await Promise.all([
    db().from('messages').select('*, contacts(first_name,last_name,phone)').eq('campaign_id',params.id).order('created_at',{ascending:false}).order('id').range(start,end),
    db().from('reservations').select('*, contacts(first_name,last_name,phone)').eq('campaign_id',params.id).order('created_at',{ascending:false}).order('id').range(start,end),
    db().from('campaign_stats').select('*').eq('campaign_id',params.id).maybeSingle(),
  ]);
  const withSuggestion = checked(messages).map(m => m.direction === 'in'
    ? { ...m, suggestion: suggestedReply(m.intent, campaign.clients, campaign) }
    : m);
  return NextResponse.json({campaign,messages:withSuggestion,reservations:checked(reservations),stats:checked(stats)});
});

// --- Traitement opérateur des réservations et des réponses (audit R17) ---
export const reservationPatch = api(async (request, { params }) => {
  await row('reservations', params.id);
  const { status } = await jsonBody(request, reservationSchema);
  return NextResponse.json(checked(await db().from('reservations').update({ status }).eq('id', params.id).select().single()));
});
export const messageHandledPatch = api(async (request, { params }) => {
  const message = await row('messages', params.id);
  if (message.direction !== 'in') throw new HttpError(400, 'Seules les réponses entrantes se marquent comme traitées.');
  const { handled } = await jsonBody(request, handledSchema);
  return NextResponse.json(checked(await db().from('messages').update({ handled }).eq('id', params.id).select().single()));
});
export const messageReplyPost = api(async (request, { params }) => {
  const inbound = await row('messages', params.id);
  if (inbound.direction !== 'in') throw new HttpError(400, 'On ne peut répondre qu’à un message entrant.');
  if (!inbound.contact_id) throw new HttpError(409, 'Aucun contact associé à cette réponse.');
  const { text } = await jsonBody(request, replySchema);
  const contact = checked(await db().from('contacts').select('id, phone').eq('id', inbound.contact_id).maybeSingle());
  if (!contact) throw new HttpError(409, 'Contact introuvable pour cette réponse.');
  const client = checked(await db().from('clients').select('*').eq('id', inbound.client_id).single());

  const result = await sendText(client, contact.phone, text);
  if (!result.ok) throw new HttpError(502, result.error || 'Envoi de la réponse impossible.');

  const outbound = checked(await db().from('messages').insert({
    client_id: inbound.client_id, campaign_id: inbound.campaign_id, contact_id: inbound.contact_id,
    direction: 'out', kind: 'manual', body: text,
    wa_message_id: result.waMessageId || null,
    status: result.simulated ? 'simulated' : 'sent',
    simulated: Boolean(result.simulated),
  }).select().single());
  checked(await db().from('messages').update({ handled: true }).eq('id', inbound.id));
  checked(await db().from('contacts').update({ last_message_at: new Date().toISOString() }).eq('id', contact.id));

  return NextResponse.json({ ok: true, simulated: Boolean(result.simulated), message: outbound });
});
