begin;
create table if not exists public.admin_sessions(id_hash text primary key, expires_at timestamptz not null, created_at timestamptz not null default now());
create index if not exists admin_sessions_expiry on public.admin_sessions(expires_at);
create table if not exists public.rate_limits(key text primary key, window_at timestamptz not null, hits integer not null);
alter table public.admin_sessions enable row level security;
alter table public.rate_limits enable row level security;
revoke all on public.admin_sessions, public.rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.admin_sessions, public.rate_limits to service_role;
create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_seconds integer)
returns boolean language plpgsql set search_path = '' as $$
declare count_now integer;
begin
  if p_limit < 1 or p_seconds < 1 or length(p_key) > 200 then raise exception 'invalid limit'; end if;
  insert into public.rate_limits as r(key, window_at, hits) values(p_key, now(), 1)
  on conflict(key) do update set
    hits = case when r.window_at <= now() - make_interval(secs => p_seconds) then 1 else least(r.hits + 1, p_limit + 1) end,
    window_at = case when r.window_at <= now() - make_interval(secs => p_seconds) then now() else r.window_at end
  returning hits into count_now;
  return count_now <= p_limit;
end $$;
revoke all on function public.consume_rate_limit(text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;
commit;
