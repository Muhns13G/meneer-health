-- Attributed immutable provider facts; never invitation acceptance or a retry queue.
begin;
create table identity_private.mobile_invitation_delivery_receipts (
 event_id uuid primary key,
 attempt_id uuid not null references identity_private.mobile_invitation_delivery_intents(id),
 message_id uuid not null,
 event text not null check(event in ('message.sent','message.finalized')),
 outcome text not null check(outcome in ('sent','delivered','failed','unconfirmed')),
 occurred_at timestamptz not null,
 received_at timestamptz not null default clock_timestamp(),
 cost_usd_micros integer check(cost_usd_micros between 0 and 2000000000),
 fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
 check((event='message.sent')=(outcome='sent'))
);
create index mobile_receipt_attempt on identity_private.mobile_invitation_delivery_receipts(attempt_id);
create table identity_private.mobile_invitation_provider_bindings (
 message_id uuid primary key,
 attempt_id uuid not null unique references identity_private.mobile_invitation_delivery_intents(id)
);
create table identity_private.mobile_invitation_receipt_conflicts (
 event_id uuid not null,
 attempt_id uuid not null references identity_private.mobile_invitation_delivery_intents(id),
 fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
 received_at timestamptz not null default clock_timestamp(),
 primary key(event_id,attempt_id,fingerprint)
);
alter table identity_private.mobile_invitation_delivery_receipts enable row level security;
alter table identity_private.mobile_invitation_delivery_receipts force row level security;
alter table identity_private.mobile_invitation_provider_bindings enable row level security;
alter table identity_private.mobile_invitation_provider_bindings force row level security;
alter table identity_private.mobile_invitation_receipt_conflicts enable row level security;
alter table identity_private.mobile_invitation_receipt_conflicts force row level security;
revoke all on identity_private.mobile_invitation_delivery_receipts,identity_private.mobile_invitation_provider_bindings,identity_private.mobile_invitation_receipt_conflicts from public,anon,authenticated,service_role;
create function identity_private.guard_mobile_receipt() returns trigger
 language plpgsql security definer set search_path='' as $$begin
 raise exception using errcode='42501',message='MOBILE_RECEIPT_IMMUTABLE'; end$$;
create trigger mobile_receipt_immutable before update or delete on identity_private.mobile_invitation_delivery_receipts for each row execute function identity_private.guard_mobile_receipt();
create trigger mobile_provider_binding_immutable before update or delete on identity_private.mobile_invitation_provider_bindings for each row execute function identity_private.guard_mobile_receipt();
create trigger mobile_receipt_conflict_immutable before update or delete on identity_private.mobile_invitation_receipt_conflicts for each row execute function identity_private.guard_mobile_receipt();
revoke all on function identity_private.guard_mobile_receipt() from public,anon,authenticated,service_role;

create function public.record_mobile_invitation_receipt(
 p_tenant_id uuid,p_event_id uuid,p_message_id uuid,p_event text,p_outcome text,
 p_occurred_at timestamptz,p_token_digest text,p_profile_id uuid,p_from_phone text,p_to_phone text,p_cost integer
) returns boolean language plpgsql security definer set search_path='' as $$
declare intent identity_private.mobile_invitation_delivery_intents; prior identity_private.mobile_invitation_delivery_receipts; fingerprint text;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text,14103));
 if p_event_id is null or p_message_id is null or p_occurred_at is null or p_occurred_at>clock_timestamp()+interval '30 seconds'
  or p_event is null or p_outcome is null or p_event not in ('message.sent','message.finalized')
  or p_outcome not in ('sent','delivered','failed','unconfirmed') or (p_event='message.sent')<>(p_outcome='sent')
  or p_cost<0 or p_cost>2000000000 or p_token_digest is null or p_token_digest !~ '^[a-f0-9]{64}$' then
  raise exception using errcode='22023',message='MOBILE_RECEIPT_INVALID'; end if;
 select d.* into intent from identity_private.mobile_invitation_delivery_intents d
  join identity_private.mobile_invitation_tokens t on t.id=d.token_id
  join identity_private.mobile_invitation_contacts c on c.invitation_id=d.invitation_id
  where d.tenant_id=p_tenant_id and t.digest=p_token_digest and d.provider_profile_id=p_profile_id
   and d.from_phone=p_from_phone and c.phone=p_to_phone;
 if not found or p_occurred_at<intent.prepared_at-interval '5 seconds' then
  raise exception using errcode='42501',message='MOBILE_RECEIPT_UNATTRIBUTED'; end if;
 if intent.provider_message_id is not null and intent.provider_message_id<>p_message_id
  or exists(select 1 from identity_private.mobile_invitation_delivery_intents d where d.provider_message_id=p_message_id and d.id<>intent.id)
  or exists(select 1 from identity_private.mobile_invitation_provider_bindings b where
   (b.message_id=p_message_id and b.attempt_id<>intent.id) or (b.attempt_id=intent.id and b.message_id<>p_message_id)) then
  raise exception using errcode='PT409',message='MOBILE_RECEIPT_CONFLICT'; end if;
 fingerprint:=encode(extensions.digest(jsonb_build_array(intent.id,p_message_id,p_event,p_outcome,extract(epoch from p_occurred_at),p_cost)::text,'sha256'),'hex');
 select * into prior from identity_private.mobile_invitation_delivery_receipts where event_id=p_event_id;
 if found then
  if prior.fingerprint<>fingerprint then
   insert into identity_private.mobile_invitation_receipt_conflicts(event_id,attempt_id,fingerprint)
    values(p_event_id,intent.id,fingerprint) on conflict do nothing;
   if found then
    perform audit_private.append_audit_fact(p_tenant_id,'system',intent.actor_subject_id,'delivery_receipt','system',
     'mobile.invitation.receipt.conflict',null,'mobile_invitation',intent.invitation_id::text,'operations','mobile-invitation-v1',
     'denied','MOBILE_RECEIPT_CONFLICT',p_event_id::text,p_event_id::text,clock_timestamp(),'{}'::jsonb);
   end if;
  end if;
  return true;
 end if;
 insert into identity_private.mobile_invitation_provider_bindings(message_id,attempt_id)
  values(p_message_id,intent.id) on conflict do nothing;
 if not exists(select 1 from identity_private.mobile_invitation_provider_bindings where message_id=p_message_id and attempt_id=intent.id) then
  raise exception using errcode='PT409',message='MOBILE_RECEIPT_CONFLICT'; end if;
 insert into identity_private.mobile_invitation_delivery_receipts(event_id,attempt_id,message_id,event,outcome,occurred_at,cost_usd_micros,fingerprint)
  values(p_event_id,intent.id,p_message_id,p_event,p_outcome,p_occurred_at,p_cost,fingerprint);
 perform audit_private.append_audit_fact(p_tenant_id,'system',intent.actor_subject_id,'delivery_receipt','system',
  'mobile.invitation.receipt',null,'mobile_invitation',intent.invitation_id::text,'operations','mobile-invitation-v1',
  'succeeded','MOBILE_RECEIPT_RECORDED',p_event_id::text,p_event_id::text,clock_timestamp(),'{}'::jsonb);
 return true;
end$$;
revoke all on function public.record_mobile_invitation_receipt(uuid,uuid,uuid,text,text,timestamptz,text,uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.record_mobile_invitation_receipt(uuid,uuid,uuid,text,text,timestamptz,text,uuid,text,text,integer) to service_role;

-- Keep the original authority/masking/pagination boundary and add only a delivery disposition.
alter function public.read_mobile_invitation_register(uuid,uuid,text,uuid,uuid,uuid,uuid) set schema identity_private;
revoke all on function identity_private.read_mobile_invitation_register(uuid,uuid,text,uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role;
create function public.read_mobile_invitation_register(
 p_provider_subject uuid,p_provider_session_id uuid,p_verified_email text,p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,p_after_id uuid default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; rows jsonb;
begin
 result:=identity_private.read_mobile_invitation_register(p_provider_subject,p_provider_session_id,p_verified_email,p_session_id,p_subject_id,p_tenant_id,p_after_id);
 select coalesce(jsonb_agg(row.value||jsonb_build_object('dispatchRequestKey',case when d.id is null and row.value->>'status'='draft' then
  (select r.request_key from identity_private.mobile_invitation_send_reservations r where r.invitation_id=(row.value->>'id')::uuid and r.invitation_version=(row.value->>'version')::integer and r.actor_subject_id=p_subject_id) else null end,'delivery',jsonb_build_object(
  'status',case when d.id is null then 'not_attempted'
   when exists(select 1 from identity_private.mobile_invitation_receipt_conflicts c where c.attempt_id=d.id) then 'conflict'
   when (select count(distinct r.outcome) from identity_private.mobile_invitation_delivery_receipts r where r.attempt_id=d.id and r.event='message.finalized')>1 then 'conflict'
   when d.state='failed' and exists(select 1 from identity_private.mobile_invitation_delivery_receipts r where r.attempt_id=d.id and r.outcome in ('sent','delivered')) then 'conflict'
   when exists(select 1 from identity_private.mobile_invitation_delivery_receipts r where r.attempt_id=d.id and r.outcome='delivered') then 'provider_delivered'
   when exists(select 1 from identity_private.mobile_invitation_delivery_receipts r where r.attempt_id=d.id and r.outcome='failed') then 'failed'
   when exists(select 1 from identity_private.mobile_invitation_delivery_receipts r where r.attempt_id=d.id and r.outcome='unconfirmed') then 'uncertain'
   when exists(select 1 from identity_private.mobile_invitation_delivery_receipts r where r.attempt_id=d.id and r.outcome='sent') then 'sent'
   when d.state='prepared' and d.dispatch_until>clock_timestamp() then 'pending'
   when d.state='prepared' then 'uncertain' else d.state end,
  'budgetReview',exists(select 1 from identity_private.mobile_invitation_delivery_receipts r where r.attempt_id=d.id and r.cost_usd_micros>d.reserved_usd_micros)
  )) order by row.ordinality),'[]'::jsonb) into rows
 from jsonb_array_elements(result->'invitations') with ordinality row(value,ordinality)
 left join identity_private.mobile_invitation_delivery_intents d on d.invitation_id=(row.value->>'id')::uuid and d.invitation_version=(row.value->>'version')::integer and d.tenant_id=p_tenant_id;
 return jsonb_set(jsonb_set(result,'{invitations}',rows),'{sendingEnabled}',to_jsonb(coalesce((select sending_enabled and delivery_ready from identity_private.mobile_invitation_policies where tenant_id=p_tenant_id),false)));
end$$;
revoke all on function public.read_mobile_invitation_register(uuid,uuid,text,uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_mobile_invitation_register(uuid,uuid,text,uuid,uuid,uuid,uuid) to service_role;
create function identity_private.guard_mobile_provider_identity() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.provider_message_id is not null and exists(select 1 from identity_private.mobile_invitation_provider_bindings b where
  (b.attempt_id=new.id and b.message_id<>new.provider_message_id) or (b.message_id=new.provider_message_id and b.attempt_id<>new.id)) then
  raise exception using errcode='PT409',message='MOBILE_RECEIPT_CONFLICT'; end if;
 return new;
end$$;
create trigger mobile_provider_identity before update on identity_private.mobile_invitation_delivery_intents for each row execute function identity_private.guard_mobile_provider_identity();
revoke all on function identity_private.guard_mobile_provider_identity() from public,anon,authenticated,service_role;
commit;
