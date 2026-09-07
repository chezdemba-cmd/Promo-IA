-- P0: agency API only. No direct browser access to business data.
begin;
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
commit;
