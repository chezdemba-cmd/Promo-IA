begin;
create table if not exists public.webhook_inbox (
  id text primary key, client_id uuid not null references public.clients(id) on delete cascade,
  payload jsonb not null, state text not null default 'queued', attempts integer not null default 0,
  available_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create index if not exists webhook_pending on public.webhook_inbox(state,available_at);
alter table public.webhook_inbox enable row level security;
revoke all on public.webhook_inbox from public,anon,authenticated;
grant select,insert,update,delete on public.webhook_inbox to service_role;
create or replace function public.claim_webhook_event() returns jsonb language plpgsql set search_path='' as $$
declare e public.webhook_inbox;
begin
  select * into e from public.webhook_inbox where state in ('queued','processing') and available_at <= now() and attempts < 10
    order by created_at limit 1 for update skip locked;
  if not found then return null; end if;
  update public.webhook_inbox set state='processing',attempts=attempts+1,available_at=now()+interval '2 minutes' where id=e.id;
  return to_jsonb(e);
end $$;
create or replace function public.next_campaign_work() returns jsonb language sql set search_path='' as $$
  select jsonb_build_object('id',c.id,'kind',k.kind)
  from public.campaigns c cross join (values('main'),('reminder')) as k(kind)
  join public.clients cl on cl.id=c.client_id
  where c.status in ('programme','envoye') and cl.status <> 'pause' and (c.event_at is null or c.event_at>now())
  and (
    (k.kind='main' and c.main_prepared_at is null and c.main_sent_at is null and c.send_at<=now())
    or (k.kind='reminder' and c.reminder_prepared_at is null and c.reminder_sent_at is null and c.main_sent_at is not null and c.reminder_at<=now() and c.event_at>now())
    or exists(select 1 from public.messages m where m.campaign_id=c.id and m.kind=k.kind and m.status in ('queued','sending'))
  ) order by coalesce(c.send_at,c.created_at),c.id limit 1
$$;
revoke all on function public.claim_webhook_event(), public.next_campaign_work() from public,anon,authenticated;
grant execute on function public.claim_webhook_event(), public.next_campaign_work() to service_role;
commit;
