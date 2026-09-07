import { z } from 'zod';

export const uuid = z.string().uuid();
const short = z.string().trim().max(200);
const optionalText = (max = 200) => z.string().trim().max(max).nullable().optional();
const date = z.iso.datetime({ offset: true }).nullable().optional();
const url = z.union([z.literal(''), z.url().refine(s => new URL(s).protocol === 'https:', 'URL HTTPS requise')]).nullable().optional();
export const loginSchema = z.object({ password: z.string().min(1).max(256) });
export const clientSchema = z.object({
  name: short.min(1), sector: z.enum(['restaurant','bar','commerce','beaute','evenementiel','association','pme']).default('restaurant'),
  city: optionalText(), logo_url: url, whatsapp_phone: optionalText(), email: optionalText(),
  status: z.enum(['actif','pause','test']).default('test'), tone: z.enum(['professionnel','chaleureux','jeune','premium','communautaire']).default('chaleureux'),
  allowed_categories: z.array(short).max(30).default([]), demo_mode: z.boolean().default(true),
  wa_phone_number_id: z.string().regex(/^\d{5,30}$/).or(z.literal('')).nullable().optional(),
  wa_business_account_id: optionalText(), wa_access_token: optionalText(4096),
  wa_template_name: z.string().regex(/^[a-z0-9_]{1,100}$/).default('djelis_generique'),
  wa_image_template_name: z.string().regex(/^[a-z0-9_]{1,100}$/).nullable().optional(),
});
export const contactSchema = z.object({
  client_id: uuid, first_name: optionalText(), last_name: optionalText(), phone: z.string().min(1).max(40),
  email: optionalText(), city: optionalText(), category: short.default('clients_habitues'),
  consent: z.boolean(), consent_source: z.string().trim().min(3).max(300), consent_date: date,
  status: z.enum(['actif','stop','erreur','bloque','vip','prospect','fidele']).default('actif'), notes: optionalText(2000),
});
export const contactPatch = contactSchema.omit({ client_id: true }).partial();
export const campaignSchema = z.object({
  client_id: uuid, name: short.min(1),
  type: z.enum(['evenement','promotion','rappel_rdv','menu','lancement_produit','invitation','information']).default('evenement'),
  event_at: date, send_at: date, reminder_hours: z.number().int().min(1).max(720).nullable().optional(),
  image_url: url, offer: optionalText(2000), location: optionalText(500), target_categories: z.array(short).max(30).default([]),
  message_main: optionalText(1500), message_reminder: optionalText(1500),
  status: z.enum(['brouillon','programme','annule']).default('brouillon'),
});
export const campaignPatch = campaignSchema.omit({ client_id: true }).partial();
export const sendSchema = z.object({ kind: z.enum(['main','reminder']).default('main') });
export const importSchema = z.object({ client_id: uuid, csv: z.string().min(1).max(1_000_000) });
export const generateSchema = z.object({
  client_id: uuid, campaignName: short.min(1), type: short.optional(), event_at: date,
  offer: optionalText(2000), location: optionalText(500), reminder_hours: z.number().int().min(1).max(720).optional(),
});
export const reservationSchema = z.object({ status: z.enum(['confirmee','annulee','a_traiter']) });
export const handledSchema = z.object({ handled: z.boolean() });
export const replySchema = z.object({ text: z.string().trim().min(1).max(4096) });
