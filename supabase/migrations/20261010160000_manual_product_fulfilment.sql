begin;
create table commerce_private.product_fulfilment_events (
 id uuid primary key default gen_random_uuid(), offer_id uuid not null references commerce_private.issued_product_quotes(offer_id),
 tenant_id uuid not null references public.tenants(id), actor_id uuid not null references public.subjects(id),
 version integer not null check(version>0),
 event text not null check(event in('provider_ordered','pharmacy_released','hub_received','courier_dispatched','delivered','exception','exception_resolved')),
 evidence_reference uuid not null, request_key uuid not null, fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
 recorded_at timestamptz not null default clock_timestamp(),
 unique(offer_id,version), unique(tenant_id,actor_id,request_key)
);
create index product_fulfilment_actor_idx on commerce_private.product_fulfilment_events(actor_id);
alter table commerce_private.product_fulfilment_events enable row level security;
alter table commerce_private.product_fulfilment_events force row level security;
revoke all on commerce_private.product_fulfilment_events from public,anon,authenticated,service_role;
create trigger product_fulfilment_immutable before update or delete on commerce_private.product_fulfilment_events
 for each row execute function audit_private.reject_append_only_mutation();
create trigger mobile_orphan_reference_guard before insert or update on commerce_private.product_fulfilment_events
 for each row execute function identity_private.guard_mobile_orphan_reference('actor_id');

create function commerce_private.product_supply_paid(target uuid) returns boolean
language sql volatile set search_path='' as $$
 select exists(select 1 from commerce_private.offers o
 join commerce_private.order_acceptances a on a.offer_id=o.id
 join commerce_private.checkout_intents ci on ci.offer_id=o.id and ci.acceptance_id=a.id
 join commerce_private.settlements s on s.intent_id=ci.id
 where o.id=target and o.snapshot->>'scenario'='approved_product_order'
 and (s.paid_confirmed and (o.snapshot->>'amountTotalMinor')::integer>0 or
      s.no_additional_payment and (o.snapshot->>'amountTotalMinor')::integer=0)
 and s.refunded_minor=0 and not s.dispute_seen and not s.reconciliation_required
 and not exists(select 1 from commerce_private.cancellation_requests where offer_id=o.id)
 and not exists(select 1 from commerce_private.refund_decisions d where d.offer_id=o.id and d.reason<>'unused_deposit')
 and ((o.snapshot->>'creditMinor')::integer=0 or exists(
  select 1 from commerce_private.deposit_funding f join commerce_private.settlements ds on ds.intent_id=f.source_intent_id
  where f.case_id=o.case_id and f.tenant_id=o.tenant_id and f.subject_id=o.subject_id and f.state='applied'
  and ds.paid_confirmed and not ds.dispute_seen and not ds.reconciliation_required
  and 99900-ds.refunded_minor>=(o.snapshot->>'creditMinor')::integer
  and not exists(select 1 from commerce_private.refund_jobs j join commerce_private.refund_decisions d on d.id=j.decision_id
   where j.source_intent_id=f.source_intent_id and (d.reason<>'unused_deposit' or j.state<>'confirmed')))
  or exists(select 1 from commerce_private.deposit_funding f join public.payment_orders po on po.id=f.source_order_id
   join commerce_private.issued_product_quotes q on q.offer_id=o.id join commerce_private.product_quote_drafts d on d.id=q.draft_id
   join commerce_private.catalogue_versions b on b.id=d.catalogue_id and b.provenance='local-synthetic'
   where f.case_id=o.case_id and f.tenant_id=o.tenant_id and f.subject_id=o.subject_id and f.state='applied'
   and po.environment='local' and po.status='paid' and po.amount_total_minor=99900 and po.refund_state='not_required')))
$$;
revoke all on function commerce_private.product_supply_paid(uuid) from public,anon,authenticated,service_role;

create function commerce_private.product_supply_state(target uuid) returns jsonb
language sql volatile set search_path='' as $$select jsonb_build_object(
 'version',coalesce((select max(version) from commerce_private.product_fulfilment_events where offer_id=target),0),
 'stage',coalesce((select event from commerce_private.product_fulfilment_events where offer_id=target
  and event not in('exception','exception_resolved') order by version desc limit 1),'not_started'),
 'exception',coalesce((select event='exception' from commerce_private.product_fulfilment_events where offer_id=target
  and event in('exception','exception_resolved') order by version desc limit 1),false))$$;
revoke all on function commerce_private.product_supply_state(uuid) from public,anon,authenticated,service_role;

create function public.staff_product_fulfilment(p_context jsonb,p_command jsonb,p_provenance text) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare ctx jsonb; q commerce_private.issued_product_quotes; state jsonb; prior commerce_private.product_fulfilment_events;
 actor uuid; tenant uuid; case_ref uuid; target uuid; key uuid; fp text; next_event text; deadline timestamptz; ready boolean; event text;
begin
 ctx:=intake_private.workforce(p_context); actor:=(ctx->>'subjectId')::uuid;tenant:=(ctx->>'tenantId')::uuid;
 if ctx->>'role'<>'operations' or ctx->>'purpose'<>'operations' or p_provenance is null or p_provenance not in('local-synthetic','precise-wellness-rrp') then
  raise exception using errcode='42501',message='SUPPLY_REJECTED';end if;
 if p_command is null or jsonb_typeof(p_command)<>'object' or p_command->>'action' is null or p_command->>'action' not in('read','record')
  or not(p_command ? 'caseId') then raise exception using errcode='22023',message='SUPPLY_INVALID';end if;
 if p_command->>'action'='read' then
  if p_command-array['action','caseId']<>'{}'::jsonb then raise exception using errcode='22023',message='SUPPLY_INVALID';end if;
 else
  if not(p_command ?& array['action','caseId','offerId','expectedVersion','event','evidenceReference','requestKey'])
   or p_command-array['action','caseId','offerId','expectedVersion','event','evidenceReference','requestKey']<>'{}'::jsonb
   or jsonb_typeof(p_command->'expectedVersion')<>'number'
   or exists(select 1 from jsonb_each(p_command) x where x.key<>'expectedVersion' and jsonb_typeof(x.value)<>'string') then
   raise exception using errcode='22023',message='SUPPLY_INVALID';end if;
 end if;
 case_ref:=(p_command->>'caseId')::uuid;
 perform public.read_operations_queue((p_context->>'providerSubject')::uuid,(p_context->>'providerSessionId')::uuid,
  p_context->>'verifiedEmail',(p_context->>'sessionId')::uuid,actor,tenant,case_ref);
 perform 1 from public.operations_cases where id=case_ref and tenant_id=tenant for update;
 if not found or not exists(select 1 from auth.mfa_amr_claims where session_id=(p_context->>'providerSessionId')::uuid
  and authentication_method='totp' and updated_at<=clock_timestamp() and updated_at>clock_timestamp()-interval '5 minutes') then
  raise exception using errcode='42501',message='SUPPLY_REJECTED';end if;
 select * into q from commerce_private.issued_product_quotes where case_id=case_ref and tenant_id=tenant order by recorded_at desc,offer_id desc limit 1;
 if q.offer_id is not null and not exists(select 1 from commerce_private.product_quote_drafts d join commerce_private.catalogue_versions b on b.id=d.catalogue_id
  where d.id=q.draft_id and b.provenance=p_provenance) then raise exception using errcode='42501',message='SUPPLY_REJECTED';end if;
 target:=q.offer_id;
 perform 1 from commerce_private.offers where id=target for update;
 state:=commerce_private.product_supply_state(target);
 next_event:=case state->>'stage' when 'not_started' then 'provider_ordered' when 'provider_ordered' then 'pharmacy_released'
  when 'pharmacy_released' then 'hub_received' when 'hub_received' then 'courier_dispatched' when 'courier_dispatched' then 'delivered' else null end;
 ready:=target is not null and commerce_private.product_supply_paid(target)
  and commerce_private.product_offer_current(target)
  and not exists(select 1 from intake_private.intakes i where i.case_id=case_ref and (i.safety_hold or i.state in('restricted','deleted')))
  and not exists(select 1 from public.operations_cases c where c.id=case_ref and c.state in('cancelled','handoff_exception'));
 if p_command->>'action'='record' then
  if target is null or target<>(p_command->>'offerId')::uuid then raise exception using errcode='PT409',message='SUPPLY_CONFLICT';end if;
  event:=p_command->>'event'; key:=(p_command->>'requestKey')::uuid;
  if event not in('provider_ordered','pharmacy_released','hub_received','courier_dispatched','delivered','exception','exception_resolved')
   or (p_command->>'evidenceReference')::uuid is null or key is null then raise exception using errcode='22023',message='SUPPLY_INVALID';end if;
  perform pg_advisory_xact_lock(hashtextextended(tenant::text||actor::text||key::text,15107));
  fp:=encode(extensions.digest(p_command::text,'sha256'),'hex');
  select * into prior from commerce_private.product_fulfilment_events where tenant_id=tenant and actor_id=actor and request_key=key;
  if prior.id is not null then
   if prior.offer_id<>target or prior.fingerprint<>fp then raise exception using errcode='PT409',message='SUPPLY_CONFLICT';end if;
  else
   if (state->>'version')::integer<>(p_command->>'expectedVersion')::integer then raise exception using errcode='PT409',message='SUPPLY_CONFLICT';end if;
   if event='exception_resolved' and not (state->>'exception')::boolean or event='exception' and (state->>'exception')::boolean then
    raise exception using errcode='PT409',message='SUPPLY_CONFLICT';end if;
   if event not in('exception','exception_resolved') and (event is distinct from next_event or (state->>'exception')::boolean) then
    raise exception using errcode='PT409',message='SUPPLY_CONFLICT';end if;
   -- Record delivery/exception facts even after authority expires; never advance supply on stale authority.
   if event in('provider_ordered','pharmacy_released','hub_received','courier_dispatched') and not coalesce(ready,false) then
    raise exception using errcode='42501',message='SUPPLY_NOT_READY';end if;
   insert into commerce_private.product_fulfilment_events(offer_id,tenant_id,actor_id,version,event,evidence_reference,request_key,fingerprint)
    values(target,tenant,actor,(state->>'version')::integer+1,event,(p_command->>'evidenceReference')::uuid,key,fp);
   perform audit_private.append_audit_fact(tenant,'workforce',actor,'operations','aal2','product.supply.'||replace(event,'_','.'),q.subject_id,
    'product_order',target::text,'operations','sprint-15.7-v1','succeeded','SUPPLY_FACT_RECORDED',key::text,key::text,clock_timestamp(),'{}');
  end if;
  state:=commerce_private.product_supply_state(target);
  next_event:=case state->>'stage' when 'not_started' then 'provider_ordered' when 'provider_ordered' then 'pharmacy_released'
   when 'pharmacy_released' then 'hub_received' when 'hub_received' then 'courier_dispatched' when 'courier_dispatched' then 'delivered' else null end;
 end if;
 perform intake_private.workforce(p_context);
 perform public.read_operations_queue((p_context->>'providerSubject')::uuid,(p_context->>'providerSessionId')::uuid,p_context->>'verifiedEmail',
  (p_context->>'sessionId')::uuid,actor,tenant,case_ref);
 select least(idle_expires_at,absolute_expires_at,clock_timestamp()+interval '5 minutes',
  (select max(updated_at)+interval '5 minutes' from auth.mfa_amr_claims where session_id=(p_context->>'providerSessionId')::uuid and authentication_method='totp'))
  into deadline from public.identity_sessions where id=(p_context->>'sessionId')::uuid;
 if deadline is null or deadline<=clock_timestamp() then raise exception using errcode='42501',message='SUPPLY_REJECTED';end if;
 return state||jsonb_build_object('caseId',case_ref,'offerId',target,'tenantName',left((select display_name from public.tenants where id=tenant),160),
  'synthetic',p_provenance='local-synthetic','nextEvent',next_event,'canAdvance',next_event is not null and not (state->>'exception')::boolean
  and (next_event='delivered' or coalesce(ready,false)),'expiresAt',deadline);
end $$;
revoke all on function public.staff_product_fulfilment(jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.staff_product_fulfilment(jsonb,jsonb,text) to service_role;

create function public.patient_product_fulfilment(p_context jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$declare target uuid; state jsonb; deadline timestamptz;begin
 perform intake_private.patient_authority(p_context);
 select offer_id into target from commerce_private.issued_product_quotes where tenant_id=(p_context->>'tenantId')::uuid
  and subject_id=(p_context->>'subjectId')::uuid order by recorded_at desc,offer_id desc limit 1;
 state:=commerce_private.product_supply_state(target);
 select least(idle_expires_at,absolute_expires_at,clock_timestamp()+interval '5 minutes') into deadline from public.identity_sessions where id=(p_context->>'sessionId')::uuid;
 perform intake_private.patient_authority(p_context);
 if deadline is null or deadline<=clock_timestamp() then raise exception using errcode='42501',message='PORTAL_REJECTED';end if;
 return jsonb_build_object('progress',case when (state->>'exception')::boolean then 'needs_review' when state->>'stage' in('provider_ordered','pharmacy_released') then 'preparing'
  when state->>'stage'='hub_received' then 'received' when state->>'stage'='courier_dispatched' then 'dispatched' when state->>'stage'='delivered' then 'delivered' else 'not_started' end,'expiresAt',deadline);
end $$;
revoke all on function public.patient_product_fulfilment(jsonb) from public,anon,authenticated;
grant execute on function public.patient_product_fulfilment(jsonb) to service_role;

-- A new draft must not invalidate the exact evidence of an unfinished paid/custody order.
do $$declare definition text;before_security jsonb;after_security jsonb;
 needle text:='current_version:=coalesce(latest.version,0);';begin
 select jsonb_build_object('owner',proowner,'acl',proacl,'config',proconfig,'definer',prosecdef,'volatility',provolatile)
 into before_security from pg_proc where oid='public.staff_product_quote(jsonb,jsonb,text)'::regprocedure;
 definition:=pg_get_functiondef('public.staff_product_quote(jsonb,jsonb,text)'::regprocedure);
 if array_length(string_to_array(definition,needle),1)<>2 then raise exception 'SUPPLY_DRAFT_GUARD_DRIFT';end if;
 execute replace(definition,needle,needle||$n$
 if p_command->>'action'='prepare_draft'
 and not exists(select 1 from commerce_private.product_quote_drafts replay where replay.tenant_id=tenant and replay.actor_id=actor and replay.request_key=(p_command->>'requestKey')::uuid)
 and exists(select 1 from commerce_private.issued_product_quotes old where old.case_id=c.id
  and not exists(select 1 from commerce_private.product_quote_dispositions x where x.offer_id=old.offer_id)
  and (commerce_private.product_supply_paid(old.offer_id) or exists(select 1 from commerce_private.product_fulfilment_events e where e.offer_id=old.offer_id))
  and (commerce_private.product_supply_state(old.offer_id)->>'stage'<>'delivered'
   or (commerce_private.product_supply_state(old.offer_id)->>'exception')::boolean)) then
  raise exception using errcode='PT409',message='SUPPLY_ORDER_ACTIVE';end if;
 $n$);
 select jsonb_build_object('owner',proowner,'acl',proacl,'config',proconfig,'definer',prosecdef,'volatility',provolatile)
 into after_security from pg_proc where oid='public.staff_product_quote(jsonb,jsonb,text)'::regprocedure;
 if before_security is distinct from after_security then raise exception 'SUPPLY_DRAFT_SECURITY_DRIFT';end if;
end $$;

-- Keep pre-release automatic refunds unavailable once actual pharmacy release was recorded.
do $$declare definition text;before_security jsonb;after_security jsonb;
 needle text:=$n$elsif v_reason='product_before_release' then$n$;begin
 select jsonb_build_object('owner',proowner,'acl',proacl,'config',proconfig,'definer',prosecdef,'volatility',provolatile)
 into before_security from pg_proc where oid='public.staff_refund_command_before_reconciliation(jsonb,jsonb)'::regprocedure;
 definition:=pg_get_functiondef('public.staff_refund_command_before_reconciliation(jsonb,jsonb)'::regprocedure);
 if array_length(string_to_array(definition,needle),1)<>2 then raise exception 'SUPPLY_REFUND_GUARD_DRIFT';end if;
 execute replace(definition,needle,needle||$n$
     if exists(select 1 from commerce_private.product_fulfilment_events where offer_id=o.id and event='pharmacy_released') then
      raise exception using errcode='PT409',message='POST_RELEASE_REVIEW_REQUIRED';end if;
 $n$);
 select jsonb_build_object('owner',proowner,'acl',proacl,'config',proconfig,'definer',prosecdef,'volatility',provolatile)
 into after_security from pg_proc where oid='public.staff_refund_command_before_reconciliation(jsonb,jsonb)'::regprocedure;
 if before_security is distinct from after_security then raise exception 'SUPPLY_REFUND_SECURITY_DRIFT';end if;
end $$;
select identity_private.assert_mobile_orphan_guard_coverage();
commit;
