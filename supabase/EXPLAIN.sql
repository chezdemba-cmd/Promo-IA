-- ============================================================
-- Vérification des plans d'exécution (audit R15 / perf)
-- À exécuter dans Supabase SQL Editor SUR UNE COPIE contenant des volumes
-- représentatifs (voir le bloc "jeu de données" ci-dessous), jamais en prod.
--
-- Règle de lecture : sur `contacts` / `messages` au-delà de ~10 000 lignes,
-- un `Seq Scan` dans ces plans = index manquant ou requête à revoir.
-- On attend : Index Scan / Bitmap Index Scan sur les index créés par les
-- migrations 003 et 005.
-- ============================================================

-- ---------- Jeu de données synthétique (à adapter) ----------
-- 1 client, 50 000 contacts, 20 000 messages sortants, 5 000 entrants.
do $$
declare cid uuid;
begin
  insert into public.clients(name) values ('Charge test') returning id into cid;
  insert into public.contacts(client_id, phone, first_name, last_name, consent, status, category, created_at)
  select cid,
         '+336' || lpad((1000000 + g)::text, 8, '0'),
         'Prenom' || g, 'Nom' || (g % 900),
         true, 'actif',
         (array['clients_habitues','vip','prospects','sport','beaute'])[1 + g % 5],
         now() - (g || ' minutes')::interval
  from generate_series(1, 50000) g;

  insert into public.campaigns(client_id, name, status, send_at, message_main)
  values (cid, 'Camp charge', 'envoye', now() - interval '1 day', 'Bonjour {{prenom}} STOP');

  insert into public.messages(client_id, campaign_id, contact_id, direction, kind, body, wa_message_id, status, created_at)
  select cid, (select id from public.campaigns where client_id = cid limit 1), c.id,
         'out', 'main', 'x STOP', 'wamid.out.' || c.id,
         (array['sent','delivered','read','failed','queued'])[1 + (row_number() over ()) % 5],
         now() - interval '1 day'
  from public.contacts c where c.client_id = cid limit 20000;

  insert into public.messages(client_id, contact_id, direction, kind, body, wa_message_id, status, intent, handled, created_at)
  select cid, c.id, 'in', 'reply', 'question ' || c.id, 'wamid.in.' || c.id,
         'received', 'QUESTION_PRIX', (row_number() over ()) % 3 = 0,
         now() - ((row_number() over ()) || ' minutes')::interval
  from public.contacts c where c.client_id = cid limit 5000;
end $$;

analyze public.contacts;
analyze public.messages;
analyze public.campaigns;
analyze public.reservations;

-- Récupérer l'id du client de test pour les requêtes ci-dessous :
--   select id from public.clients where name = 'Charge test';
-- puis remplacer :CID par cet uuid (entre quotes) dans chaque EXPLAIN.

-- ---------- 1. Liste des contacts d'un client (chemin le plus fréquent) ----------
explain (analyze, buffers)
select * from public.contacts
where client_id = ':CID'
order by created_at desc, id
limit 50;
-- Attendu : Index Scan Backward using contacts_client_created.

-- ---------- 2. Recherche texte contacts (ilike %terme%) ----------
explain (analyze, buffers)
select * from public.contacts
where client_id = ':CID'
  and (first_name ilike '%nom12%' or last_name ilike '%nom12%' or phone ilike '%1234%')
order by created_at desc, id
limit 50;
-- Attendu : Bitmap Index Scan sur contacts_first_name_trgm / _last_name_trgm / _phone_trgm.
-- Si Seq Scan : vérifier `create extension pg_trgm` (migration 005).

-- ---------- 3. Filtre statut + catégorie ----------
explain (analyze, buffers)
select * from public.contacts
where client_id = ':CID' and status = 'actif' and category = 'vip'
order by created_at desc, id
limit 50;

-- ---------- 4. Vue statistiques d'une campagne ----------
explain (analyze, buffers)
select * from public.campaign_stats where client_id = ':CID';
-- Attendu : agrégat sur messages via idx_messages_campaign. Surveiller le coût du GROUP BY.

-- ---------- 5. Compteurs du dashboard (/api/stats) ----------
explain (analyze, buffers)
select count(*) from public.messages
where direction = 'out' and status in ('sent','delivered','read','simulated');
-- Sur gros volume, envisager un index partiel where direction = 'out'.

-- ---------- 6. File d'envoi : prochain message à traiter ----------
explain (analyze, buffers)
select * from public.messages
where campaign_id = (select id from public.campaigns where client_id = ':CID' limit 1)
  and kind = 'main' and direction = 'out' and status = 'queued'
order by created_at, id
limit 1;
-- Attendu : Index Scan using message_queue (index partiel where direction='out').

-- ---------- 7. Réponses entrantes non traitées (dashboard) ----------
explain (analyze, buffers)
select * from public.messages
where direction = 'in' and not handled
order by created_at desc
limit 10;
-- Attendu : Index Scan using message_inbox (index partiel where direction='in' and not handled).

-- ---------- 8. Corrélation d'un statut Meta / idempotence webhook ----------
explain (analyze, buffers)
select * from public.messages
where client_id = ':CID' and wa_message_id = 'wamid.out.00000000-0000-0000-0000-000000000000';
-- Attendu : Index Scan using unique_meta_event.

-- ---------- 9. next_campaign_work() ----------
explain (analyze, buffers)
select * from public.next_campaign_work();

-- ---------- 10. Détail campagne : messages + contacts joints ----------
explain (analyze, buffers)
select m.*, c.first_name, c.last_name, c.phone
from public.messages m
join public.contacts c on c.id = m.contact_id
where m.campaign_id = (select id from public.campaigns where client_id = ':CID' limit 1)
order by m.created_at desc, m.id
limit 50;

-- ---------- Nettoyage ----------
-- delete from public.clients where name = 'Charge test';   -- cascade sur contacts/campaigns/messages
