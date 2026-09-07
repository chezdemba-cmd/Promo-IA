-- ============================================================
-- DJELI'S PROMO AI — Schéma Supabase PostgreSQL
-- À exécuter dans : Supabase > SQL Editor > New query
-- ============================================================

-- Extension pour les UUID (déjà active sur Supabase en général)
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. CLIENTS (les entreprises gérées par l'agence)
-- ------------------------------------------------------------
create table if not exists clients (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,                      -- ex : Chez Demba
  sector                  text not null default 'restaurant', -- restaurant|bar|commerce|beaute|evenementiel|association|pme
  city                    text,
  logo_url                text,
  whatsapp_phone          text,                               -- numéro affiché, format international
  email                   text,
  status                  text not null default 'test',       -- actif | pause | test
  tone                    text not null default 'chaleureux', -- professionnel|chaleureux|jeune|premium|communautaire
  allowed_categories      text[] not null default '{}',       -- catégories de campagnes autorisées
  -- Credentials WhatsApp Cloud API (Option B : un numéro par client)
  wa_phone_number_id      text,
  wa_business_account_id  text,
  wa_access_token         text,                               -- jamais renvoyé au navigateur
  demo_mode               boolean not null default true,      -- true = envois simulés
  created_at              timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. CONTACTS (cloisonnés par client)
-- ------------------------------------------------------------
create table if not exists contacts (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  first_name      text,
  last_name       text,
  phone           text not null,                    -- format E.164 : +33612345678
  email           text,
  category        text default 'clients_habitues',  -- vip|clients_habitues|prospects|restauration|evenementiel|sport|beaute|commerce|association|partenaires|etudiants|famille|entreprises
  city            text,
  consent         boolean not null default false,   -- consentement marketing
  consent_source  text,                             -- ex : "formulaire boutique", "inscription soirée"
  consent_date    timestamptz,
  status          text not null default 'actif',    -- actif|stop|erreur|bloque|vip|prospect|fidele
  last_message_at timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  unique (client_id, phone)                         -- pas de doublon par client
);
create index if not exists idx_contacts_client on contacts(client_id);
create index if not exists idx_contacts_phone  on contacts(phone);

-- ------------------------------------------------------------
-- 3. CAMPAGNES
-- ------------------------------------------------------------
create table if not exists campaigns (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references clients(id) on delete cascade,
  name              text not null,
  type              text not null default 'evenement', -- evenement|promotion|rappel_rdv|menu|lancement_produit|invitation|information
  event_at          timestamptz,                       -- date/heure de l'événement ou de l'offre
  send_at           timestamptz,                       -- date/heure d'envoi initial
  reminder_hours    integer,                           -- 12, 24, 48 ou personnalisé ; null = pas de rappel
  reminder_at       timestamptz,                       -- calculé : event_at - reminder_hours
  image_url         text,                              -- visuel/affiche (Supabase Storage)
  offer             text,                              -- offre spéciale / info
  location          text,                              -- lieu
  target_categories text[] not null default '{}',      -- catégories de contacts ciblées
  message_main      text,                              -- message principal (généré IA, éditable)
  message_reminder  text,                              -- message de rappel (généré IA, éditable)
  status            text not null default 'brouillon', -- brouillon|programme|envoye|termine|annule
  main_sent_at      timestamptz,                       -- garde-fou anti double envoi
  reminder_sent_at  timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists idx_campaigns_client on campaigns(client_id);
create index if not exists idx_campaigns_due    on campaigns(status, send_at, reminder_at);

-- ------------------------------------------------------------
-- 4. MESSAGES (sortants ET entrants — journal complet)
-- ------------------------------------------------------------
create table if not exists messages (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id) on delete cascade,
  campaign_id   uuid references campaigns(id) on delete set null,
  contact_id    uuid references contacts(id) on delete set null,
  direction     text not null,                  -- out | in
  kind          text not null default 'main',   -- out: main|reminder|manual — in: reply
  body          text,
  wa_message_id text,                           -- id Meta (corrélation des statuts)
  status        text not null default 'queued', -- out: queued|simulated|sent|delivered|read|failed — in: received
  error         text,                           -- détail erreur Meta si failed
  intent        text,                           -- in: INTERESSE|RESERVATION|QUESTION_PRIX|QUESTION_LIEU|QUESTION_HEURE|STOP|REFUS|AUTRE
  handled       boolean not null default false, -- in: traité manuellement ?
  created_at    timestamptz not null default now()
);
create index if not exists idx_messages_campaign on messages(campaign_id);
create index if not exists idx_messages_contact  on messages(contact_id);
create index if not exists idx_messages_wa_id    on messages(wa_message_id);

-- ------------------------------------------------------------
-- 5. RÉSERVATIONS (créées automatiquement par la classification IA)
-- ------------------------------------------------------------
create table if not exists reservations (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  contact_id  uuid references contacts(id) on delete set null,
  message_id  uuid references messages(id) on delete set null,
  details     text,                              -- texte original ("on sera 4")
  status      text not null default 'a_traiter', -- a_traiter|confirmee|annulee
  created_at  timestamptz not null default now()
);
create index if not exists idx_reservations_client on reservations(client_id);

-- ------------------------------------------------------------
-- 6. DÉSINSCRIPTIONS (traçabilité RGPD des STOP)
-- ------------------------------------------------------------
create table if not exists optouts (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references clients(id) on delete cascade,
  contact_id       uuid references contacts(id) on delete set null,
  campaign_id      uuid references campaigns(id) on delete set null,
  original_message text,                         -- message STOP original
  created_at       timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 7. PARAMÈTRES AGENCE (clé/valeur simple)
-- ------------------------------------------------------------
create table if not exists settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 8. VUE STATISTIQUES PAR CAMPAGNE
-- ------------------------------------------------------------
create or replace view campaign_stats as
select
  c.id as campaign_id,
  c.client_id,
  c.name,
  c.status,
  count(*) filter (where m.direction = 'out')                                          as programmed,
  count(*) filter (where m.direction = 'out' and m.status in ('sent','delivered','read','simulated')) as sent,
  count(*) filter (where m.direction = 'out' and m.status = 'failed')                  as failed,
  count(*) filter (where m.direction = 'in')                                           as replies,
  count(*) filter (where m.direction = 'in' and m.intent = 'INTERESSE')                as interested,
  count(*) filter (where m.direction = 'in' and m.intent = 'RESERVATION')              as bookings,
  count(*) filter (where m.direction = 'in' and m.intent = 'STOP')                     as stops
from campaigns c
left join messages m on m.campaign_id = c.id
group by c.id;

-- ------------------------------------------------------------
-- 9. STORAGE : bucket pour les visuels de campagne
--    (à créer aussi via l'interface : Storage > New bucket > "visuels", public)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('visuels', 'visuels', true)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Bootstrap: apply supabase/migrations/*.sql in numeric order next.
-- Business data is private, including the statistics view.
-- ------------------------------------------------------------

do $$
declare relation text;
begin
  foreach relation in array array['clients','contacts','campaigns','messages','reservations','optouts','settings'] loop
    execute format('alter table public.%I enable row level security', relation);
    execute format('revoke all on table public.%I from public, anon, authenticated', relation);
    execute format('grant select, insert, update, delete on table public.%I to service_role', relation);
  end loop;
end $$;
alter view public.campaign_stats set (security_invoker = true);
revoke all on public.campaign_stats from public, anon, authenticated;
grant select on public.campaign_stats to service_role;
