/**
 * POST /api/campaigns/[id]/simulate-replies — MODE DÉMO uniquement.
 * Génère des réponses réalistes sur ~40 % des messages simulés puis les fait
 * passer dans le VRAI pipeline de classification (même code que le webhook).
 */
import { NextResponse } from 'next/server';
import { api, checked, HttpError, rateLimit } from '@/lib/api';
import { db } from '@/lib/supabase';
import { validId } from '@/lib/resources';
import { processIncomingMessage } from '@/lib/inbound';

const SAMPLES = [
  { text: 'Oui je viens !', w: 4 },
  { text: 'Réserve pour 2 svp', w: 2 },
  { text: 'On sera 4, tu peux nous garder une table ?', w: 2 },
  { text: "C'est combien l'entrée ?", w: 2 },
  { text: "C'est où exactement ?", w: 2 },
  { text: 'Ça commence à quelle heure ?', w: 1 },
  { text: 'Non merci pas dispo ce week-end', w: 2 },
  { text: 'STOP', w: 1 },
  { text: 'Super merci pour l’info 👍', w: 2 },
];

function pick() {
  const total = SAMPLES.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const s of SAMPLES) { r -= s.w; if (r <= 0) return s.text; }
  return SAMPLES[0].text;
}

export const maxDuration = 60;

export const POST = api(async (_request, { params }) => {
  const id = validId(params.id);
  await rateLimit('simulate-replies', 20, 3600);

  const supa = db();
  const campaign = checked(await supa.from('campaigns').select('*, clients(*)').eq('id', id).maybeSingle());
  if (!campaign) throw new HttpError(404, 'Campagne introuvable.');
  if (!campaign.clients?.demo_mode && process.env.DEMO_MODE === 'false') {
    throw new HttpError(400, 'Simulation autorisée uniquement en mode démo.');
  }

  const sent = checked(await supa.from('messages').select('contact_id').eq('campaign_id', id).eq('direction', 'out'));
  const replied = checked(await supa.from('messages').select('contact_id').eq('campaign_id', id).eq('direction', 'in'));
  const already = new Set(replied.map(m => m.contact_id));
  const candidates = [...new Set(sent.map(m => m.contact_id))].filter(cid => cid && !already.has(cid));

  let created = 0;
  for (const contactId of candidates) {
    if (Math.random() > 0.4) continue;
    const contact = checked(await supa.from('contacts').select('*').eq('id', contactId).maybeSingle());
    if (!contact) continue;
    await processIncomingMessage({
      client: campaign.clients, contact, text: pick(), campaignId: campaign.id, simulated: true,
    });
    created++;
  }
  return NextResponse.json({ replies: created });
});
