-- Bounded private requests/reservations. No migration seed, real charge or clinical activation.
create table commerce_private.refund_authorities (
 case_id uuid not null references public.operations_cases(id),
 actor_id uuid not null references public.subjects(id),
 approval_reference uuid not null, approved_by uuid not null references public.subjects(id),
 expires_at timestamptz not null, revoked_at timestamptz,
 primary key(case_id,actor_id), check(actor_id<>approved_by)
);
create index refund_authority_actor_idx on commerce_private.refund_authorities(actor_id);
create index refund_authority_approver_idx on commerce_private.refund_authorities(approved_by);
-- Independent, attributed eligibility evidence; never accept a patient's asserted clinical outcome.
create table commerce_private.refund_evidence (
 id uuid primary key, case_id uuid not null references public.operations_cases(id),
 reason text not null check(reason in ('no_review','unsuitable','expired_decision','failed_handoff',
 'provider_unavailable','product_before_release','no_show','late_cancellation','post_release')),
 source_reference uuid not null, verified_by uuid not null references public.subjects(id),
 verified_at timestamptz not null, expires_at timestamptz not null check(expires_at>verified_at),
 unique(case_id,source_reference,reason)
);
create index refund_evidence_verifier_idx on commerce_private.refund_evidence(verified_by);
create table commerce_private.cancellation_requests (
 offer_id uuid primary key references commerce_private.offers(id),
 request_key uuid not null, requested_at timestamptz not null default clock_timestamp(),
 state text not null default 'requested' check(state in ('requested','staff_review','queued'))
);
create table commerce_private.refund_decisions (
 id uuid primary key default gen_random_uuid(), offer_id uuid not null references commerce_private.offers(id),
 actor_id uuid references public.subjects(id), service_id uuid references public.service_identities(id), request_key uuid not null,
 reason text not null, evidence_id uuid references commerce_private.refund_evidence(id),
 recorded_at timestamptz not null default clock_timestamp(), unique(offer_id,request_key),
 check((actor_id is null)<>(service_id is null))
);
create index refund_decision_actor_idx on commerce_private.refund_decisions(actor_id);
create index refund_decision_service_idx on commerce_private.refund_decisions(service_id);
create index refund_decision_evidence_idx on commerce_private.refund_decisions(evidence_id);
create table commerce_private.refund_jobs (
 id uuid primary key default gen_random_uuid(), decision_id uuid not null references commerce_private.refund_decisions(id),
 source_intent_id uuid not null references commerce_private.checkout_intents(id),
 amount_minor integer not null check(amount_minor between 1 and 100000000),
 account_id text not null, payment_intent_id text not null,
 state text not null default 'queued' check(state in ('queued','submitted','pending','uncertain','failed')),
 dispatch_started_at timestamptz, provider_refund_id text,
 unique(decision_id,source_intent_id)
);
create index refund_job_source_idx on commerce_private.refund_jobs(source_intent_id);
create function commerce_private.refund_job_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' or (to_jsonb(new)-array['state','dispatch_started_at','provider_refund_id'])<>
  (to_jsonb(old)-array['state','dispatch_started_at','provider_refund_id']) or
  (old.dispatch_started_at is not null and new.dispatch_started_at is distinct from old.dispatch_started_at) then
  raise exception using errcode='42501',message='REFUND_IMMUTABLE';end if;
 return new;
end $$;
revoke all on function commerce_private.refund_job_guard() from public,anon,authenticated,service_role;
create trigger refund_jobs_guard before update or delete on commerce_private.refund_jobs
 for each row execute function commerce_private.refund_job_guard();
create unique index refund_job_provider_idx on commerce_private.refund_jobs(account_id,provider_refund_id)
 where provider_refund_id is not null;
create table commerce_private.refund_dispatch_facts (
 job_id uuid primary key references commerce_private.refund_jobs(id),
 provider_refund_id text, state text not null check(state in ('submitted','pending','uncertain','failed')),
 recorded_at timestamptz not null default clock_timestamp()
);
do $$declare t text;begin
 foreach t in array array['refund_authorities','refund_evidence','cancellation_requests','refund_decisions','refund_jobs','refund_dispatch_facts'] loop
  execute format('alter table commerce_private.%I enable row level security',t);
  execute format('alter table commerce_private.%I force row level security',t);
  execute format('revoke all on commerce_private.%I from public,anon,authenticated,service_role',t);
 end loop;
 foreach t in array array['refund_evidence','refund_decisions','refund_dispatch_facts'] loop
  execute format('create trigger %I before update or delete on commerce_private.%I for each row execute function audit_private.reject_append_only_mutation()',t||'_immutable',t);
 end loop;
end $$;

create function commerce_private.refund_staff_authority(ctx jsonb,c uuid,mutation boolean) returns void
language plpgsql set search_path='' as $$
begin
 if ctx is null or jsonb_typeof(ctx)<>'object' or
 (select count(*) from jsonb_object_keys(ctx))<>6 or not(ctx ?& array[
 'p_provider_subject','p_provider_session_id','p_verified_email','p_session_id','p_subject_id','p_tenant_id']) then
 raise exception using errcode='42501',message='REFUND_REJECTED';end if;
 perform public.read_staff_payment_status((ctx->>'p_provider_subject')::uuid,(ctx->>'p_provider_session_id')::uuid,
 ctx->>'p_verified_email',(ctx->>'p_session_id')::uuid,(ctx->>'p_subject_id')::uuid,(ctx->>'p_tenant_id')::uuid,c);
 if mutation and not exists(select 1 from commerce_private.refund_authorities g
 join public.operations_cases o on o.id=g.case_id
 join public.tenant_memberships m on m.subject_id=g.approved_by and m.tenant_id=o.tenant_id
 where g.case_id=c and g.actor_id=(ctx->>'p_subject_id')::uuid and g.revoked_at is null
 and g.expires_at>clock_timestamp() and m.role='admin' and m.status='active'
 and m.valid_from<=clock_timestamp() and (m.expires_at is null or m.expires_at>clock_timestamp())) then
 raise exception using errcode='42501',message='REFUND_REJECTED';end if;
end $$;
revoke all on function commerce_private.refund_staff_authority(jsonb,uuid,boolean) from public,anon,authenticated,service_role;

create function commerce_private.refund_view(offer uuid,deadline timestamptz) returns jsonb
language sql stable set search_path='' as $$ select jsonb_build_object(
 'requestState',coalesce((select state from commerce_private.cancellation_requests where offer_id=offer),'not_requested'),
 'refunds',coalesce((select jsonb_agg(jsonb_build_object('reference',j.id,'amountMinor',j.amount_minor,
 'state',j.state) order by d.recorded_at,j.id) from commerce_private.refund_jobs j
 join commerce_private.refund_decisions d on d.id=j.decision_id where d.offer_id=offer),'[]'::jsonb),
 'expiresAt',deadline) $$;
revoke all on function commerce_private.refund_view(uuid,timestamptz) from public,anon,authenticated,service_role;

create function public.patient_refund_command(p_context jsonb,p_command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o commerce_private.offers; result jsonb; page jsonb; action text; key uuid;
begin
 perform intake_private.patient_authority(p_context);
 action:=p_command->>'action';
 if p_command is null or jsonb_typeof(p_command)<>'object' or action is null or action not in ('read','request')
 or not(p_command ? 'offerId') or exists(select 1 from jsonb_object_keys(p_command) k
 where k not in ('action','offerId','requestKey')) or (action='request' and not(p_command ? 'requestKey'))
 or (action='read' and p_command ? 'requestKey') then raise exception using errcode='22023',message='REFUND_COMMAND_INVALID';end if;
 select * into o from commerce_private.offers where id=(p_command->>'offerId')::uuid
 and tenant_id=(p_context->>'tenantId')::uuid and subject_id=(p_context->>'subjectId')::uuid;
 if o.id is null then raise exception using errcode='42501',message='REFUND_REJECTED';end if;
 perform 1 from public.operations_cases where id=o.case_id for update;
 if action='request' then
  key:=(p_command->>'requestKey')::uuid;
  if key is null then raise exception using errcode='22023',message='REFUND_COMMAND_INVALID';end if;
  insert into commerce_private.cancellation_requests(offer_id,request_key) values(o.id,key) on conflict do nothing;
  perform audit_private.append_audit_fact(o.tenant_id,'patient',o.subject_id,'patient','aal1','commerce.cancellation.request',
   o.subject_id,'payment',o.id::text,'account','sprint-11.7-v1','succeeded','CANCELLATION_REQUESTED',key::text,key::text,clock_timestamp(),'{}');
 end if;
 page:=public.read_patient_payment_status(p_context);
 result:=commerce_private.refund_view(o.id,(page->>'expiresAt')::timestamptz);
 perform intake_private.patient_authority(p_context);
 return result;
end $$;
revoke all on function public.patient_refund_command(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.patient_refund_command(jsonb,jsonb) to service_role;

-- Each source capture is serialised under its case lock. Uncertain and failed requests retain
-- their full reservations until 11.8 verifies provider facts; callers cannot release/retry them.
create function commerce_private.reserve_refund(decision uuid,source uuid,amount integer) returns void
language plpgsql set search_path='' as $$
declare capture integer; refunded integer; reserved bigint; account text; payment text;
begin
 if amount=0 then return;end if;
 if amount is null then raise exception using errcode='40001',message='REFUND_ALLOCATION_CONFLICT';end if;
 select (i.payload->>'amountTotalMinor')::integer,s.refunded_minor,b.account_id,b.payment_intent_id
 into capture,refunded,account,payment from commerce_private.checkout_intents i
 join commerce_private.settlements s on s.intent_id=i.id
 join commerce_private.intent_payment_bindings b on b.intent_id=i.id
 where i.id=source and s.paid_confirmed and not s.dispute_seen and not s.reconciliation_required;
 select coalesce(sum(amount_minor),0) into reserved from commerce_private.refund_jobs where source_intent_id=source;
 if capture is null or amount<0 or refunded+reserved+amount>capture then
 raise exception using errcode='40001',message='REFUND_ALLOCATION_CONFLICT';end if;
 insert into commerce_private.refund_jobs(decision_id,source_intent_id,amount_minor,account_id,payment_intent_id)
 values(decision,source,amount,account,payment);
 update commerce_private.deposit_funding set state='uncertain' where source_intent_id=source;
end $$;
revoke all on function commerce_private.reserve_refund(uuid,uuid,integer) from public,anon,authenticated,service_role;

create function public.staff_refund_command(p_authority jsonb,p_command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o commerce_private.offers; i commerce_private.checkout_intents; deposit uuid; d commerce_private.refund_decisions;
 action text; v_reason text; key uuid; evidence uuid; credit integer:=0; unused integer:=0; amount integer;
 deadline timestamptz; result jsonb; j commerce_private.refund_jobs; page jsonb;
begin
 if p_command is null or jsonb_typeof(p_command)<>'object' or not(p_command ?& array['action','offerId'])
 or exists(select 1 from jsonb_object_keys(p_command) k where k not in ('action','offerId','requestKey','reason','evidenceId','refundId','providerId','state')) then
 raise exception using errcode='22023',message='REFUND_COMMAND_INVALID';end if;
 action:=p_command->>'action';
 if action is null or action not in ('read','review','dispatch','record') then
 raise exception using errcode='22023',message='REFUND_COMMAND_INVALID';end if;
 select * into o from commerce_private.offers where id=(p_command->>'offerId')::uuid and tenant_id=(p_authority->>'p_tenant_id')::uuid;
 if o.id is null then raise exception using errcode='42501',message='REFUND_REJECTED';end if;
 perform commerce_private.refund_staff_authority(p_authority,o.case_id,action<>'read');
 perform 1 from public.operations_cases where id=o.case_id for update;
 perform commerce_private.refund_staff_authority(p_authority,o.case_id,action<>'read');
 select * into i from commerce_private.checkout_intents where offer_id=o.id;
 if action='review' then
  if (select count(*) from jsonb_object_keys(p_command))<>5 then
   raise exception using errcode='22023',message='REFUND_COMMAND_INVALID';end if;
  key:=(p_command->>'requestKey')::uuid;v_reason:=p_command->>'reason';evidence:=(p_command->>'evidenceId')::uuid;
  if key is null or v_reason is null or not exists(select 1 from commerce_private.refund_evidence e
   where e.id=evidence and e.case_id=o.case_id and e.reason=v_reason and e.verified_at<=clock_timestamp() and e.expires_at>clock_timestamp()) then
   raise exception using errcode='42501',message='REFUND_EVIDENCE_REQUIRED';end if;
  select * into d from commerce_private.refund_decisions where offer_id=o.id and request_key=key;
  if d.id is not null and (d.reason<>v_reason or d.evidence_id<>evidence or d.actor_id<>(p_authority->>'p_subject_id')::uuid) then
   raise exception using errcode='40001',message='REFUND_CONFLICT';end if;
  if d.id is null then
   if exists(select 1 from commerce_private.refund_jobs jobs join commerce_private.refund_decisions decisions
    on decisions.id=jobs.decision_id where decisions.offer_id=o.id) then
    raise exception using errcode='40001',message='REFUND_RECONCILIATION_REQUIRED';end if;
   insert into commerce_private.refund_decisions(offer_id,actor_id,request_key,reason,evidence_id)
    values(o.id,(p_authority->>'p_subject_id')::uuid,key,v_reason,evidence) returning * into d;
   insert into commerce_private.cancellation_requests(offer_id,request_key,state) values(o.id,key,'staff_review') on conflict do nothing;
   if v_reason not in ('no_show','late_cancellation','post_release') then
    select (snapshot->>'creditMinor')::integer,(snapshot->>'unusedDepositRefundMinor')::integer into credit,unused
      from commerce_private.offers where id=o.id;
    credit:=coalesce(credit,0);unused:=coalesce(unused,0);
    if o.snapshot->>'scenario'='review_deposit' then
     if exists(select 1 from commerce_private.credit_reservations where case_id=o.case_id and state in ('reserved','applied')) then
      raise exception using errcode='40001',message='REFUND_ALLOCATION_CONFLICT';end if;
     if v_reason='product_before_release' then raise exception using errcode='22023',message='REFUND_COMMAND_INVALID';end if;
     select (i.payload->>'amountTotalMinor')::integer-coalesce(s.refunded_minor,0)-
      coalesce((select sum(amount_minor) from commerce_private.refund_jobs where source_intent_id=i.id),0)
      into amount from commerce_private.settlements s where s.intent_id=i.id;
     perform commerce_private.reserve_refund(d.id,i.id,amount);
    elsif v_reason='product_before_release' then
     if not exists(select 1 from commerce_private.settlements where intent_id=i.id and (paid_confirmed or no_additional_payment)
      and not dispute_seen and not reconciliation_required) then raise exception using errcode='40001',message='REFUND_ALLOCATION_CONFLICT';end if;
     if credit>0 then
      select ci.id into deposit from commerce_private.checkout_intents ci join commerce_private.offers od on od.id=ci.offer_id
       join commerce_private.settlements s on s.intent_id=ci.id where od.case_id=o.case_id and od.tenant_id=o.tenant_id
       and od.subject_id=o.subject_id and od.snapshot->>'scenario'='review_deposit' and s.paid_confirmed;
      if (select count(*) from commerce_private.checkout_intents ci join commerce_private.offers od on od.id=ci.offer_id
       join commerce_private.settlements s on s.intent_id=ci.id where od.case_id=o.case_id and od.snapshot->>'scenario'='review_deposit' and s.paid_confirmed)<>1 then
        raise exception using errcode='40001',message='REFUND_ALLOCATION_CONFLICT';end if;
      if not exists(select 1 from commerce_private.deposit_funding where case_id=o.case_id
       and source_intent_id=deposit and state='applied') then
       raise exception using errcode='40001',message='REFUND_ALLOCATION_CONFLICT';end if;
      perform commerce_private.reserve_refund(d.id,deposit,credit);
     end if;
     select (i.payload->>'amountTotalMinor')::integer-s.refunded_minor-
      coalesce((select sum(amount_minor) from commerce_private.refund_jobs where source_intent_id=i.id),0)
      into amount from commerce_private.settlements s where s.intent_id=i.id;
     perform commerce_private.reserve_refund(d.id,i.id,amount);
    else raise exception using errcode='22023',message='REFUND_COMMAND_INVALID';end if;
    update commerce_private.cancellation_requests set state='queued' where offer_id=o.id;
   else update commerce_private.cancellation_requests set state='staff_review' where offer_id=o.id;end if;
  end if;
 elsif action in ('dispatch','record') then
  select jobs.* into j from commerce_private.refund_jobs jobs join commerce_private.refund_decisions decisions on decisions.id=jobs.decision_id
  where jobs.id=(p_command->>'refundId')::uuid and decisions.offer_id=o.id for update of jobs;
  if j.id is null then raise exception using errcode='42501',message='REFUND_REJECTED';end if;
  if action='dispatch' then
   if (select count(*) from jsonb_object_keys(p_command))<>4 or not(p_command ? 'requestKey') or (p_command->>'requestKey')::uuid is null then
    raise exception using errcode='22023',message='REFUND_COMMAND_INVALID';end if;
   if j.dispatch_started_at is not null then raise exception using errcode='40001',message='REFUND_RECONCILIATION_REQUIRED';end if;
   if exists(select 1 from commerce_private.refund_decisions decisions join commerce_private.refund_evidence e on e.id=decisions.evidence_id
    where decisions.id=j.decision_id and e.expires_at<=clock_timestamp()) then
    raise exception using errcode='42501',message='REFUND_EVIDENCE_REQUIRED';end if;
   if not exists(select 1 from commerce_private.settlements where intent_id=j.source_intent_id and paid_confirmed
    and not dispute_seen and not reconciliation_required) then raise exception using errcode='40001',message='REFUND_RECONCILIATION_REQUIRED';end if;
   if not exists(select 1 from commerce_private.checkout_releases r where r.tenant_id=o.tenant_id and r.provider_account_id=j.account_id
    and r.enabled and r.expires_at>clock_timestamp()) then raise exception using errcode='42501',message='REFUND_REJECTED';end if;
   update commerce_private.refund_jobs set dispatch_started_at=clock_timestamp(),state='uncertain' where id=j.id;
   result:=jsonb_build_object('refundId',j.id,'accountId',j.account_id,'paymentIntentId',j.payment_intent_id,
    'amountMinor',j.amount_minor,'currency','zar');
  else
   if (select count(*) from jsonb_object_keys(p_command))<>5 or j.dispatch_started_at is null
    or p_command->>'state' is null or p_command->>'state' not in ('submitted','pending','uncertain','failed')
    or (p_command->>'providerId' is not null and p_command->>'providerId' !~ '^re_[A-Za-z0-9_]{8,120}$') then
    raise exception using errcode='22023',message='REFUND_COMMAND_INVALID';end if;
   if exists(select 1 from commerce_private.refund_dispatch_facts where job_id=j.id and
    (state is distinct from p_command->>'state' or provider_refund_id is distinct from p_command->>'providerId')) then
    raise exception using errcode='40001',message='REFUND_CONFLICT';end if;
   insert into commerce_private.refund_dispatch_facts(job_id,provider_refund_id,state)
    values(j.id,p_command->>'providerId',p_command->>'state') on conflict do nothing;
   update commerce_private.refund_jobs set provider_refund_id=p_command->>'providerId',state=p_command->>'state' where id=j.id;
  end if;
 elsif (select count(*) from jsonb_object_keys(p_command))<>2 then
  raise exception using errcode='22023',message='REFUND_COMMAND_INVALID';
 end if;
 key:=coalesce((p_command->>'requestKey')::uuid,gen_random_uuid());
 perform audit_private.append_audit_fact(o.tenant_id,'workforce',(p_authority->>'p_subject_id')::uuid,'operations','aal2',
  'commerce.refund.'||action,o.subject_id,'payment',o.id::text,'operations','sprint-11.7-v1','succeeded',
  'REFUND_COMMAND_RECORDED',key::text,key::text,clock_timestamp(),'{}');
 perform commerce_private.refund_staff_authority(p_authority,o.case_id,action<>'read');
 page:=public.read_staff_payment_status((p_authority->>'p_provider_subject')::uuid,(p_authority->>'p_provider_session_id')::uuid,
 p_authority->>'p_verified_email',(p_authority->>'p_session_id')::uuid,(p_authority->>'p_subject_id')::uuid,
 (p_authority->>'p_tenant_id')::uuid,o.case_id);
 deadline:=(page->>'expiresAt')::timestamptz;
 perform commerce_private.refund_staff_authority(p_authority,o.case_id,action<>'read');
 return coalesce(result,commerce_private.refund_view(o.id,deadline));
end $$;
revoke all on function public.staff_refund_command(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.staff_refund_command(jsonb,jsonb) to service_role;

-- Financial failures create content-free, owned durable alerts using the existing dispatcher.
create function commerce_private.refund_alert() returns trigger language plpgsql set search_path='' as $$
declare o commerce_private.offers; d commerce_private.refund_decisions; fact public.audit_events; correlation uuid:=gen_random_uuid();
begin
 if new.state not in ('uncertain','failed','pending') or
   (tg_op='UPDATE' and old.state=new.state) then return new;end if;
 select * into d from commerce_private.refund_decisions where id=new.decision_id;
 select * into o from commerce_private.offers where id=d.offer_id;
 fact:=audit_private.append_audit_fact(o.tenant_id,case when d.service_id is null then 'workforce' else 'service' end,
  coalesce(d.actor_id,d.service_id),case when d.service_id is null then 'operations' else 'service_identity' end,
  case when d.service_id is null then 'aal2' else 'service' end,
  'commerce.refund.exception',o.subject_id,'payment',new.id::text,'operations','sprint-11.7-v1',
  'succeeded','REFUND_REVIEW_REQUIRED',correlation::text,correlation::text,clock_timestamp(),'{}');
 insert into audit_private.operations_alerts(tenant_id,audit_fact_id,code,owner,severity,deduplication_key)
 values(o.tenant_id,fact.id,'OPERATIONS_EXCEPTION','technology-operations','warning','refund:'||new.id::text||':'||new.state)
 on conflict do nothing;
 return new;
end $$;
revoke all on function commerce_private.refund_alert() from public,anon,authenticated,service_role;
create trigger refund_exception_alert after update on commerce_private.refund_jobs
 for each row execute function commerce_private.refund_alert();

-- Evolve the legacy funding source without reinterpreting historical payment orders.
alter table commerce_private.deposit_funding alter column source_order_id drop not null;
alter table commerce_private.deposit_funding add column source_intent_id uuid unique references commerce_private.checkout_intents(id);
alter table commerce_private.deposit_funding add constraint deposit_exact_source
 check((source_order_id is null)<>(source_intent_id is null));

create function commerce_private.queue_unused_deposit(source uuid,service uuid) returns void
language plpgsql set search_path='' as $$
declare i commerce_private.checkout_intents; o commerce_private.offers;
 f commerce_private.deposit_funding; r commerce_private.credit_reservations;
 decision uuid; correlation uuid:=gen_random_uuid();
begin
 select * into i from commerce_private.checkout_intents where id=source;
 select * into o from commerce_private.offers where id=i.offer_id;
 perform 1 from public.operations_cases where id=o.case_id for update;
 if not exists(select 1 from commerce_private.settlements where intent_id=i.id and (paid_confirmed or no_additional_payment)
  and not dispute_seen and not reconciliation_required and refunded_minor=0) then return;end if;
 if o.snapshot->>'scenario'='review_deposit' then
  if (select count(*) from commerce_private.checkout_intents ci join commerce_private.offers od on od.id=ci.offer_id
   join commerce_private.settlements s on s.intent_id=ci.id where od.case_id=o.case_id and od.snapshot->>'scenario'='review_deposit'
   and s.paid_confirmed)<>1 then return;end if;
  insert into commerce_private.deposit_funding(case_id,tenant_id,subject_id,source_intent_id,evidence_reference,amount_minor,state)
  values(o.case_id,o.tenant_id,o.subject_id,i.id,i.id,99900,'available') on conflict(case_id) do nothing;
  return;
 end if;
 select * into f from commerce_private.deposit_funding where case_id=o.case_id for update;
 select * into r from commerce_private.credit_reservations where offer_id=o.id for update;
 if r.id is null or f.source_intent_id is null or f.state not in ('reserved','applied') or r.state not in ('reserved','applied')
  or r.credit_minor<>(o.snapshot->>'creditMinor')::integer or r.unused_refund_minor<>(o.snapshot->>'unusedDepositRefundMinor')::integer
  or not exists(select 1 from commerce_private.settlements where intent_id=f.source_intent_id and paid_confirmed
   and not dispute_seen and not reconciliation_required and refunded_minor=0)
  or exists(select 1 from commerce_private.refund_jobs where source_intent_id=f.source_intent_id) then return;end if;
 update commerce_private.deposit_funding set state='applied' where case_id=o.case_id;
 update commerce_private.credit_reservations set state='applied' where id=r.id;
 if r.unused_refund_minor=0 then return;end if;
 select id into decision from commerce_private.refund_decisions where offer_id=o.id and reason='unused_deposit';
 if decision is not null then return;end if;
 insert into commerce_private.refund_decisions(offer_id,service_id,request_key,reason)
 values(o.id,service,o.id,'unused_deposit') returning id into decision;
 perform commerce_private.reserve_refund(decision,f.source_intent_id,r.unused_refund_minor);
 perform audit_private.append_audit_fact(o.tenant_id,'service',service,'service_identity','service',
 'commerce.refund.automatic',o.subject_id,'payment',o.id::text,'operations','sprint-11.7-v1',
 'succeeded','UNUSED_DEPOSIT_REFUND_QUEUED',correlation::text,correlation::text,clock_timestamp(),'{}');
end $$;
revoke all on function commerce_private.queue_unused_deposit(uuid,uuid) from public,anon,authenticated,service_role;
alter function public.apply_pilot_provider_event(uuid,uuid,text,jsonb) rename to apply_pilot_provider_event_before_refunds;
revoke all on function public.apply_pilot_provider_event_before_refunds(uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
create function public.apply_pilot_provider_event(p_service_id uuid,p_tenant_id uuid,p_account text,p_event jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; target uuid;
begin
 result:=public.apply_pilot_provider_event_before_refunds(p_service_id,p_tenant_id,p_account,p_event);
 select intent_id into target from commerce_private.receipt_applications
 where account_id=p_account and event_id=p_event->>'eventId' and outcome='applied';
 if target is not null then perform commerce_private.queue_unused_deposit(target,p_service_id);end if;
 update commerce_private.deposit_funding f set state='uncertain' from commerce_private.settlements s
 where f.source_intent_id=s.intent_id and f.tenant_id=p_tenant_id
 and (s.dispute_seen or s.reconciliation_required or s.refunded_minor>0);
 return result;
end $$;
revoke all on function public.apply_pilot_provider_event(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.apply_pilot_provider_event(uuid,uuid,text,jsonb) to service_role;

-- Automatic execution is separately opt-in, scoped to attributed eligible decisions only.
create function public.service_refund_command(p_service_id uuid,p_tenant_id uuid,p_account text,p_command jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare j commerce_private.refund_jobs; o commerce_private.offers; correlation uuid:=gen_random_uuid();
begin
 if not public.pilot_webhook_ready(p_tenant_id,p_service_id) or
  not exists(select 1 from public.tenants where id=p_tenant_id and status='active') or
  not exists(select 1 from commerce_private.checkout_releases where tenant_id=p_tenant_id
   and provider_account_id=p_account and enabled and expires_at>clock_timestamp()) then
  raise exception using errcode='42501',message='REFUND_SERVICE_REJECTED';end if;
 if p_command is null or jsonb_typeof(p_command)<>'object' or p_command->>'action' is null or
  p_command->>'action' not in ('claim','record') then raise exception using errcode='22023',message='REFUND_COMMAND_INVALID';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_account,0));
 if p_command->>'action'='claim' then
  if (select count(*) from jsonb_object_keys(p_command))<>1 then raise exception using errcode='22023',message='REFUND_COMMAND_INVALID';end if;
  select jobs.* into j from commerce_private.refund_jobs jobs
   join commerce_private.refund_decisions d on d.id=jobs.decision_id
   join commerce_private.offers offers on offers.id=d.offer_id
   join commerce_private.settlements s on s.intent_id=jobs.source_intent_id
   left join commerce_private.refund_evidence e on e.id=d.evidence_id
   where offers.tenant_id=p_tenant_id and jobs.account_id=p_account and jobs.state='queued' and jobs.dispatch_started_at is null
   and s.paid_confirmed and not s.dispute_seen and not s.reconciliation_required
   and (d.reason='unused_deposit' or e.expires_at>clock_timestamp())
   order by d.recorded_at,jobs.id limit 1;
  if j.id is null then return null;end if;
 else
  if (select count(*) from jsonb_object_keys(p_command))<>4 or not(p_command ?& array['refundId','providerId','state'])
   or p_command->>'state' is null or p_command->>'state' not in ('submitted','pending','uncertain','failed')
   or (p_command->>'providerId' is not null and p_command->>'providerId' !~ '^re_[A-Za-z0-9_]{8,120}$') then
   raise exception using errcode='22023',message='REFUND_COMMAND_INVALID';end if;
  select jobs.* into j from commerce_private.refund_jobs jobs join commerce_private.refund_decisions d on d.id=jobs.decision_id
   join commerce_private.offers offers on offers.id=d.offer_id
   where jobs.id=(p_command->>'refundId')::uuid and offers.tenant_id=p_tenant_id and jobs.account_id=p_account;
 end if;
 if j.id is null then raise exception using errcode='42501',message='REFUND_SERVICE_REJECTED';end if;
 select offers.* into o from commerce_private.offers offers join commerce_private.refund_decisions d on d.offer_id=offers.id where d.id=j.decision_id;
 perform 1 from public.operations_cases where id=o.case_id for update;
 select * into j from commerce_private.refund_jobs where id=j.id for update;
 if p_command->>'action'='claim' then
  if j.dispatch_started_at is not null then return null;end if;
  if not exists(select 1 from commerce_private.settlements where intent_id=j.source_intent_id and paid_confirmed
   and not dispute_seen and not reconciliation_required) then return null;end if;
  update commerce_private.refund_jobs set dispatch_started_at=clock_timestamp(),state='uncertain' where id=j.id;
 else
  if j.dispatch_started_at is null then raise exception using errcode='42501',message='REFUND_SERVICE_REJECTED';end if;
  if exists(select 1 from commerce_private.refund_dispatch_facts where job_id=j.id and
   (state is distinct from p_command->>'state' or provider_refund_id is distinct from p_command->>'providerId')) then
   raise exception using errcode='40001',message='REFUND_CONFLICT';end if;
  insert into commerce_private.refund_dispatch_facts(job_id,provider_refund_id,state)
   values(j.id,p_command->>'providerId',p_command->>'state') on conflict do nothing;
  update commerce_private.refund_jobs set state=p_command->>'state',provider_refund_id=p_command->>'providerId' where id=j.id;
 end if;
 perform audit_private.append_audit_fact(o.tenant_id,'service',p_service_id,'service_identity','service',
 'commerce.refund.dispatch',o.subject_id,'payment',j.id::text,'operations','sprint-11.7-v1',
 'succeeded','REFUND_DISPATCH_RECORDED',correlation::text,correlation::text,clock_timestamp(),'{}');
 if not public.pilot_webhook_ready(p_tenant_id,p_service_id) then raise exception using errcode='42501',message='REFUND_SERVICE_REJECTED';end if;
 if p_command->>'action'='record' then return null;end if;
 return jsonb_build_object('refundId',j.id,'accountId',j.account_id,'paymentIntentId',j.payment_intent_id,'amountMinor',j.amount_minor,'currency','zar');
end $$;
revoke all on function public.service_refund_command(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.service_refund_command(uuid,uuid,text,jsonb) to service_role;
