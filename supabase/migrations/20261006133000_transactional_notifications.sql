-- Task 12.2: reference-only transactional outbox. No seed, recipient publication or activation.
-- Auth invitations/codes remain provider-owned; no second authentication sender is introduced.
create table audit_private.transactional_notifications (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id),
 subject_id uuid not null references public.subjects(id),
 source_kind text not null check(source_kind in ('profile','rights','workflow','settlement')),
 source_id uuid not null,
 source_version text not null check(length(source_version) between 1 and 64),
 template text not null check(template in ('account-v1','payment-v1','service-v1','support-v1')),
 owner text not null check(owner in ('operations','privacy')),
 recorded_at timestamptz not null default clock_timestamp(),
 unique(tenant_id,source_kind,source_id,source_version,subject_id,template)
);
create index transactional_notification_subject_idx on audit_private.transactional_notifications(subject_id,tenant_id);
create table audit_private.transactional_dispatch (
 notification_id uuid primary key references audit_private.transactional_notifications(id),
 state text not null default 'pending' check(state in ('pending','leased','accepted','failed','uncertain','suppressed')),
 attempt integer not null default 0 check(attempt between 0 and 3),
 destination_hash text check(destination_hash ~ '^[a-f0-9]{64}$'),
 lease_id uuid, lease_until timestamptz,
 next_attempt_at timestamptz not null default clock_timestamp(),
 reason text check(reason in ('RECIPIENT_UNAVAILABLE','CHANNEL_UNAVAILABLE','AUTHORITY_CHANGED','CONTACT_CHANGED',
   'SUPPRESSED','BUDGET_EXHAUSTED','ATTEMPTS_EXHAUSTED','TRANSPORT_FAILED','TRANSPORT_UNCERTAIN'))
);
create table audit_private.transactional_attempts (
 lease_id uuid primary key,
 notification_id uuid not null references audit_private.transactional_notifications(id),
 attempt integer not null check(attempt between 1 and 3),
 recorded_at timestamptz not null default clock_timestamp(),
 unique(notification_id,attempt)
);
create index transactional_attempt_time_idx on audit_private.transactional_attempts(recorded_at);
create table audit_private.transactional_delivery_facts (
 lease_id uuid primary key references audit_private.transactional_attempts(lease_id),
 outcome text not null check(outcome in ('accepted','retryable','failed','uncertain')),
 recorded_at timestamptz not null default clock_timestamp()
);
-- Subject-scoped suppression follows an address change until separately reviewed.
-- No direct setter: attributed provider receipts own current suppression facts;
-- any future recipient-requested suppression needs its own governed rights command.
create table audit_private.transactional_suppressions (
 tenant_id uuid not null references public.tenants(id),
 subject_id uuid not null references public.subjects(id),
 reason text not null check(reason in ('provider_suppressed','recipient_requested','delivery_failed')),
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(tenant_id,subject_id)
);
create table audit_private.transactional_message_bindings (
 lease_id uuid primary key references audit_private.transactional_attempts(lease_id),
 message_hash text not null unique check(message_hash ~ '^[a-f0-9]{64}$'),
 recorded_at timestamptz not null default clock_timestamp()
);
create table audit_private.transactional_provider_deliveries (
 lease_id uuid not null references audit_private.transactional_message_bindings(lease_id),
 event text not null check(event in ('delivered','hard_bounce','soft_bounce','blocked','invalid','spam','unsubscribed','error')),
 occurred_at timestamptz not null,
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(lease_id,event,occurred_at)
);
do $$declare t text;begin
 foreach t in array array['transactional_notifications','transactional_dispatch','transactional_attempts',
 'transactional_delivery_facts','transactional_suppressions','transactional_message_bindings','transactional_provider_deliveries'] loop
  execute format('alter table audit_private.%I enable row level security',t);
  execute format('alter table audit_private.%I force row level security',t);
  execute format('revoke all on audit_private.%I from public,anon,authenticated,service_role',t);
  if t<>'transactional_dispatch' then
   execute format('create trigger %I before update or delete on audit_private.%I for each row execute function audit_private.reject_append_only_mutation()',t||'_immutable',t);
  end if;
 end loop;
end$$;

-- Trigger-only origin: application/browser callers cannot fabricate events or recipient addresses.
create function audit_private.capture_transactional_notification() returns trigger
language plpgsql security definer set search_path='' as $$
declare t uuid;s uuid;source uuid;kind text;v text:='1';template_name text;owner_name text:='operations';
begin
 if tg_table_name='client_profile_events' then
  t:=new.tenant_id;s:=new.subject_id;source:=new.id;kind:='profile';template_name:='account-v1';
 elsif tg_table_name='patient_rights_requests' then
  t:=new.tenant_id;s:=new.subject_id;source:=new.id;kind:='rights';owner_name:='privacy';
  template_name:=case when new.kind='support' then 'support-v1' else 'account-v1' end;
  if new.kind='support' then owner_name:='operations';end if;
 elsif tg_table_name='operations_events' then
  if new.event not in ('transitioned','handoff_attempted','acknowledged') then return new;end if;
  t:=new.tenant_id;s:=new.subject_id;source:=new.id;kind:='workflow';template_name:='service-v1';
 elsif tg_table_name='settlements' then
  if tg_op='UPDATE' and (to_jsonb(new)-'updated_at')=(to_jsonb(old)-'updated_at') then return new;end if;
  if not(new.paid_confirmed or new.no_additional_payment or new.failure_seen or new.expiry_seen
    or new.refunded_minor>0 or new.dispute_seen or new.reconciliation_required) then return new;end if;
  select tenant_id,subject_id into t,s from commerce_private.checkout_intents where id=new.intent_id;
  source:=new.intent_id;kind:='settlement';template_name:='payment-v1';
  v:=encode(extensions.digest(convert_to((to_jsonb(new)-'updated_at')::text,'UTF8'),'sha256'),'hex');
 else raise exception using errcode='42501',message='NOTIFICATION_SOURCE_REJECTED';end if;
 insert into audit_private.transactional_notifications(tenant_id,subject_id,source_kind,source_id,source_version,template,owner)
 values(t,s,kind,source,v,template_name,owner_name) on conflict do nothing;
 return new;
end$$;
revoke all on function audit_private.capture_transactional_notification() from public,anon,authenticated,service_role;
create trigger profile_transactional_notification after insert on public.client_profile_events
 for each row execute function audit_private.capture_transactional_notification();
create trigger rights_transactional_notification after insert on identity_private.patient_rights_requests
 for each row execute function audit_private.capture_transactional_notification();
create trigger workflow_transactional_notification after insert on public.operations_events
 for each row execute function audit_private.capture_transactional_notification();
create trigger payment_transactional_notification after insert or update on commerce_private.settlements
 for each row execute function audit_private.capture_transactional_notification();

-- One advisory lock and UTC quota across all application senders. Auth is not job-retried here.
create function audit_private.notification_budget_used() returns bigint
language sql stable set search_path='' as $$
 select
 (select count(*) from audit_private.operations_alert_attempts where recorded_at>=date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC')+
 (select count(*) from intake_private.notification_attempts where recorded_at>=date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC')+
 (select count(*) from audit_private.transactional_attempts where recorded_at>=date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC')
$$;
revoke all on function audit_private.notification_budget_used() from public,anon,authenticated,service_role;

create function audit_private.expire_notification_leases() returns void
language plpgsql set search_path='' as $$declare item record;begin
 for item in select * from audit_private.transactional_dispatch where state='leased' and lease_until<=clock_timestamp()
 order by notification_id limit 100 for update skip locked loop
  insert into audit_private.transactional_delivery_facts(lease_id,outcome) values(item.lease_id,'uncertain') on conflict do nothing;
  update audit_private.transactional_dispatch set state='uncertain',reason='TRANSPORT_UNCERTAIN',lease_until=null where notification_id=item.notification_id;
 end loop;
 for item in select * from audit_private.operations_alert_dispatch where state='leased' and lease_until<=clock_timestamp()
 order by alert_id limit 100 for update skip locked loop
  insert into audit_private.operations_alert_delivery_facts(lease_id,outcome) values(item.lease_id,'uncertain') on conflict do nothing;
  update audit_private.operations_alert_dispatch set state='uncertain' where alert_id=item.alert_id;
 end loop;
 for item in select * from intake_private.notifications where state='leased' and lease_until<=clock_timestamp()
 order by id limit 100 for update skip locked loop
  insert into intake_private.notification_receipts(lease_id,outcome) values(item.lease_id,'uncertain') on conflict do nothing;
  update intake_private.notifications set state='uncertain' where id=item.id;
 end loop;
end$$;
revoke all on function audit_private.expire_notification_leases() from public,anon,authenticated,service_role;

-- Retain existing recipients, clinical fallback and acknowledgement contracts inside private
-- primitives; wrappers prevent the old operations-only budget from bypassing shared capacity.
alter function public.claim_operations_alert_notification(uuid) rename to claim_operations_alert_before_shared_budget;
alter function public.claim_operations_alert_before_shared_budget(uuid) set schema audit_private;
revoke all on function audit_private.claim_operations_alert_before_shared_budget(uuid) from public,anon,authenticated,service_role;
create function public.claim_operations_alert_notification(p_tenant_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$begin
 perform pg_advisory_xact_lock(107,1);
 perform audit_private.expire_notification_leases();
 if audit_private.notification_budget_used()>=50 then return null;end if;
 if not exists(select 1 from public.tenants where id=p_tenant_id and status='active') then return null;end if;
 return audit_private.claim_operations_alert_before_shared_budget(p_tenant_id);
end$$;
revoke all on function public.claim_operations_alert_notification(uuid) from public,anon,authenticated;
grant execute on function public.claim_operations_alert_notification(uuid) to service_role;
alter function public.claim_medical_safety_notification(uuid) rename to claim_medical_safety_before_shared_budget;
alter function public.claim_medical_safety_before_shared_budget(uuid) set schema intake_private;
revoke all on function intake_private.claim_medical_safety_before_shared_budget(uuid) from public,anon,authenticated,service_role;
create function public.claim_medical_safety_notification(p_tenant_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$begin
 perform pg_advisory_xact_lock(107,1);
 perform audit_private.expire_notification_leases();
 if audit_private.notification_budget_used()>=50 then return null;end if;
 return intake_private.claim_medical_safety_before_shared_budget(p_tenant_id);
end$$;
revoke all on function public.claim_medical_safety_notification(uuid) from public,anon,authenticated;
grant execute on function public.claim_medical_safety_notification(uuid) to service_role;

create function public.claim_transactional_notification(p_tenant_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare n audit_private.transactional_notifications;d audit_private.transactional_dispatch;
 address text;digest text;token uuid:=gen_random_uuid();why text;
begin
 if p_tenant_id is null then raise exception using errcode='22023',message='NOTIFICATION_INPUT_INVALID';end if;
 perform pg_advisory_xact_lock(107,1);
 perform audit_private.expire_notification_leases();
 perform 1 from public.tenants where id=p_tenant_id and status='active' for share;
 if not found then return null;end if;
 insert into audit_private.transactional_dispatch(notification_id)
 select id from audit_private.transactional_notifications where tenant_id=p_tenant_id on conflict do nothing;
 for n in select x.* from audit_private.transactional_notifications x join audit_private.transactional_dispatch c on c.notification_id=x.id
 where x.tenant_id=p_tenant_id and c.state='pending' and c.attempt<3 and c.next_attempt_at<=clock_timestamp()
 order by x.recorded_at,x.id limit 100 for update of c loop
  select * into d from audit_private.transactional_dispatch where notification_id=n.id;
  why:=null;address:=null;
  -- Fresh current authority; never cache a destination in a queued job or accept a browser email.
  perform 1 from public.subjects where id=n.subject_id and status='active' for share;
  if not found then why:='AUTHORITY_CHANGED';end if;
  perform 1 from public.tenant_memberships where tenant_id=n.tenant_id and subject_id=n.subject_id
   and role='patient' and status='active' and valid_from<=clock_timestamp() and (expires_at is null or expires_at>clock_timestamp()) for share;
  if not found then why:='AUTHORITY_CHANGED';end if;
  perform 1 from public.client_profiles where tenant_id=n.tenant_id and subject_id=n.subject_id
   and status='active' for share;
  if not found then why:='AUTHORITY_CHANGED';end if;
  if exists(select 1 from public.client_profiles where tenant_id=n.tenant_id and subject_id=n.subject_id and contact_preference<>'email') then why:='CHANNEL_UNAVAILABLE';end if;
  select normalized_value into address from public.subject_contacts where subject_id=n.subject_id and kind='email'
   and status='verified' and verified_at is not null for share;
  if address is null or length(address)>254 or address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then why:=coalesce(why,'RECIPIENT_UNAVAILABLE');end if;
  digest:=encode(extensions.digest(convert_to(coalesce(address,''),'UTF8'),'sha256'),'hex');
  if d.destination_hash is not null and d.destination_hash<>digest then why:='CONTACT_CHANGED';end if;
  if exists(select 1 from audit_private.transactional_suppressions where tenant_id=n.tenant_id and subject_id=n.subject_id) then why:='SUPPRESSED';end if;
  if why is not null then
   update audit_private.transactional_dispatch set state=case when why in('SUPPRESSED','AUTHORITY_CHANGED','CONTACT_CHANGED') then 'suppressed' else 'failed' end,reason=why where notification_id=n.id;
   continue;
  end if;
  if audit_private.notification_budget_used()>=50 then
   update audit_private.transactional_dispatch set reason='BUDGET_EXHAUSTED' where notification_id=n.id;
   return null;
  end if;
  update audit_private.transactional_dispatch set state='leased',attempt=attempt+1,lease_id=token,
   lease_until=clock_timestamp()+interval '2 minutes',destination_hash=digest,reason=null
   where notification_id=n.id returning * into d;
  insert into audit_private.transactional_attempts(lease_id,notification_id,attempt) values(token,n.id,d.attempt);
  return jsonb_build_object('notificationId',n.id,'leaseId',token,'template',n.template,'recipient',address);
 end loop;
 return null;
end$$;
revoke all on function public.claim_transactional_notification(uuid) from public,anon,authenticated;
grant execute on function public.claim_transactional_notification(uuid) to service_role;

create function public.finish_transactional_notification(p_tenant_id uuid,p_notification_id uuid,p_lease_id uuid,p_outcome text)
returns boolean language plpgsql security definer set search_path='' as $$
declare d audit_private.transactional_dispatch;prior text;
begin
 if p_outcome is null or p_outcome not in('accepted','retryable','failed','uncertain') then
  raise exception using errcode='22023',message='NOTIFICATION_OUTCOME_INVALID';end if;
 if not exists(select 1 from audit_private.transactional_notifications where id=p_notification_id and tenant_id=p_tenant_id) then
  raise exception using errcode='42501',message='NOTIFICATION_REJECTED';end if;
 select * into d from audit_private.transactional_dispatch where notification_id=p_notification_id for update;
 if not exists(select 1 from audit_private.transactional_attempts where notification_id=p_notification_id and lease_id=p_lease_id) then
  raise exception using errcode='40001',message='NOTIFICATION_CONFLICT';end if;
 select outcome into prior from audit_private.transactional_delivery_facts where lease_id=p_lease_id;
 if prior is not null then
  if prior<>p_outcome then raise exception using errcode='40001',message='NOTIFICATION_CONFLICT';end if;
  return true;
 end if;
 if d.state<>'leased' or d.lease_id is distinct from p_lease_id or d.lease_until<=clock_timestamp() then
  raise exception using errcode='40001',message='NOTIFICATION_CONFLICT';end if;
 insert into audit_private.transactional_delivery_facts(lease_id,outcome) values(p_lease_id,p_outcome);
 update audit_private.transactional_dispatch set state=case when p_outcome='retryable' and attempt<3 then 'pending'
  when p_outcome='retryable' then 'failed' else p_outcome end,
  reason=case when p_outcome='retryable' and attempt=3 then 'ATTEMPTS_EXHAUSTED'
   when p_outcome='failed' then 'TRANSPORT_FAILED' when p_outcome='uncertain' then 'TRANSPORT_UNCERTAIN' else null end,
  next_attempt_at=clock_timestamp()+make_interval(secs=>case when attempt=1 then 60 else 300 end),lease_until=null
  where notification_id=p_notification_id;
 return true;
end$$;
revoke all on function public.finish_transactional_notification(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.finish_transactional_notification(uuid,uuid,uuid,text) to service_role;

create function public.bind_transactional_message(p_tenant_id uuid,p_notification_id uuid,p_lease_id uuid,p_message_hash text)
returns boolean language plpgsql security definer set search_path='' as $$
declare d audit_private.transactional_dispatch;prior text;
begin
 if p_message_hash is null or p_message_hash !~ '^[a-f0-9]{64}$' then
  raise exception using errcode='22023',message='NOTIFICATION_REFERENCE_INVALID';end if;
 if not exists(select 1 from audit_private.transactional_notifications where id=p_notification_id and tenant_id=p_tenant_id) then
  raise exception using errcode='42501',message='NOTIFICATION_REJECTED';end if;
 select * into d from audit_private.transactional_dispatch where notification_id=p_notification_id for update;
 if not exists(select 1 from audit_private.transactional_attempts where lease_id=p_lease_id and notification_id=p_notification_id) then
  raise exception using errcode='40001',message='NOTIFICATION_CONFLICT';end if;
 select message_hash into prior from audit_private.transactional_message_bindings where lease_id=p_lease_id;
 if prior is not null then
  if prior<>p_message_hash then raise exception using errcode='40001',message='NOTIFICATION_CONFLICT';end if;
  return true;
 end if;
 if d.state<>'leased' or d.lease_id is distinct from p_lease_id or d.lease_until<=clock_timestamp() then
  raise exception using errcode='40001',message='NOTIFICATION_CONFLICT';end if;
 insert into audit_private.transactional_message_bindings(lease_id,message_hash) values(p_lease_id,p_message_hash);
 return true;
end$$;
revoke all on function public.bind_transactional_message(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.bind_transactional_message(uuid,uuid,uuid,text) to service_role;

-- Sender acceptance and provider delivery are separate append-only facts. A stale lease's
-- transport stays uncertain even if an independently attributed delivery arrives afterward.
create function public.record_transactional_delivery(p_tenant_id uuid,p_message_hash text,p_event text,p_occurred_at timestamptz)
returns boolean language plpgsql security definer set search_path='' as $$
declare n audit_private.transactional_notifications;lease uuid;
begin
 if p_tenant_id is null or p_message_hash is null or p_message_hash !~ '^[a-f0-9]{64}$'
 or p_event is null or p_event not in('delivered','hard_bounce','soft_bounce','blocked','invalid','spam','unsubscribed','error')
 or p_occurred_at is null or p_occurred_at>clock_timestamp()+interval '5 minutes' then
  raise exception using errcode='22023',message='NOTIFICATION_DELIVERY_INVALID';end if;
 select b.lease_id into lease from audit_private.transactional_notifications x
 join audit_private.transactional_attempts a on a.notification_id=x.id
 join audit_private.transactional_message_bindings b on b.lease_id=a.lease_id
 where x.tenant_id=p_tenant_id and b.message_hash=p_message_hash;
 select x.* into n from audit_private.transactional_notifications x
 join audit_private.transactional_attempts a on a.notification_id=x.id where a.lease_id=lease;
 if n.id is null then return false;end if;
 if p_occurred_at<n.recorded_at-interval '5 minutes' then
  raise exception using errcode='22023',message='NOTIFICATION_DELIVERY_INVALID';end if;
 perform pg_advisory_xact_lock(107,1);
 insert into audit_private.transactional_provider_deliveries(lease_id,event,occurred_at)
 values(lease,p_event,p_occurred_at) on conflict do nothing;
 if p_event in('hard_bounce','blocked','invalid','spam','unsubscribed') then
  insert into audit_private.transactional_suppressions(tenant_id,subject_id,reason)
  values(n.tenant_id,n.subject_id,'provider_suppressed') on conflict do nothing;
 end if;
 return true;
end$$;
revoke all on function public.record_transactional_delivery(uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_transactional_delivery(uuid,text,text,timestamptz) to service_role;
