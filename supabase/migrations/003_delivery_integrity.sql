begin;
alter table public.clients add column if not exists wa_template_name text not null default 'djelis_generique';
alter table public.clients add column if not exists wa_image_template_name text;
alter table public.campaigns add column if not exists main_prepared_at timestamptz;
alter table public.campaigns add column if not exists reminder_prepared_at timestamptz;
alter table public.messages add column if not exists simulated boolean not null default false;
alter table public.messages add column if not exists dispatch_started_at timestamptz;
alter table public.messages add column if not exists dispatch_token uuid;
create unique index if not exists unique_wa_client on public.clients(wa_phone_number_id) where wa_phone_number_id is not null and wa_phone_number_id <> '';
create unique index if not exists unique_meta_event on public.messages(client_id, wa_message_id) where wa_message_id is not null;
create unique index if not exists unique_campaign_delivery on public.messages(campaign_id,contact_id,kind) where direction='out' and kind in ('main','reminder') and contact_id is not null;
create unique index if not exists contacts_tenant_key on public.contacts(id,client_id);
create unique index if not exists campaigns_tenant_key on public.campaigns(id,client_id);
create unique index if not exists messages_tenant_key on public.messages(id,client_id);
create index if not exists message_queue on public.messages(campaign_id,kind,status,created_at) where direction='out';
create index if not exists message_inbox on public.messages(created_at desc) where direction='in' and not handled;
create index if not exists message_contact_latest on public.messages(contact_id,created_at desc);
create index if not exists reservation_campaign on public.reservations(campaign_id);
do $$
begin
if not exists(select 1 from pg_constraint where conname='contact_phone_check' and conrelid='public.contacts'::regclass) then alter table public.contacts add constraint contact_phone_check check(phone ~ '^\+[1-9][0-9]{7,14}$') not valid; end if;
if not exists(select 1 from pg_constraint where conname='contact_status_check' and conrelid='public.contacts'::regclass) then alter table public.contacts add constraint contact_status_check check(status in ('actif','stop','erreur','bloque','vip','prospect','fidele')) not valid; end if;
if not exists(select 1 from pg_constraint where conname='contact_stop_check' and conrelid='public.contacts'::regclass) then alter table public.contacts add constraint contact_stop_check check(status <> 'stop' or consent=false) not valid; end if;
if not exists(select 1 from pg_constraint where conname='reminder_hours_check' and conrelid='public.campaigns'::regclass) then alter table public.campaigns add constraint reminder_hours_check check(reminder_hours is null or reminder_hours between 1 and 720) not valid; end if;
if not exists(select 1 from pg_constraint where conname='messages_contact_tenant' and conrelid='public.messages'::regclass) then alter table public.messages add constraint messages_contact_tenant foreign key(contact_id,client_id) references public.contacts(id,client_id) on delete set null (contact_id) not valid; end if;
if not exists(select 1 from pg_constraint where conname='messages_campaign_tenant' and conrelid='public.messages'::regclass) then alter table public.messages add constraint messages_campaign_tenant foreign key(campaign_id,client_id) references public.campaigns(id,client_id) on delete set null (campaign_id) not valid; end if;
if not exists(select 1 from pg_constraint where conname='reservations_contact_tenant' and conrelid='public.reservations'::regclass) then alter table public.reservations add constraint reservations_contact_tenant foreign key(contact_id,client_id) references public.contacts(id,client_id) on delete set null (contact_id) not valid; end if;
if not exists(select 1 from pg_constraint where conname='reservations_campaign_tenant' and conrelid='public.reservations'::regclass) then alter table public.reservations add constraint reservations_campaign_tenant foreign key(campaign_id,client_id) references public.campaigns(id,client_id) on delete set null (campaign_id) not valid; end if;
if not exists(select 1 from pg_constraint where conname='reservations_message_tenant' and conrelid='public.reservations'::regclass) then alter table public.reservations add constraint reservations_message_tenant foreign key(message_id,client_id) references public.messages(id,client_id) on delete set null (message_id) not valid; end if;
if not exists(select 1 from pg_constraint where conname='optouts_contact_tenant' and conrelid='public.optouts'::regclass) then alter table public.optouts add constraint optouts_contact_tenant foreign key(contact_id,client_id) references public.contacts(id,client_id) on delete set null (contact_id) not valid; end if;
if not exists(select 1 from pg_constraint where conname='optouts_campaign_tenant' and conrelid='public.optouts'::regclass) then alter table public.optouts add constraint optouts_campaign_tenant foreign key(campaign_id,client_id) references public.campaigns(id,client_id) on delete set null (campaign_id) not valid; end if;
end $$;

create or replace function public.anonymize_contact_history() returns trigger language plpgsql set search_path='' as $$
begin
  update public.messages set body=null,error=null,handled=true,
    status=case when direction='out' and status='queued' then 'skipped' else status end where contact_id=old.id;
  update public.reservations set details=null where contact_id=old.id;
  update public.optouts set original_message=null where contact_id=old.id;
  return old;
end $$;
drop trigger if exists anonymize_contact_history on public.contacts;
create trigger anonymize_contact_history before delete on public.contacts for each row execute function public.anonymize_contact_history();

create or replace function public.prepare_campaign(p_campaign uuid,p_kind text,p_demo boolean)
returns integer language plpgsql set search_path='' as $$
declare c public.campaigns; cl public.clients; total integer; added integer; prepared timestamptz; sent_at timestamptz;
begin
  if p_kind not in ('main','reminder') then raise exception 'invalid kind'; end if;
  select * into strict c from public.campaigns where id=p_campaign for update;
  select * into strict cl from public.clients where id=c.client_id;
  if c.status in ('annule','termine') or cl.status='pause' then raise exception 'inactive campaign'; end if;
  if c.event_at is not null and c.event_at <= now() then raise exception 'event passed'; end if;
  prepared := case when p_kind='main' then c.main_prepared_at else c.reminder_prepared_at end;
  sent_at := case when p_kind='main' then c.main_sent_at else c.reminder_sent_at end;
  if sent_at is not null or prepared is not null then return 0; end if;
  if p_kind='reminder' and (c.main_sent_at is null or c.event_at is null) then raise exception 'main not complete'; end if;
  if coalesce(case when p_kind='main' then c.message_main else c.message_reminder end,'') !~* '\mSTOP\M' then raise exception 'STOP required'; end if;
  select count(*) into total from public.contacts where client_id=c.client_id and consent and status not in ('stop','bloque','erreur')
    and (cardinality(c.target_categories)=0 or category=any(c.target_categories));
  if total > 5000 then raise exception 'campaign limit exceeded'; end if;
  insert into public.messages(client_id,campaign_id,contact_id,direction,kind,body,status,simulated)
  select c.client_id,c.id,t.id,'out',p_kind,
    replace(replace(case when p_kind='main' then c.message_main else c.message_reminder end,'{{prenom}}',coalesce(nullif(t.first_name,''),'cher client')),'{{nom}}',coalesce(t.last_name,'')),
    'queued',p_demo
  from public.contacts t where t.client_id=c.client_id and t.consent and t.status not in ('stop','bloque','erreur')
    and (cardinality(c.target_categories)=0 or t.category=any(c.target_categories))
  on conflict do nothing;
  get diagnostics added=row_count;
  if p_kind='main' then update public.campaigns set main_prepared_at=now() where id=c.id;
  else update public.campaigns set reminder_prepared_at=now() where id=c.id; end if;
  return added;
end $$;

create or replace function public.claim_campaign_message(p_campaign uuid,p_kind text)
returns jsonb language plpgsql set search_path='' as $$
declare m public.messages; c public.campaigns; t public.contacts; cl public.clients;
begin
  select * into c from public.campaigns where id=p_campaign;
  if not found then raise exception 'campaign missing'; end if;
  select * into cl from public.clients where id=c.client_id;
  if c.status in ('annule','termine') or cl.status='pause' or (c.event_at is not null and c.event_at<=now()) then
    update public.messages set status='skipped' where campaign_id=p_campaign and kind=p_kind and status='queued'; return null;
  end if;
  loop
    select * into m from public.messages where campaign_id=p_campaign and kind=p_kind and direction='out' and status='queued'
      order by created_at,id limit 1 for update skip locked;
    if not found then return null; end if;
    select * into t from public.contacts where id=m.contact_id and client_id=m.client_id for update;
    if not found or not t.consent or t.status in ('stop','bloque','erreur') then
      update public.messages set status='skipped' where id=m.id; continue;
    end if;
    update public.messages set status='sending',dispatch_started_at=now(),dispatch_token=gen_random_uuid() where id=m.id returning * into m;
    return jsonb_build_object('message',to_jsonb(m),'contact',to_jsonb(t),'client',to_jsonb(cl),'campaign',to_jsonb(c));
  end loop;
end $$;

create or replace function public.finish_campaign_message(p_message uuid,p_token uuid,p_status text,p_wa_id text,p_error text)
returns void language plpgsql set search_path='' as $$
declare m public.messages;
begin
  if p_status not in ('sent','simulated','failed','unknown','skipped') then raise exception 'invalid result'; end if;
  select * into strict m from public.messages where id=p_message for update;
  if m.status not in ('sending','unknown') or m.dispatch_token is distinct from p_token then raise exception 'invalid claim'; end if;
  update public.messages set status=p_status,wa_message_id=p_wa_id,error=left(p_error,500) where id=p_message;
  if p_status in ('sent','simulated') then update public.contacts set last_message_at=now() where id=m.contact_id; end if;
end $$;

create or replace function public.complete_campaign_batch(p_campaign uuid,p_kind text)
returns jsonb language plpgsql set search_path='' as $$
declare pending integer; uncertain integer; failures integer; sent integer;
begin
  update public.messages set status='unknown',error='Interruption : vérifier la livraison avant toute reprise.'
    where campaign_id=p_campaign and kind=p_kind and status='sending' and dispatch_started_at < now()-interval '2 minutes';
  select count(*) filter(where status in ('queued','sending')),count(*) filter(where status='unknown'),
    count(*) filter(where status='failed'),count(*) filter(where status in ('sent','delivered','read','simulated'))
    into pending,uncertain,failures,sent from public.messages where campaign_id=p_campaign and kind=p_kind and direction='out';
  if pending=0 and uncertain=0 and failures=0 then
    if p_kind='main' then update public.campaigns set main_sent_at=coalesce(main_sent_at,now()),status=case when status='annule' then status else 'envoye' end
      where id=p_campaign and main_prepared_at is not null;
    else update public.campaigns set reminder_sent_at=coalesce(reminder_sent_at,now()) where id=p_campaign and reminder_prepared_at is not null; end if;
  end if;
  return jsonb_build_object('pending',pending,'uncertain',uncertain,'failed',failures,'sent',sent);
end $$;

create or replace function public.record_incoming(p_client uuid,p_phone text,p_name text,p_text text,p_wa_id text,p_intent text,p_campaign uuid,p_simulated boolean)
returns jsonb language plpgsql set search_path='' as $$
declare t public.contacts; m public.messages; campaign uuid;
begin
  if p_phone !~ '^\+[1-9][0-9]{7,14}$' or length(p_text)>5000 or p_wa_id is null then raise exception 'invalid message'; end if;
  if p_intent not in ('INTERESSE','RESERVATION','QUESTION_PRIX','QUESTION_LIEU','QUESTION_HEURE','STOP','REFUS','AUTRE') then raise exception 'invalid intent'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_client::text||p_wa_id,0));
  select * into m from public.messages where client_id=p_client and wa_message_id=p_wa_id;
  if found then return jsonb_build_object('messageId',m.id,'intent',m.intent,'duplicate',true); end if;
  insert into public.contacts(client_id,phone,first_name,consent,status) values(p_client,p_phone,left(p_name,200),false,'prospect')
    on conflict(client_id,phone) do nothing;
  select * into strict t from public.contacts where client_id=p_client and phone=p_phone for update;
  campaign := p_campaign;
  if campaign is null then select campaign_id into campaign from public.messages where client_id=p_client and contact_id=t.id and direction='out'
    and status in ('sent','delivered','read','simulated') order by created_at desc limit 1; end if;
  insert into public.messages(client_id,campaign_id,contact_id,direction,kind,body,wa_message_id,status,intent,handled,simulated)
    values(p_client,campaign,t.id,'in','reply',p_text,p_wa_id,'received',p_intent,p_intent in ('STOP','REFUS'),p_simulated) returning * into m;
  if p_intent='STOP' then
    update public.contacts set consent=false,status='stop' where id=t.id;
    update public.messages set status='skipped' where contact_id=t.id and direction='out' and status='queued';
    insert into public.optouts(client_id,contact_id,campaign_id,original_message) values(p_client,t.id,campaign,p_text);
  elsif p_intent='RESERVATION' then
    insert into public.reservations(client_id,contact_id,campaign_id,message_id,details) values(p_client,t.id,campaign,m.id,p_text);
  end if;
  return jsonb_build_object('messageId',m.id,'intent',p_intent,'duplicate',false);
end $$;

create or replace function public.record_delivery_status(p_client uuid,p_wa_id text,p_status text)
returns void language plpgsql set search_path='' as $$
begin
  if p_status not in ('sent','delivered','read','failed') then raise exception 'invalid status'; end if;
  update public.messages set status=p_status where client_id=p_client and wa_message_id=p_wa_id and direction='out'
    and (case p_status when 'read' then 3 when 'delivered' then 2 when 'sent' then 1 else 0 end >=
         case status when 'read' then 3 when 'delivered' then 2 when 'sent' then 1 else 0 end)
    and not (p_status='failed' and status in ('delivered','read'));
end $$;

-- No SECURITY DEFINER. Functions operate with service_role privileges only.
do $$
declare f record;
begin
  for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname in
    ('anonymize_contact_history','prepare_campaign','claim_campaign_message','finish_campaign_message','complete_campaign_batch','record_incoming','record_delivery_status') loop
    execute format('revoke all on function %s from public, anon, authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
commit;
