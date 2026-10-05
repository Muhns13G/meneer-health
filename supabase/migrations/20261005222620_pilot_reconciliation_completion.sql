-- Immutable attempt lineage and independently inspected provider outcomes; no activation seed.
create table commerce_private.deposit_retry_approvals (
 offer_id uuid not null references commerce_private.offers(id), actor_id uuid not null references public.subjects(id),
 request_key uuid not null, approved_at timestamptz not null default clock_timestamp(), expires_at timestamptz not null,
 primary key(offer_id,request_key)
);
create index deposit_retry_actor_idx on commerce_private.deposit_retry_approvals(actor_id);
create table commerce_private.deposit_attempt_links (
 previous_offer uuid primary key references commerce_private.offers(id), replacement_offer uuid unique not null references commerce_private.offers(id)
);
create table commerce_private.duplicate_captures (
 id uuid primary key default gen_random_uuid(), exception_id uuid unique not null references commerce_private.provider_exceptions(id),
 intent_id uuid not null references commerce_private.checkout_intents(id), retained_intent_id uuid not null references commerce_private.checkout_intents(id),
 account_id text not null, payment_intent_id text not null, session_id text not null, amount_minor integer not null check(amount_minor>0),
 actor_id uuid not null references public.subjects(id), recorded_at timestamptz not null default clock_timestamp(),
 unique(account_id,payment_intent_id)
);
create index duplicate_capture_intent_idx on commerce_private.duplicate_captures(intent_id);
create index duplicate_retained_intent_idx on commerce_private.duplicate_captures(retained_intent_id);
create index duplicate_actor_idx on commerce_private.duplicate_captures(actor_id);
alter table commerce_private.refund_jobs add column duplicate_capture_id uuid references commerce_private.duplicate_captures(id);
create index refund_duplicate_idx on commerce_private.refund_jobs(duplicate_capture_id);
create table commerce_private.dispute_outcomes (
 account_id text not null, dispute_id text not null, event_id text not null,
 intent_id uuid not null references commerce_private.checkout_intents(id), status text not null check(status in ('won','lost','warning_closed')),
 actor_id uuid not null references public.subjects(id), request_key uuid not null, recorded_at timestamptz not null default clock_timestamp(),
 primary key(account_id,dispute_id,event_id), foreign key(account_id,event_id) references commerce_private.provider_receipts(account_id,event_id)
);
create index dispute_outcome_intent_idx on commerce_private.dispute_outcomes(intent_id);
create index dispute_outcome_actor_idx on commerce_private.dispute_outcomes(actor_id);
create table commerce_private.dispute_owners (
 account_id text not null, dispute_id text not null, actor_id uuid not null references public.subjects(id),
 request_key uuid not null, recorded_at timestamptz not null default clock_timestamp(), primary key(account_id,dispute_id)
);
create index dispute_owner_actor_idx on commerce_private.dispute_owners(actor_id);
do $$declare t text;begin
 foreach t in array array['deposit_retry_approvals','deposit_attempt_links','duplicate_captures','dispute_outcomes','dispute_owners'] loop
 execute format('alter table commerce_private.%I enable row level security',t);
 execute format('alter table commerce_private.%I force row level security',t);
 execute format('revoke all on commerce_private.%I from public,anon,authenticated,service_role',t);
 execute format('create trigger %I before update or delete on commerce_private.%I for each row execute function audit_private.reject_append_only_mutation()',t||'_immutable',t);
 end loop;
end $$;

create function commerce_private.deposit_attempt_retryable(offer uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from commerce_private.offers o join commerce_private.checkout_intents i on i.offer_id=o.id
 join commerce_private.settlements s on s.intent_id=i.id join commerce_private.deposit_retry_approvals a on a.offer_id=o.id
 where o.id=offer and o.snapshot->>'scenario'='review_deposit'
 and (a.expires_at>clock_timestamp() or exists(select 1 from commerce_private.deposit_attempt_links where previous_offer=o.id))
 and not s.paid_confirmed and not s.no_additional_payment and not s.dispute_seen and not s.reconciliation_required
 and (s.expiry_seen or s.failure_seen) and exists(select 1 from commerce_private.terminal_checks tc
 where tc.intent_id=i.id and tc.session_id=i.session_id and (tc.verified_at>clock_timestamp()-interval '15 minutes'
 or exists(select 1 from commerce_private.deposit_attempt_links where previous_offer=o.id)))
 and not exists(select 1 from commerce_private.deposit_funding where case_id=o.case_id)
 and not exists(select 1 from commerce_private.offers other join commerce_private.checkout_intents ci on ci.offer_id=other.id
 join commerce_private.settlements st on st.intent_id=ci.id where other.case_id=o.case_id
 and (st.paid_confirmed or st.dispute_seen or st.reconciliation_required))) $$;
revoke all on function commerce_private.deposit_attempt_retryable(uuid) from public,anon,authenticated,service_role;

create or replace function public.patient_prepare_deposit_offer(p_context jsonb,p_request_key uuid,p_account text)
 returns void language plpgsql security definer set search_path='' as $$declare c uuid;begin
 perform intake_private.patient_authority(p_context);
 perform commerce_private.checkout_release((p_context->>'tenantId')::uuid,p_account);
 if p_request_key is null then raise exception using errcode='22023',message='COMMERCE_INVALID';end if;
 if exists(select 1 from commerce_private.offers where tenant_id=(p_context->>'tenantId')::uuid
  and subject_id=(p_context->>'subjectId')::uuid and expires_at>clock_timestamp()
 and not exists(select 1 from commerce_private.deposit_retry_approvals where offer_id=commerce_private.offers.id)) then return;end if;
 if not exists(select 1 from commerce_private.order_publications where tenant_id=(p_context->>'tenantId')::uuid
  and scenario='review_deposit' and status='published' and effective_at<=clock_timestamp() and expires_at>clock_timestamp()) then
   raise exception using errcode='42501',message='COMMERCE_TERMS_UNAVAILABLE';end if;
 if (select count(*) from intake_private.intakes where tenant_id=(p_context->>'tenantId')::uuid
   and subject_id=(p_context->>'subjectId')::uuid and state='submitted' and not safety_hold)<>1 then
  raise exception using errcode='42501',message='COMMERCE_NOT_READY';end if;
 select case_id into c from intake_private.intakes where tenant_id=(p_context->>'tenantId')::uuid
   and subject_id=(p_context->>'subjectId')::uuid and state='submitted' and not safety_hold;
 perform commerce_private.prepare_offer((p_context->>'tenantId')::uuid,(p_context->>'subjectId')::uuid,c,
   jsonb_build_object('scenario','review_deposit','items','[]'::jsonb,'requestKey',p_request_key));
 perform intake_private.patient_authority(p_context);
end $$;

-- Only normalized signed receipts can nominate a candidate. No arbitrary provider ID input.
create function commerce_private.exception_plan(ref uuid) returns jsonb language plpgsql stable set search_path='' as $$
declare e commerce_private.provider_exceptions; r commerce_private.provider_receipts;
 i commerce_private.checkout_intents; retained commerce_private.checkout_intents; binding text;
begin
 select * into e from commerce_private.provider_exceptions where id=ref;
 if e.id is null or exists(select 1 from commerce_private.exception_resolutions where exception_id=e.id)
 or exists(select 1 from commerce_private.provider_exceptions where account_id=e.account_id and event_id=e.event_id and reason='EVENT_CONFLICT') then return null;end if;
 select * into r from commerce_private.provider_receipts where account_id=e.account_id and event_id=e.event_id;
 select * into i from commerce_private.checkout_intents where id=e.intent_id and tenant_id=r.tenant_boundary and provider_account_id=r.account_id;
 if i.id is null then return null;end if;
 select payment_intent_id into binding from commerce_private.intent_payment_bindings where intent_id=i.id;
 if r.event_type like 'charge.dispute.%' and r.dispute_id is not null then
  select * into r from commerce_private.provider_receipts where account_id=e.account_id and dispute_id=r.dispute_id
   order by occurred_at desc,event_id desc limit 1;
  if r.dispute_status not in ('won','lost','warning_closed') or r.payment_intent_id is distinct from binding or r.currency<>'zar'
   or r.amount_minor<0 or r.amount_minor>(i.payload->>'amountTotalMinor')::integer
   or exists(select 1 from commerce_private.provider_receipts p where p.account_id=r.account_id and p.dispute_id=r.dispute_id
    and p.dispute_status in ('won','lost','warning_closed') and p.dispute_status<>r.dispute_status)
   or exists(select 1 from commerce_private.provider_exceptions where account_id=r.account_id and event_id=r.event_id and reason<>'MONEY_EXCEPTION')
  then return null;end if;
  return jsonb_build_object('kind','dispute','reference',e.id,'eventId',r.event_id,'accountId',r.account_id,
   'disputeId',r.dispute_id,'paymentIntentId',binding,'amountMinor',r.amount_minor,'status',r.dispute_status);
 end if;
 if r.event_type not in ('checkout.session.completed','checkout.session.async_payment_succeeded')
 or r.payment_status is distinct from 'paid' or r.intent_reference is distinct from i.id or r.metadata_tenant is distinct from i.tenant_id
 or r.currency is distinct from 'zar' or r.amount_minor is distinct from (i.payload->>'amountTotalMinor')::integer
 or r.payment_intent_id is null or r.session_id is null then return null;end if;
 select ci.* into retained from commerce_private.checkout_intents ci join commerce_private.offers o on o.id=ci.offer_id
 join commerce_private.settlements st on st.intent_id=ci.id join commerce_private.intent_payment_bindings b on b.intent_id=ci.id
 where o.case_id=(select case_id from commerce_private.offers where id=i.offer_id) and ci.tenant_id=i.tenant_id
 and ci.subject_id=i.subject_id and ci.provider_account_id=i.provider_account_id and st.paid_confirmed and not st.dispute_seen
 and st.refunded_minor=0 and b.payment_intent_id<>r.payment_intent_id
 and ci.payload->>'scenario'=i.payload->>'scenario' and ci.payload->>'amountTotalMinor'=i.payload->>'amountTotalMinor'
 order by case when ci.id=(select source_intent_id from commerce_private.deposit_funding where case_id=o.case_id) then 0 else 1 end,ci.created_at,ci.id limit 1;
 if retained.id is null or exists(select 1 from commerce_private.intent_payment_bindings b
 join commerce_private.checkout_intents other on other.id=b.intent_id join commerce_private.offers o on o.id=other.offer_id
 where b.account_id=r.account_id and b.payment_intent_id=r.payment_intent_id
 and (other.tenant_id<>i.tenant_id or other.subject_id<>i.subject_id or o.case_id<>(select case_id from commerce_private.offers where id=i.offer_id)))
 then return null;end if;
 return jsonb_build_object('kind','duplicate','reference',e.id,'eventId',r.event_id,'accountId',r.account_id,
 'intentId',i.id,'tenantId',i.tenant_id,'sessionId',r.session_id,'paymentIntentId',r.payment_intent_id,
 'retainedPaymentIntentId',(select payment_intent_id from commerce_private.intent_payment_bindings where intent_id=retained.id),'amountMinor',r.amount_minor);
end $$;
revoke all on function commerce_private.exception_plan(uuid) from public,anon,authenticated,service_role;

create function commerce_private.reconcile_exception_outcomes(c uuid) returns void language plpgsql set search_path='' as $$
declare i commerce_private.checkout_intents;
begin
 perform 1 from public.operations_cases where id=c for update;
 -- A duplicate refund clears only its independently proven capture receipts, never the retained payment.
 insert into commerce_private.exception_resolutions(exception_id)
 select e.id from commerce_private.provider_exceptions e join commerce_private.provider_receipts p
 on p.account_id=e.account_id and p.event_id=e.event_id join commerce_private.duplicate_captures d
 on d.account_id=p.account_id and d.payment_intent_id=p.payment_intent_id
 join commerce_private.checkout_intents ci on ci.id=d.intent_id join commerce_private.offers o on o.id=ci.offer_id
 where o.case_id=c and e.reason<>'EVENT_CONFLICT' and
 exists(select 1 from commerce_private.refund_jobs j where j.duplicate_capture_id=d.id and j.state='confirmed' and j.amount_minor=d.amount_minor)
 and ((p.event_type in ('checkout.session.completed','checkout.session.async_payment_succeeded')
  and p.intent_reference=d.intent_id and p.metadata_tenant=ci.tenant_id and p.session_id=d.session_id
  and p.amount_minor=d.amount_minor and p.currency='zar' and p.payment_status='paid')
 or (p.event_type like 'refund.%' and exists(select 1 from commerce_private.refund_provider_facts rf
  join commerce_private.refund_jobs j on j.provider_refund_id=rf.refund_id and j.account_id=rf.account_id
  where rf.account_id=p.account_id and rf.event_id=p.event_id and j.duplicate_capture_id=d.id and j.state='confirmed'
   and rf.payment_intent_id=d.payment_intent_id and rf.amount_minor=d.amount_minor and rf.currency='zar'
   and (rf.job_reference is null or rf.job_reference=j.id))))
 on conflict do nothing;
 -- Terminal provider observations resolve only the exact signed dispute lineage.
 insert into commerce_private.exception_resolutions(exception_id)
 select e.id from commerce_private.provider_exceptions e join commerce_private.provider_receipts p
 on p.account_id=e.account_id and p.event_id=e.event_id join commerce_private.dispute_outcomes d
 on d.account_id=p.account_id and d.dispute_id=p.dispute_id join commerce_private.provider_receipts terminal
 on terminal.account_id=d.account_id and terminal.event_id=d.event_id
 join commerce_private.checkout_intents ci on ci.id=d.intent_id join commerce_private.offers o on o.id=ci.offer_id
 where o.case_id=c and e.reason='MONEY_EXCEPTION' and p.occurred_at<=terminal.occurred_at
 and p.payment_intent_id=terminal.payment_intent_id and p.currency=terminal.currency and p.amount_minor=terminal.amount_minor
 and not exists(select 1 from commerce_private.provider_exceptions conflict where conflict.account_id=d.account_id
  and conflict.event_id=d.event_id and conflict.reason<>'MONEY_EXCEPTION')
 and not exists(select 1 from commerce_private.provider_receipts other where other.account_id=d.account_id
  and other.dispute_id=d.dispute_id and other.dispute_status in ('won','lost','warning_closed') and other.dispute_status<>d.status)
 on conflict do nothing;
 for i in select ci.* from commerce_private.checkout_intents ci join commerce_private.offers o on o.id=ci.offer_id where o.case_id=c loop
  update commerce_private.settlements set dispute_seen=exists(
   select 1 from (select distinct on (p.dispute_id) p.* from commerce_private.provider_receipts p
   join commerce_private.intent_payment_bindings b on b.account_id=p.account_id and b.payment_intent_id=p.payment_intent_id
   where b.intent_id=i.id and p.event_type like 'charge.dispute.%' and p.dispute_id is not null
   order by p.dispute_id,p.occurred_at desc,p.event_id desc) latest
   where latest.dispute_status='lost' or not exists(select 1 from commerce_private.dispute_outcomes d
    where d.account_id=latest.account_id and d.dispute_id=latest.dispute_id and d.event_id=latest.event_id
    and d.status in ('won','warning_closed') and not exists(select 1 from commerce_private.provider_receipts contradiction
      where contradiction.account_id=latest.account_id and contradiction.dispute_id=latest.dispute_id
      and contradiction.dispute_status in ('won','lost','warning_closed') and contradiction.dispute_status<>latest.dispute_status)
    and not exists(select 1 from commerce_private.provider_exceptions e
      where e.account_id=latest.account_id and e.event_id=latest.event_id and e.reason<>'MONEY_EXCEPTION')))
  where intent_id=i.id and exists(select 1 from commerce_private.provider_receipts p
   join commerce_private.intent_payment_bindings b on b.account_id=p.account_id and b.payment_intent_id=p.payment_intent_id
   where b.intent_id=i.id and p.dispute_id is not null);
  update commerce_private.settlements st set reconciliation_required=
   exists(select 1 from commerce_private.provider_exceptions e left join commerce_private.exception_resolutions x on x.exception_id=e.id
    where e.intent_id=i.id and x.exception_id is null)
   or exists(select 1 from commerce_private.refund_jobs where source_intent_id=i.id and state in ('submitted','pending','uncertain','failed'))
   or (st.paid_confirmed and (st.failure_seen or st.expiry_seen) and not exists(select 1 from commerce_private.duplicate_captures d
    where d.intent_id=i.id and d.session_id=i.session_id and exists(select 1 from commerce_private.refund_jobs j where j.duplicate_capture_id=d.id and j.state='confirmed')))
  where st.intent_id=i.id;
 end loop;
 -- Closed won outcomes do not confer clinical authority; restore only unchanged, unconsumed clean funding.
 update commerce_private.deposit_funding f set state=case when exists(select 1 from commerce_private.credit_reservations r
  where r.case_id=c and r.state='reserved') then 'reserved' else 'available' end
 where f.case_id=c and f.state='uncertain' and exists(select 1 from commerce_private.settlements st
 where st.intent_id=f.source_intent_id and st.paid_confirmed and st.refunded_minor=0 and not st.dispute_seen and not st.reconciliation_required)
 and not exists(select 1 from commerce_private.refund_jobs j where j.source_intent_id=f.source_intent_id and j.duplicate_capture_id is null and j.state<>'failed_verified')
 and not exists(select 1 from commerce_private.credit_reservations r where r.case_id=c and r.state='applied');
end $$;
revoke all on function commerce_private.reconcile_exception_outcomes(uuid) from public,anon,authenticated,service_role;

alter function public.staff_refund_command(jsonb,jsonb) rename to staff_refund_command_before_completion;
revoke all on function public.staff_refund_command_before_completion(jsonb,jsonb) from public,anon,authenticated,service_role;
create function public.staff_refund_command(p_authority jsonb,p_command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o commerce_private.offers; e commerce_private.provider_exceptions; p commerce_private.provider_receipts;
 plan jsonb; plans jsonb; key uuid; d commerce_private.duplicate_captures; j commerce_private.refund_jobs;
 decision uuid; job uuid; retained uuid; result jsonb; action text:=p_command->>'action'; correlation uuid:=gen_random_uuid();
begin
 if action not in ('inspect_exceptions','record_exception','replace_deposit','own_dispute','dispatch','record','retry','reconcile') or action is null then
 return public.staff_refund_command_before_completion(p_authority,p_command);end if;
 select * into o from commerce_private.offers where id=(p_command->>'offerId')::uuid and tenant_id=(p_authority->>'p_tenant_id')::uuid;
 if o.id is null then raise exception using errcode='42501',message='REFUND_REJECTED';end if;
 perform commerce_private.refund_staff_authority(p_authority,o.case_id,true);
 if action='inspect_exceptions' then
  if (select count(*) from jsonb_object_keys(p_command))<>2 then raise exception using errcode='22023',message='REFUND_COMMAND_INVALID';end if;
  select coalesce(jsonb_agg(candidate),'[]'::jsonb) into plans from (
   select commerce_private.exception_plan(ex.id) candidate from commerce_private.provider_exceptions ex
   join commerce_private.checkout_intents i on i.id=ex.intent_id join commerce_private.offers scope on scope.id=i.offer_id
   where scope.case_id=o.case_id and not exists(select 1 from commerce_private.exception_resolutions x where x.exception_id=ex.id)
   order by ex.recorded_at,ex.id limit 20) bounded where candidate is not null;
  perform commerce_private.refund_staff_authority(p_authority,o.case_id,true);return plans;
 end if;
 perform pg_advisory_xact_lock(hashtextextended((select provider_account_id from commerce_private.checkout_intents where offer_id=o.id),0));
 perform 1 from public.operations_cases where id=o.case_id for update;
 perform commerce_private.refund_staff_authority(p_authority,o.case_id,true);
 if action='record_exception' then
  if (select count(*) from jsonb_object_keys(p_command))<>6 or not(p_command ?& array['action','offerId','requestKey','reference','kind','eventId']) then
   raise exception using errcode='22023',message='REFUND_COMMAND_INVALID';end if;
  key:=(p_command->>'requestKey')::uuid; plan:=commerce_private.exception_plan((p_command->>'reference')::uuid);
  if plan is null or key is null or plan->>'eventId' is distinct from p_command->>'eventId'
   or plan->>'kind' is distinct from p_command->>'kind' then raise exception using errcode='40001',message='RECONCILIATION_OBSERVATION_STALE';end if;
  select * into e from commerce_private.provider_exceptions where id=(plan->>'reference')::uuid;
  select * into p from commerce_private.provider_receipts where account_id=e.account_id and event_id=plan->>'eventId';
  if not exists(select 1 from commerce_private.checkout_intents i join commerce_private.offers scope on scope.id=i.offer_id
   where i.id=e.intent_id and scope.case_id=o.case_id) then raise exception using errcode='42501',message='REFUND_REJECTED';end if;
  perform commerce_private.checkout_release(o.tenant_id,e.account_id);
  if plan->>'kind'='dispute' then
   insert into commerce_private.dispute_owners values(e.account_id,p.dispute_id,(p_authority->>'p_subject_id')::uuid,key,clock_timestamp()) on conflict do nothing;
   insert into commerce_private.dispute_outcomes(account_id,dispute_id,event_id,intent_id,status,actor_id,request_key)
   values(e.account_id,p.dispute_id,p.event_id,e.intent_id,p.dispute_status,(p_authority->>'p_subject_id')::uuid,key) on conflict do nothing;
  else
   select intent_id into retained from commerce_private.intent_payment_bindings where account_id=e.account_id and payment_intent_id=plan->>'retainedPaymentIntentId';
   insert into commerce_private.duplicate_captures(exception_id,intent_id,retained_intent_id,account_id,payment_intent_id,session_id,amount_minor,actor_id)
   values(e.id,e.intent_id,retained,e.account_id,p.payment_intent_id,p.session_id,p.amount_minor,(p_authority->>'p_subject_id')::uuid)
   on conflict(account_id,payment_intent_id) do nothing;
   select * into d from commerce_private.duplicate_captures where account_id=e.account_id and payment_intent_id=p.payment_intent_id;
   if d.intent_id<>e.intent_id or d.retained_intent_id<>retained or d.amount_minor<>p.amount_minor or d.session_id<>p.session_id then
    raise exception using errcode='40001',message='REFUND_CONFLICT';end if;
   if not exists(select 1 from commerce_private.refund_jobs where duplicate_capture_id=d.id) then
    insert into commerce_private.refund_decisions(offer_id,actor_id,request_key,reason)
    values(o.id,(p_authority->>'p_subject_id')::uuid,d.id,'duplicate_capture') returning id into decision;
    insert into commerce_private.refund_jobs(decision_id,source_intent_id,account_id,payment_intent_id,amount_minor,duplicate_capture_id)
    values(decision,d.intent_id,d.account_id,d.payment_intent_id,d.amount_minor,d.id);
   end if;
  end if;
 elsif action='own_dispute' then
  if (select count(*) from jsonb_object_keys(p_command))<>4 or not(p_command ?& array['action','offerId','reference','requestKey']) then raise exception using errcode='22023',message='REFUND_COMMAND_INVALID';end if;
  key:=(p_command->>'requestKey')::uuid;
  select * into e from commerce_private.provider_exceptions where id=(p_command->>'reference')::uuid;
  select * into p from commerce_private.provider_receipts where account_id=e.account_id and event_id=e.event_id;
  if key is null or p.dispute_id is null or not exists(select 1 from commerce_private.checkout_intents i join commerce_private.offers scope on scope.id=i.offer_id
   where i.id=e.intent_id and scope.case_id=o.case_id and i.tenant_id=o.tenant_id) then raise exception using errcode='42501',message='REFUND_REJECTED';end if;
  insert into commerce_private.dispute_owners values(e.account_id,p.dispute_id,(p_authority->>'p_subject_id')::uuid,key,clock_timestamp()) on conflict do nothing;
 elsif action='replace_deposit' then
  if (select count(*) from jsonb_object_keys(p_command))<>3 or not(p_command ?& array['action','offerId','requestKey']) or (p_command->>'requestKey')::uuid is null
   or o.snapshot->>'scenario'<>'review_deposit' or not exists(select 1 from commerce_private.checkout_intents i join commerce_private.settlements st on st.intent_id=i.id
    where i.offer_id=o.id and not st.paid_confirmed and not st.no_additional_payment and not st.dispute_seen and not st.reconciliation_required
    and (st.expiry_seen or st.failure_seen) and exists(select 1 from commerce_private.terminal_checks tc where tc.intent_id=i.id
     and tc.session_id=i.session_id and tc.verified_at>clock_timestamp()-interval '15 minutes'))
   or exists(select 1 from commerce_private.deposit_funding where case_id=o.case_id)
   or exists(select 1 from commerce_private.deposit_attempt_links where previous_offer=o.id)
   or exists(select 1 from commerce_private.offers scope join commerce_private.checkout_intents i on i.offer_id=scope.id
     left join commerce_private.settlements st on st.intent_id=i.id where scope.case_id=o.case_id and scope.id<>o.id
      and not exists(select 1 from commerce_private.deposit_attempt_links where previous_offer=scope.id)
      and (st.paid_confirmed or st.reconciliation_required or st.dispute_seen or not commerce_private.deposit_attempt_retryable(scope.id))) then
   raise exception using errcode='40001',message='COMMERCE_RECONCILIATION_REQUIRED';end if;
  perform commerce_private.checkout_release(o.tenant_id,(select provider_account_id from commerce_private.checkout_intents where offer_id=o.id));
  insert into commerce_private.deposit_retry_approvals(offer_id,actor_id,request_key,expires_at)
   values(o.id,(p_authority->>'p_subject_id')::uuid,(p_command->>'requestKey')::uuid,clock_timestamp()+interval '15 minutes') on conflict do nothing;
 else
  select jobs.* into j from commerce_private.refund_jobs jobs join commerce_private.refund_decisions decisions on decisions.id=jobs.decision_id
   where jobs.id=(p_command->>'refundId')::uuid and decisions.offer_id=o.id for update of jobs;
  if j.duplicate_capture_id is null then
   result:=public.staff_refund_command_before_completion(p_authority,p_command);
   if action='reconcile' then perform commerce_private.reconcile_exception_outcomes(o.case_id);return commerce_private.refund_view(o.id,(result->>'expiresAt')::timestamptz);end if;
   return result;
  end if;
  perform commerce_private.checkout_release(o.tenant_id,j.account_id);
  select * into d from commerce_private.duplicate_captures where id=j.duplicate_capture_id;
  if action in ('dispatch','retry') and (commerce_private.exception_plan(d.exception_id) is null
   or exists(select 1 from commerce_private.provider_exceptions conflict join commerce_private.refund_provider_facts rf
    on rf.account_id=conflict.account_id and rf.event_id=conflict.event_id
    where conflict.reason in ('EVENT_CONFLICT','BINDING_MISMATCH','AMOUNT_MISMATCH') and rf.account_id=j.account_id
     and (rf.job_reference=j.id or rf.refund_id=j.provider_refund_id))) then
   raise exception using errcode='40001',message='REFUND_RECONCILIATION_REQUIRED';end if;
  if action='dispatch' then
   if (select count(*) from jsonb_object_keys(p_command))<>4 or (p_command->>'requestKey')::uuid is null or j.dispatch_started_at is not null or j.state<>'queued'
    or exists(select 1 from commerce_private.provider_receipts where account_id=j.account_id and payment_intent_id=j.payment_intent_id and dispute_id is not null) then
    raise exception using errcode='40001',message='REFUND_RECONCILIATION_REQUIRED';end if;
   update commerce_private.refund_jobs set state='uncertain',dispatch_started_at=clock_timestamp() where id=j.id;
   result:=jsonb_build_object('refundId',j.id,'accountId',j.account_id,'paymentIntentId',j.payment_intent_id,'amountMinor',j.amount_minor,'currency','zar');
  elsif action='record' then
   if (select count(*) from jsonb_object_keys(p_command))<>5 or j.dispatch_started_at is null or p_command->>'state' is null
    or p_command->>'state' not in ('submitted','pending','uncertain','failed') or (p_command->>'providerId' is not null and p_command->>'providerId' !~ '^re_[A-Za-z0-9_]{8,120}$') then
    raise exception using errcode='22023',message='REFUND_COMMAND_INVALID';end if;
   if exists(select 1 from commerce_private.refund_dispatch_facts f where f.job_id=j.id
    and (f.provider_refund_id is distinct from p_command->>'providerId' or f.state is distinct from p_command->>'state')) then
    raise exception using errcode='40001',message='REFUND_CONFLICT';end if;
   insert into commerce_private.refund_dispatch_facts(job_id,provider_refund_id,state) values(j.id,p_command->>'providerId',p_command->>'state') on conflict do nothing;
   update commerce_private.refund_jobs set provider_refund_id=p_command->>'providerId',state=p_command->>'state' where id=j.id;
  elsif action='retry' then
   if (select count(*) from jsonb_object_keys(p_command))<>4 or (p_command->>'requestKey')::uuid is null or j.state<>'failed_verified' then raise exception using errcode='40001',message='REFUND_RECONCILIATION_REQUIRED';end if;
   if not exists(select 1 from commerce_private.refund_retries where source_job=j.id) then
    insert into commerce_private.refund_decisions(offer_id,actor_id,request_key,reason) values(o.id,(p_authority->>'p_subject_id')::uuid,(p_command->>'requestKey')::uuid,'duplicate_capture') returning id into decision;
    insert into commerce_private.refund_jobs(decision_id,source_intent_id,account_id,payment_intent_id,amount_minor,duplicate_capture_id)
    values(decision,j.source_intent_id,j.account_id,j.payment_intent_id,j.amount_minor,d.id) returning id into job;
    insert into commerce_private.refund_retries values(j.id,job);
   end if;
  else raise exception using errcode='22023',message='REFUND_COMMAND_INVALID';end if;
 end if;
 perform commerce_private.reconcile_exception_outcomes(o.case_id);
 perform audit_private.append_audit_fact(o.tenant_id,'workforce',(p_authority->>'p_subject_id')::uuid,'operations','aal2',
  'commerce.reconciliation.'||replace(action,'_',''),o.subject_id,'payment',o.id::text,'operations','sprint-11.8-v2','succeeded','RECONCILIATION_CHECKED',correlation::text,correlation::text,clock_timestamp(),'{}');
 perform commerce_private.refund_staff_authority(p_authority,o.case_id,true);
 return coalesce(result,commerce_private.refund_view(o.id,least((select idle_expires_at from public.identity_sessions where id=(p_authority->>'p_session_id')::uuid),clock_timestamp()+interval '5 minutes')));
end $$;
revoke all on function public.staff_refund_command(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.staff_refund_command(jsonb,jsonb) to service_role;

alter function public.apply_pilot_provider_event(uuid,uuid,text,jsonb) rename to apply_pilot_provider_event_before_completion;
revoke all on function public.apply_pilot_provider_event_before_completion(uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
create function public.apply_pilot_provider_event(p_service_id uuid,p_tenant_id uuid,p_account text,p_event jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;r record;begin
 result:=public.apply_pilot_provider_event_before_completion(p_service_id,p_tenant_id,p_account,p_event);
 for r in select distinct o.case_id from commerce_private.offers o join commerce_private.checkout_intents i on i.offer_id=o.id
 where i.tenant_id=p_tenant_id and i.provider_account_id=p_account and
 (i.id=(p_event->>'intentId')::uuid or i.id in(select source_intent_id from commerce_private.refund_jobs
 where account_id=p_account and payment_intent_id=p_event->>'paymentIntentId')
 or i.id in(select intent_id from commerce_private.intent_payment_bindings where account_id=p_account and payment_intent_id=p_event->>'paymentIntentId')) loop
  perform commerce_private.reconcile_refunds(p_account,r.case_id);
  perform commerce_private.reconcile_exception_outcomes(r.case_id);
 end loop;
 return result;
end $$;
revoke all on function public.apply_pilot_provider_event(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.apply_pilot_provider_event(uuid,uuid,text,jsonb) to service_role;

create function commerce_private.intent_returned_duplicate(intent uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from commerce_private.duplicate_captures d join commerce_private.checkout_intents i on i.id=d.intent_id
 where d.intent_id=intent and d.retained_intent_id<>intent and d.session_id=i.session_id
 and exists(select 1 from commerce_private.refund_jobs j where j.duplicate_capture_id=d.id and j.state='confirmed' and j.amount_minor=d.amount_minor)) $$;
revoke all on function commerce_private.intent_returned_duplicate(uuid) from public,anon,authenticated,service_role;

alter function commerce_private.refund_view(uuid,timestamptz) rename to refund_view_before_completion;
create function commerce_private.refund_view(offer uuid,deadline timestamptz) returns jsonb language sql stable set search_path='' as $$
 select commerce_private.refund_view_before_completion(offer,deadline)||jsonb_build_object(
 'canReplaceDeposit',exists(select 1 from commerce_private.offers o join commerce_private.checkout_intents i on i.offer_id=o.id
 join commerce_private.settlements s on s.intent_id=i.id where o.id=offer and o.snapshot->>'scenario'='review_deposit'
 and not s.paid_confirmed and not s.no_additional_payment and not s.dispute_seen and not s.reconciliation_required
 and (s.expiry_seen or s.failure_seen) and not exists(select 1 from commerce_private.deposit_retry_approvals a where a.offer_id=o.id and a.expires_at>clock_timestamp())
 and not exists(select 1 from commerce_private.deposit_attempt_links where previous_offer=o.id)),
 'replacementAuthorised',exists(select 1 from commerce_private.deposit_retry_approvals a where a.offer_id=offer
  and (a.expires_at>clock_timestamp() or exists(select 1 from commerce_private.deposit_attempt_links where previous_offer=offer))),
 'disputes',coalesce((select jsonb_agg(jsonb_build_object('reference',e.id,'status',p.dispute_status,
 'owned',exists(select 1 from commerce_private.dispute_owners where account_id=p.account_id and dispute_id=p.dispute_id),
 'reconciled',exists(select 1 from commerce_private.dispute_outcomes where account_id=p.account_id and dispute_id=p.dispute_id and event_id=p.event_id)))
 from (select distinct on (receipt.dispute_id) receipt.* from commerce_private.provider_receipts receipt
 join commerce_private.intent_payment_bindings b on b.account_id=receipt.account_id and b.payment_intent_id=receipt.payment_intent_id
 join commerce_private.checkout_intents i on i.id=b.intent_id where i.offer_id=offer and receipt.dispute_id is not null
 and receipt.event_type like 'charge.dispute.%' order by receipt.dispute_id,receipt.occurred_at desc,receipt.event_id desc limit 20) p
 join commerce_private.provider_exceptions e on e.account_id=p.account_id and e.event_id=p.event_id and e.reason='MONEY_EXCEPTION'),'[]'::jsonb)) $$;
revoke all on function commerce_private.refund_view(uuid,timestamptz) from public,anon,authenticated,service_role;

create or replace function commerce_private.reconcile_receipt(account text,event text) returns text
 language plpgsql security invoker set search_path='' as $$
declare r commerce_private.provider_receipts;i commerce_private.checkout_intents;o commerce_private.offers;
 state commerce_private.settlements;v_reason text;paid boolean:=false;free boolean:=false;binding text;correlation uuid:=gen_random_uuid();
begin
 select * into r from commerce_private.provider_receipts where account_id=account and event_id=event;
 if exists(select 1 from commerce_private.provider_exceptions ex where ex.account_id=account and ex.event_id=event and ex.reason='EVENT_CONFLICT') then
   return 'pending';end if;
 if r.event_type not in ('checkout.session.completed','checkout.session.async_payment_succeeded',
 'checkout.session.async_payment_failed','checkout.session.expired','payment_intent.payment_failed',
 'charge.refunded','charge.dispute.created','charge.dispute.updated','charge.dispute.closed') then
  insert into commerce_private.receipt_applications values(account,event,null,'ignored') on conflict do nothing;return 'ignored';end if;
 select * into i from commerce_private.checkout_intents where provider_account_id=account and
 (id=r.intent_reference or id in(select intent_id from commerce_private.intent_payment_bindings where account_id=account and payment_intent_id=r.payment_intent_id));
 if i.id is null then v_reason:='UNMATCHED';
 else
  select * into o from commerce_private.offers where id=i.offer_id;
  perform 1 from public.operations_cases where id=o.case_id for update;
  select * into i from commerce_private.checkout_intents where id=i.id for update;
  insert into commerce_private.settlements(intent_id) values(i.id) on conflict do nothing;
  select * into state from commerce_private.settlements where intent_id=i.id for update;
  select payment_intent_id into binding from commerce_private.intent_payment_bindings where intent_id=i.id;
  if (r.intent_reference is not null and r.intent_reference<>i.id) or
    (r.metadata_tenant is not null and r.metadata_tenant<>i.tenant_id) or
    (binding is not null and r.payment_intent_id is not null and binding<>r.payment_intent_id) then v_reason:='BINDING_MISMATCH';
  elsif r.event_type like 'checkout.session.%' and i.session_id is null then v_reason:='SESSION_UNATTACHED';
  elsif r.event_type like 'checkout.session.%' and (r.session_id is distinct from i.session_id or r.intent_reference is distinct from i.id
    or r.metadata_tenant is distinct from i.tenant_id) then v_reason:='BINDING_MISMATCH';
  elsif r.event_type not like 'checkout.session.%' and binding is null then v_reason:='SESSION_UNATTACHED';
  elsif r.event_type not like 'checkout.session.%' and r.payment_intent_id is distinct from binding then v_reason:='BINDING_MISMATCH';
  elsif (r.currency is distinct from 'zar' or (r.event_type not like 'charge.dispute.%' and r.amount_minor is distinct from (i.payload->>'amountTotalMinor')::integer)
    or (r.event_type like 'charge.dispute.%' and (r.amount_minor is null or r.amount_minor<0 or r.amount_minor>(i.payload->>'amountTotalMinor')::integer)))
    then v_reason:='AMOUNT_MISMATCH';
  elsif r.refund_minor is not null and (r.refund_minor<0 or r.refund_minor>(i.payload->>'amountTotalMinor')::integer) then v_reason:='AMOUNT_MISMATCH';
  else
   if r.event_type in ('checkout.session.completed','checkout.session.async_payment_succeeded') then
    paid:=r.payment_status='paid' and (i.payload->>'amountTotalMinor')::integer>0 and r.payment_intent_id is not null;
    free:=r.payment_status='no_payment_required' and (i.payload->>'amountTotalMinor')::integer=0 and r.payment_intent_id is null;
    if r.payment_status not in ('paid','unpaid','no_payment_required') or r.payment_status is null or
      (r.payment_status='paid' and not paid) or (r.payment_status='no_payment_required' and not free) then v_reason:='BINDING_MISMATCH';end if;
   end if;
   if v_reason is null and r.payment_intent_id is not null and r.event_type like 'checkout.session.%' then
    if exists(select 1 from commerce_private.intent_payment_bindings where account_id=account and payment_intent_id=r.payment_intent_id and intent_id<>i.id) then
      v_reason:='BINDING_MISMATCH';
    else insert into commerce_private.intent_payment_bindings values(i.id,account,r.payment_intent_id) on conflict do nothing;end if;
   end if;
   if v_reason is null then
    update commerce_private.settlements set
      paid_confirmed=paid_confirmed or paid,no_additional_payment=no_additional_payment or free,
      failure_seen=failure_seen or r.event_type in ('payment_intent.payment_failed','checkout.session.async_payment_failed'),
      expiry_seen=expiry_seen or r.event_type='checkout.session.expired',
      refunded_minor=greatest(refunded_minor,coalesce(r.refund_minor,0)),
      dispute_seen=dispute_seen or r.event_type like 'charge.dispute.%',updated_at=clock_timestamp()
    where intent_id=i.id;
    if r.event_type like 'charge.%' then v_reason:='MONEY_EXCEPTION';
    elsif (paid or free) and extract(epoch from r.occurred_at)>i.provider_expires_epoch then v_reason:='LATE_EVENT';
    elsif (paid or free) and (not exists(select 1 from commerce_private.checkout_releases where tenant_id=i.tenant_id
     and provider_account_id=account and enabled and expires_at>clock_timestamp())
     or not exists(select 1 from public.tenants where id=i.tenant_id and status='active')
     or not exists(select 1 from public.subjects where id=i.subject_id and status='active')
     or not exists(select 1 from commerce_private.order_acceptances a join commerce_private.order_publications p on p.id=a.publication_id
       where a.id=i.acceptance_id and p.status='published' and p.expires_at>clock_timestamp())
     or (i.payload->>'scenario'='approved_product_order' and not exists(select 1 from commerce_private.product_release_gates g
       where g.case_id=o.case_id and g.clinical_approved and g.stock_confirmed and g.pharmacy_authorised and g.address_confirmed
       and g.custody_ready and g.expires_at>clock_timestamp()))
     or not exists(select 1 from public.operations_cases c join intake_private.intakes x on x.case_id=c.id
      where c.id=o.case_id and c.state<>'cancelled' and x.state='submitted' and not x.safety_hold)) then v_reason:='READINESS_CHANGED';
    elsif exists(select 1 from commerce_private.settlements where intent_id=i.id and paid_confirmed and (failure_seen or expiry_seen)) then v_reason:='MONEY_EXCEPTION';end if;
   end if;
  end if;
 end if;
 if v_reason is not null then
  insert into commerce_private.provider_exceptions(account_id,event_id,reason,intent_id) values(account,event,v_reason,i.id) on conflict do nothing;
  if i.id is not null then update commerce_private.settlements set reconciliation_required=true where intent_id=i.id;end if;
 end if;
 insert into commerce_private.receipt_applications values(account,event,i.id,case when v_reason is null then 'applied' else 'pending' end)
 on conflict(account_id,event_id) do update set intent_id=excluded.intent_id,outcome=excluded.outcome;
 return case when v_reason is null then 'applied' else 'pending' end;
end $$;
revoke all on function commerce_private.reconcile_receipt(text,text) from public,anon,authenticated,service_role;

create or replace function commerce_private.funding_current(c uuid,t uuid,s uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from commerce_private.deposit_funding f where f.case_id=c and f.tenant_id=t and f.subject_id=s
 and f.state in ('available','reserved','applied') and (
 (f.source_intent_id is not null and exists(select 1 from commerce_private.checkout_intents i
 join commerce_private.offers o on o.id=i.offer_id join commerce_private.settlements st on st.intent_id=i.id
 where i.id=f.source_intent_id and i.tenant_id=t and i.subject_id=s and o.case_id=c
 and o.snapshot->>'scenario'='review_deposit' and (i.payload->>'amountTotalMinor')::integer=99900 and st.paid_confirmed
 and not st.dispute_seen and not st.reconciliation_required
 and st.refunded_minor=coalesce((select cr.unused_refund_minor from commerce_private.credit_reservations cr where cr.case_id=c and cr.state='applied'),0)
 and not exists(select 1 from commerce_private.refund_jobs j where j.source_intent_id=i.id and j.duplicate_capture_id is null and j.state not in ('confirmed','failed_verified'))
 and not exists(select 1 from commerce_private.refund_jobs j join commerce_private.refund_decisions d on d.id=j.decision_id where j.source_intent_id=i.id and j.duplicate_capture_id is null and j.state='confirmed' and d.reason<>'unused_deposit')))
 or (f.source_intent_id is null and exists(select 1 from public.payment_orders po where po.id=f.source_order_id
 and po.tenant_id=t and po.subject_id=s and po.environment='local' and po.status='paid'
 and po.amount_total_minor=99900 and po.refund_state='not_required' and po.dispute_state='none'))
 )) $$;
 revoke all on function commerce_private.funding_current(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create or replace function commerce_private.deposit_ready(target uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from commerce_private.offers o join commerce_private.checkout_intents i on i.offer_id=o.id
 join commerce_private.settlements s on s.intent_id=i.id join public.operations_cases c on c.id=o.case_id
 join public.tenants t on t.id=c.tenant_id join public.subjects u on u.id=c.subject_id
 where o.case_id=target and o.snapshot->>'scenario'='review_deposit' and (i.payload->>'amountTotalMinor')::integer=99900
 and i.tenant_id=c.tenant_id and i.subject_id=c.subject_id and s.paid_confirmed and s.refunded_minor=0
 and not s.dispute_seen and not s.reconciliation_required and not commerce_private.intent_returned_duplicate(i.id) and c.state<>'cancelled' and t.status='active' and u.status='active'
 and not exists(select 1 from commerce_private.cancellation_requests q where q.offer_id=o.id)
 and not exists(select 1 from commerce_private.refund_jobs j where j.source_intent_id=i.id and j.duplicate_capture_id is null and j.state<>'failed_verified')
 and exists(select 1 from commerce_private.checkout_releases r where r.tenant_id=i.tenant_id and r.provider_account_id=i.provider_account_id and r.enabled and r.expires_at>clock_timestamp())
 and (select count(*) from commerce_private.offers d join commerce_private.checkout_intents ci on ci.offer_id=d.id
 join commerce_private.settlements ds on ds.intent_id=ci.id where d.case_id=target and d.snapshot->>'scenario'='review_deposit' and ds.paid_confirmed and not commerce_private.intent_returned_duplicate(ci.id))=1
 ) $$;
revoke all on function commerce_private.deposit_ready(uuid) from public,anon,authenticated,service_role;

create or replace function commerce_private.prepare_offer(t uuid,s uuid,c uuid,command jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare prior commerce_private.offers; funding commerce_private.deposit_funding;
 q commerce_private.delivery_quotes; p commerce_private.prices;
 k uuid; scenario text; items jsonb; item jsonb; lines jsonb:='[]';
 subtotal bigint:=0; quantity integer; expiry timestamptz:=clock_timestamp()+interval '15 minutes';
 result jsonb; offer_id uuid; first_order boolean; observed timestamptz:=clock_timestamp();
begin
 if exists(select 1 from commerce_private.offers old_offer join commerce_private.deposit_retry_approvals a on a.offer_id=old_offer.id
 where old_offer.case_id=c and old_offer.request_key=(command->>'requestKey')::uuid) then
 raise exception using errcode='40001',message='COMMERCE_RECONCILIATION_REQUIRED';end if;
 if command is null or jsonb_typeof(command)<>'object' or
   exists(select 1 from jsonb_object_keys(command) key where key not in ('scenario','items','deliveryQuoteId','requestKey'))
   or not(command ?& array['scenario','items','requestKey']) then
   raise exception using errcode='22023',message='COMMERCE_SELECTION_INVALID';end if;
 k:=(command->>'requestKey')::uuid;scenario:=command->>'scenario';items:=command->'items';
 if k is null or scenario not in ('review_deposit','approved_product_order') or scenario is null
   or jsonb_typeof(items)<>'array' or items is null or jsonb_array_length(items)>20 then
   raise exception using errcode='22023',message='COMMERCE_SELECTION_INVALID';end if;
 perform 1 from public.operations_cases where id=c and tenant_id=t and subject_id=s and state<>'cancelled' for update;
 if not found or not exists(select 1 from public.tenants where id=t and status='active')
   or not exists(select 1 from public.subjects where id=s and status='active')
   or not exists(select 1 from public.tenant_memberships m where m.tenant_id=t and m.subject_id=s
      and m.role='patient' and m.status='active' and m.valid_from<=observed
      and (m.expires_at is null or m.expires_at>observed))
   or not exists(select 1 from intake_private.intakes i join intake_private.publications pub on pub.id=i.publication_id
    where i.case_id=c and i.tenant_id=t and i.subject_id=s and i.state='submitted'
    and not i.safety_hold and i.snapshot_id is not null and pub.status='published'
    and pub.effective_at<=observed and pub.expires_at>observed) then
   raise exception using errcode='42501',message='COMMERCE_NOT_READY';end if;
 select * into prior from commerce_private.offers where case_id=c and request_key=k;
 if prior.id is not null then
   if prior.tenant_id<>t or prior.subject_id<>s or prior.selection<>command then
    raise exception using errcode='40001',message='COMMERCE_CONFLICT';end if;
   if prior.expires_at<=observed then raise exception using errcode='42501',message='COMMERCE_OFFER_EXPIRED';end if;
   if exists(select 1 from jsonb_array_elements(prior.snapshot->'lines') line
    where not exists(select 1 from commerce_private.prices price where price.id=(line->>'id')::uuid
      and price.status='approved' and price.effective_at<=observed and price.expires_at>observed)) then
    raise exception using errcode='42501',message='COMMERCE_PRICE_UNAVAILABLE';end if;
   if scenario='approved_product_order' and (
    not exists(select 1 from commerce_private.product_release_gates g where g.case_id=c and g.tenant_id=t
      and g.subject_id=s and g.clinical_approved and g.stock_confirmed and g.pharmacy_authorised
      and g.address_confirmed and g.custody_ready and g.expires_at>observed)
    or not exists(select 1 from commerce_private.delivery_quotes dq where dq.id=(command->>'deliveryQuoteId')::uuid
      and dq.case_id=c and dq.tenant_id=t and dq.subject_id=s and dq.status='approved' and dq.expires_at>observed)
    or not commerce_private.funding_current(c,t,s)) then
    raise exception using errcode='42501',message='COMMERCE_NOT_READY';end if;
   if scenario='review_deposit' and exists(select 1 from commerce_private.deposit_attempt_links where replacement_offer=prior.id)
    and exists(select 1 from commerce_private.offers other join commerce_private.checkout_intents ci on ci.offer_id=other.id
     join commerce_private.settlements st on st.intent_id=ci.id where other.case_id=c and other.id<>prior.id
      and not commerce_private.intent_returned_duplicate(ci.id)
      and (st.paid_confirmed or st.no_additional_payment or st.dispute_seen or st.reconciliation_required)) then
    raise exception using errcode='42501',message='COMMERCE_NOT_READY';end if;
   return prior.snapshot||jsonb_build_object('offerId',prior.id,'replayed',true);
 end if;
 if scenario='review_deposit' then
   if jsonb_array_length(items)<>0 or command ? 'deliveryQuoteId'
     or exists(select 1 from commerce_private.deposit_funding where case_id=c)
     or exists(select 1 from commerce_private.offers where case_id=c and snapshot->>'scenario'='review_deposit' and not commerce_private.deposit_attempt_retryable(id)) then
    raise exception using errcode='42501',message='COMMERCE_NOT_READY';end if;
   if (select count(*) from commerce_private.prices where kind='review_deposit' and status='approved'
      and effective_at<=observed and expires_at>observed)<>1 then
    raise exception using errcode='42501',message='COMMERCE_PRICE_UNAVAILABLE';end if;
   select * into p from commerce_private.prices where kind='review_deposit' and status='approved'
      and effective_at<=observed and expires_at>observed for share;
   expiry:=least(expiry,p.expires_at);
   result:=jsonb_build_object('scenario',scenario,'amountTotalMinor',99900,'currency','zar',
    'creditMinor',0,'unusedDepositRefundMinor',0,'noAdditionalPayment',false,
    'policyVersion','pilot-commerce-policy-v1','lines',jsonb_build_array(to_jsonb(p)));
 else
   if jsonb_array_length(items)=0 or not(command ? 'deliveryQuoteId') then
    raise exception using errcode='22023',message='COMMERCE_SELECTION_INVALID';end if;
   -- Existing independent clinical/address/stock/pharmacy gates; custody remains a separate
   -- prerequisite and is deny-default until a verified commercial readiness record exists.
   if not exists(select 1 from commerce_private.product_release_gates g where g.case_id=c and g.tenant_id=t
      and g.subject_id=s and g.clinical_approved and g.stock_confirmed and g.pharmacy_authorised
      and g.address_confirmed and g.custody_ready and g.expires_at>observed) then
    raise exception using errcode='42501',message='COMMERCE_NOT_READY';end if;
   select * into funding from commerce_private.deposit_funding where case_id=c and tenant_id=t and subject_id=s for update;
   if funding.case_id is null or funding.state not in ('available','applied') then
    raise exception using errcode='42501',message='COMMERCE_DEPOSIT_UNAVAILABLE';end if;
   if not commerce_private.funding_current(c,t,s) then
    raise exception using errcode='42501',message='COMMERCE_DEPOSIT_UNAVAILABLE';end if;
   first_order:=funding.state='available';
   if not first_order and not exists(select 1 from commerce_private.credit_reservations
     where case_id=c and state='applied') then
    raise exception using errcode='42501',message='COMMERCE_DEPOSIT_UNAVAILABLE';end if;
   if exists(select 1 from commerce_private.credit_reservations where case_id=c and state='reserved') then
    raise exception using errcode='40001',message='COMMERCE_CREDIT_RESERVED';end if;
   select * into q from commerce_private.delivery_quotes where id=(command->>'deliveryQuoteId')::uuid
     and tenant_id=t and subject_id=s and case_id=c and status='approved'
     and effective_at<=observed and expires_at>observed for share;
   if q.id is null then raise exception using errcode='42501',message='COMMERCE_DELIVERY_UNAVAILABLE';end if;
   expiry:=least(expiry,q.expires_at);
   if (select count(distinct x->>'priceId') from jsonb_array_elements(items) x)<>jsonb_array_length(items) then
    raise exception using errcode='22023',message='COMMERCE_SELECTION_INVALID';end if;
   for item in select value from jsonb_array_elements(items) order by value->>'priceId' loop
    if jsonb_typeof(item)<>'object' or (select count(*) from jsonb_object_keys(item))<>2
      or not(item ?& array['priceId','quantity']) or (item->>'quantity') !~ '^[1-9][0-9]*$' then
     raise exception using errcode='22023',message='COMMERCE_SELECTION_INVALID';end if;
    quantity:=(item->>'quantity')::integer;
    if quantity>10 then raise exception using errcode='22023',message='COMMERCE_SELECTION_INVALID';end if;
    select * into p from commerce_private.prices where id=(item->>'priceId')::uuid and kind='product'
      and status='approved' and effective_at<=observed and expires_at>observed for share;
    if p.id is null then raise exception using errcode='42501',message='COMMERCE_PRICE_UNAVAILABLE';end if;
    subtotal:=subtotal+p.unit_amount_minor::bigint*quantity;expiry:=least(expiry,p.expires_at);
    lines:=lines||jsonb_build_array(to_jsonb(p)||jsonb_build_object('quantity',quantity));
   end loop;
   result:=commerce_private.calculate(subtotal,q.amount_minor,first_order)||jsonb_build_object(
    'scenario',scenario,'currency','zar','lines',lines,'deliveryQuote',to_jsonb(q));
 end if;
 insert into commerce_private.offers(tenant_id,subject_id,case_id,request_key,selection,snapshot,expires_at)
 values(t,s,c,k,command,result,expiry) returning id into offer_id;
 if scenario='approved_product_order' and first_order then
  insert into commerce_private.credit_reservations(case_id,offer_id,credit_minor,unused_refund_minor,state)
    values(c,offer_id,(result->>'creditMinor')::integer,(result->>'unusedDepositRefundMinor')::integer,'reserved');
  update commerce_private.deposit_funding set state='reserved' where case_id=c;
 end if;
 if scenario='review_deposit' then
  insert into commerce_private.deposit_attempt_links(previous_offer,replacement_offer)
  select o.id,offer_id from commerce_private.offers o where o.case_id=c and o.id<>offer_id and o.snapshot->>'scenario'='review_deposit'
   and not exists(select 1 from commerce_private.deposit_attempt_links where previous_offer=o.id)
   and commerce_private.deposit_attempt_retryable(o.id) order by o.created_at desc limit 1;
 end if;
 return result||jsonb_build_object('offerId',offer_id,'replayed',false);
end $$;

create or replace function commerce_private.reserve_refund(decision uuid,source uuid,amount integer) returns void
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
 select coalesce(sum(amount_minor),0) into reserved from commerce_private.refund_jobs where source_intent_id=source and duplicate_capture_id is null and state not in ('confirmed','failed_verified');
 if capture is null or amount<0 or refunded+reserved+amount>capture then
 raise exception using errcode='40001',message='REFUND_ALLOCATION_CONFLICT';end if;
 insert into commerce_private.refund_jobs(decision_id,source_intent_id,amount_minor,account_id,payment_intent_id)
 values(decision,source,amount,account,payment);
 update commerce_private.deposit_funding set state='uncertain' where source_intent_id=source;
end $$;
revoke all on function commerce_private.reserve_refund(uuid,uuid,integer) from public,anon,authenticated,service_role;


create or replace function commerce_private.reconcile_refunds(account text,case_scope uuid) returns void
language plpgsql set search_path='' as $$
declare j commerce_private.refund_jobs; latest commerce_private.refund_provider_facts; total bigint;
 target uuid; offer uuid;
begin
 perform 1 from public.operations_cases where id=case_scope for update;
 for j in select jobs.* from commerce_private.refund_jobs jobs join commerce_private.refund_decisions d on d.id=jobs.decision_id
 join commerce_private.offers o on o.id=d.offer_id where jobs.account_id=account and o.case_id=case_scope loop
  select f.* into latest from commerce_private.refund_provider_facts f
  join commerce_private.provider_receipts r on r.account_id=f.account_id and r.event_id=f.event_id
  join commerce_private.checkout_intents i on i.id=j.source_intent_id and i.tenant_id=r.tenant_boundary
  where f.account_id=account and (f.job_reference=j.id or f.refund_id=j.provider_refund_id)
   and f.payment_intent_id=j.payment_intent_id and f.amount_minor=j.amount_minor and f.currency='zar'
   and j.dispatch_started_at is not null
   and (j.provider_refund_id is null or f.refund_id=j.provider_refund_id)
   and not exists(select 1 from commerce_private.provider_exceptions e where e.account_id=account
     and e.event_id=f.event_id and e.reason='EVENT_CONFLICT')
  order by f.occurred_at desc,f.event_id desc limit 1;
  if latest.event_id is null then continue;end if;
  if j.state='failed_verified' and latest.status not in ('failed','canceled') then
   insert into commerce_private.provider_exceptions(account_id,event_id,reason,intent_id)
   values(account,latest.event_id,'EVENT_CONFLICT',j.source_intent_id) on conflict do nothing;
   continue;
  end if;
  -- A contradictory terminal fact remains an exception; never retry after known success.
  if j.state='confirmed' and latest.status<>'succeeded' then
   if latest.status in ('pending','requires_action') then continue;end if;
   insert into commerce_private.provider_exceptions(account_id,event_id,reason,intent_id)
   values(account,latest.event_id,'EVENT_CONFLICT',j.source_intent_id) on conflict do nothing;
   update commerce_private.settlements set reconciliation_required=true where intent_id=j.source_intent_id;
   continue;
  end if;
  if exists(select 1 from commerce_private.refund_provider_facts f where f.account_id=account
   and (f.job_reference=j.id or f.refund_id=latest.refund_id)
   and (f.refund_id<>latest.refund_id or f.payment_intent_id<>j.payment_intent_id or f.amount_minor<>j.amount_minor or f.currency<>'zar')) then
   insert into commerce_private.provider_exceptions(account_id,event_id,reason,intent_id)
   values(account,latest.event_id,'BINDING_MISMATCH',j.source_intent_id) on conflict do nothing;
   update commerce_private.settlements set reconciliation_required=true where intent_id=j.source_intent_id;
   continue;
  end if;
  update commerce_private.refund_jobs set provider_refund_id=latest.refund_id,
   state=case latest.status when 'succeeded' then 'confirmed' when 'failed' then 'failed_verified'
    when 'canceled' then 'failed_verified' else 'pending' end where id=j.id;
  update commerce_private.receipt_applications set intent_id=j.source_intent_id,outcome='applied'
   where account_id=account and event_id=latest.event_id;
 end loop;
 -- Job-specific successes are deduplicated by provider ID, not added to cumulative charge refunds.
 for target in select distinct jobs.source_intent_id from commerce_private.refund_jobs jobs
 join commerce_private.refund_decisions d on d.id=jobs.decision_id join commerce_private.offers o on o.id=d.offer_id
 where jobs.account_id=account and o.case_id=case_scope loop
  select coalesce(sum(amount_minor),0) into total from commerce_private.refund_jobs
   where source_intent_id=target and duplicate_capture_id is null and state='confirmed';
  if total>(select (payload->>'amountTotalMinor')::integer from commerce_private.checkout_intents where id=target) then
   update commerce_private.settlements set reconciliation_required=true where intent_id=target;
  else update commerce_private.settlements set refunded_minor=greatest(refunded_minor,total::integer) where intent_id=target;end if;
 end loop;
end $$;
revoke all on function commerce_private.reconcile_refunds(text,uuid) from public,anon,authenticated,service_role;
-- Duplicate refunds are separate captures, never refunds of retained deposit funding.
create or replace function commerce_private.reconcile_case(target uuid) returns void
language plpgsql set search_path='' as $$
declare i commerce_private.checkout_intents; r record; total integer;
begin
 perform 1 from public.operations_cases where id=target for update;
 for i in select ci.* from commerce_private.checkout_intents ci join commerce_private.offers o on o.id=ci.offer_id
 where o.case_id=target order by case when o.snapshot->>'scenario'='review_deposit' then 0 else 1 end,ci.id loop
  for r in select a.event_id from commerce_private.receipt_applications a join commerce_private.provider_receipts p
   on p.account_id=a.account_id and p.event_id=a.event_id
   where a.account_id=i.provider_account_id and a.outcome='pending'
    and (p.intent_reference=i.id or p.payment_intent_id in(select payment_intent_id from commerce_private.intent_payment_bindings where intent_id=i.id))
    and p.event_type not like 'refund.%' order by p.occurred_at,a.event_id limit 100 loop
   perform commerce_private.reconcile_receipt(i.provider_account_id,r.event_id);
  end loop;
  -- Preserve exception history; resolve only demonstrably harmless/re-correlated evidence.
  insert into commerce_private.exception_resolutions(exception_id)
  select e.id from commerce_private.provider_exceptions e join commerce_private.receipt_applications a
   on a.account_id=e.account_id and a.event_id=e.event_id
   where (e.intent_id=i.id or a.intent_id=i.id) and e.reason in ('UNMATCHED','SESSION_UNATTACHED')
    and a.outcome='applied' on conflict do nothing;
  insert into commerce_private.exception_resolutions(exception_id)
  select e.id from commerce_private.provider_exceptions e
  where e.intent_id=i.id and e.reason='MONEY_EXCEPTION' and exists(select 1 from commerce_private.provider_receipts p
   where p.account_id=e.account_id and p.event_id=e.event_id and p.event_type='charge.refunded'
   and p.refund_minor=(select coalesce(sum(amount_minor),0) from commerce_private.refund_jobs where source_intent_id=i.id and duplicate_capture_id is null and state='confirmed'))
   on conflict do nothing;
  update commerce_private.settlements s set reconciliation_required=
   exists(select 1 from commerce_private.provider_exceptions e left join commerce_private.exception_resolutions x on x.exception_id=e.id
    where e.intent_id=i.id and x.exception_id is null)
   or exists(select 1 from commerce_private.refund_jobs where source_intent_id=i.id and state in ('submitted','pending','uncertain','failed'))
   or (s.paid_confirmed and (s.failure_seen or s.expiry_seen))
  where s.intent_id=i.id;
  -- Re-correlated receipts must also rebuild the funding/unused-refund effects, not just money.
  for r in select p.service_id from commerce_private.provider_receipts p
   join commerce_private.receipt_applications a on a.account_id=p.account_id and a.event_id=p.event_id
   where a.intent_id=i.id and a.outcome='applied' and p.account_id=i.provider_account_id
    and p.tenant_boundary=i.tenant_id and p.event_type in ('checkout.session.completed','checkout.session.async_payment_succeeded')
    and public.pilot_webhook_ready(i.tenant_id,p.service_id)
   order by p.occurred_at desc,p.event_id desc limit 1 loop
   perform commerce_private.queue_unused_deposit(i.id,r.service_id);
  end loop;
  -- Unpaid terminal evidence releases an unconsumed credit, never a paid/ambiguous source.
  if exists(select 1 from commerce_private.settlements where intent_id=i.id and not paid_confirmed
    and not no_additional_payment and (expiry_seen or failure_seen) and not reconciliation_required and not dispute_seen)
   and exists(select 1 from commerce_private.terminal_checks tc where tc.intent_id=i.id and tc.session_id=i.session_id
     and tc.verified_at>clock_timestamp()-interval '15 minutes'
     and (tc.status='expired' or exists(select 1 from commerce_private.provider_receipts p
       where p.intent_reference=i.id and p.event_type='checkout.session.async_payment_failed')))
   and exists(select 1 from commerce_private.credit_reservations where offer_id=i.offer_id and state='reserved') then
   update commerce_private.credit_reservations set state='released' where offer_id=i.offer_id and state='reserved';
   update commerce_private.deposit_funding set state='available' where case_id=target and state='reserved';
  end if;
 end loop;
 -- Refund-specific terminal evidence alone releases job reservations; funding stays quarantined
 -- except for exactly the approved unused remainder of a completed credited order.
 update commerce_private.deposit_funding f set state='applied' where f.case_id=target and f.source_intent_id is not null
  and exists(select 1 from commerce_private.credit_reservations c where c.case_id=target and c.state='applied'
   and c.unused_refund_minor=(select refunded_minor from commerce_private.settlements where intent_id=f.source_intent_id))
  and not exists(select 1 from commerce_private.refund_jobs j join commerce_private.refund_decisions d on d.id=j.decision_id
   where j.source_intent_id=f.source_intent_id and j.duplicate_capture_id is null and (j.state<>'confirmed' or d.reason<>'unused_deposit'))
  and exists(select 1 from commerce_private.settlements where intent_id=f.source_intent_id and not dispute_seen and not reconciliation_required);
end $$;
revoke all on function commerce_private.reconcile_case(uuid) from public,anon,authenticated,service_role;
