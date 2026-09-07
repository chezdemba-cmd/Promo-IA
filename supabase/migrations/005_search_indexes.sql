-- Recherche de contacts : les filtres `ilike %terme%` (nom, prénom, téléphone)
-- ne peuvent pas utiliser un index B-tree. Trigrammes GIN pour tenir la charge
-- quand un client dépasse quelques milliers de contacts (audit R15 / perf).
begin;
create extension if not exists pg_trgm;
create index if not exists contacts_first_name_trgm on public.contacts using gin (first_name gin_trgm_ops);
create index if not exists contacts_last_name_trgm  on public.contacts using gin (last_name  gin_trgm_ops);
create index if not exists contacts_phone_trgm      on public.contacts using gin (phone      gin_trgm_ops);
-- Liste par client triée par date (chemin le plus fréquent de /api/contacts).
create index if not exists contacts_client_created on public.contacts (client_id, created_at desc);
commit;
