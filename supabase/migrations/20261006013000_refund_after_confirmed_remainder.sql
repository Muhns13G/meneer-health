-- A confirmed automatic remainder must not permanently block an independently approved
-- product-before-release refund. Pending/uncertain remainder and other prior refunds still block.
-- Replace only the retained inner primitive; outer current authority/reconciliation wrappers
-- and immutable money reservations remain unchanged. No data cleanup or permission expansion.
create or replace function public.staff_refund_command_before_reconciliation(p_authority jsonb,p_command jsonb) returns jsonb
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
    on decisions.id=jobs.decision_id where decisions.offer_id=o.id
     and not(coalesce(o.snapshot->>'scenario'='approved_product_order',false)
       and decisions.reason='unused_deposit' and jobs.state='confirmed')) then
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
revoke all on function public.staff_refund_command_before_reconciliation(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.staff_refund_command_before_reconciliation(jsonb,jsonb) to service_role;
