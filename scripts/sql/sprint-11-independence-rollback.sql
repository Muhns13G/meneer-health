-- Hosted rollback-only fault injection. No real clinical decision or Stripe delivery is claimed.
begin;
create temporary table s11_authority as
select jsonb_build_object('p_provider_subject',e.provider_subject,
 'p_provider_session_id',s.provider_session_id,'p_verified_email',c.normalized_value,
 'p_session_id',s.id,'p_subject_id',s.subject_id,'p_tenant_id','e1191000-0000-4000-8000-000000000001') value
from public.identity_sessions s join public.external_identities e on e.subject_id=s.subject_id
join public.subject_contacts c on c.subject_id=s.subject_id and c.kind='email'
where s.subject_id='{{operations}}' and s.assurance='aal2' and s.revoked_at is null
and s.idle_expires_at>clock_timestamp() order by s.issued_at desc limit 1;
create function pg_temp.s11_protected_fingerprint() returns text language sql as $$
 select md5(string_agg(relation||':'||fingerprint,'|' order by relation)) from (
 select n.nspname||'.'||c.relname relation,(xpath('/row/fingerprint/text()',x))[1]::text fingerprint
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 cross join lateral query_to_xml(format('select md5(coalesce(string_agg(to_jsonb(t)::text,''|'' order by to_jsonb(t)::text),'''')) fingerprint from %s t',c.oid::regclass),false,true,'') x
 where c.relkind='r' and (n.nspname in ('intake_private','fulfilment_private')
 or (n.nspname='public' and (c.relname like '%clinical%' or c.relname like '%protocol%'
 or c.relname in ('operations_cases','fulfilment_cases','case_state_transitions')))
 or (n.nspname='commerce_private' and c.relname='product_release_gates'))) protected $$;
do $$declare reason text;before_hash text;evidence uuid;result jsonb;denied boolean;begin
 if (select count(*) from s11_authority)<>1 or not commerce_private.deposit_ready('e1191000-0000-4000-8000-000000000010')
 then raise exception 'INDEPENDENCE_BASELINE_INVALID';end if;
 foreach reason in array array['unsuitable','failed_handoff'] loop
 begin
  update commerce_private.product_release_gates set
   clinical_approved=case when reason='unsuitable' then false else clinical_approved end,
   stock_confirmed=case when reason='failed_handoff' then false else stock_confirmed end
   where case_id='e1191000-0000-4000-8000-000000000010';
  before_hash:=pg_temp.s11_protected_fingerprint();denied:=false;
  begin
   perform commerce_private.prepare_offer('e1191000-0000-4000-8000-000000000001','{{patient}}',
   'e1191000-0000-4000-8000-000000000010',jsonb_build_object('scenario','approved_product_order',
   'items',jsonb_build_array(jsonb_build_object('priceId','e1191000-0000-4000-8000-000000000013','quantity',1)),
   'deliveryQuoteId','e1191000-0000-4000-8000-000000000014','requestKey',gen_random_uuid()));
  exception when sqlstate '42501' then
   if sqlerrm<>'COMMERCE_NOT_READY' then raise;end if;denied:=true;
  end;
  if not denied then raise exception 'UNAPPROVED_PRODUCT_ALLOWED';end if;
  evidence:=gen_random_uuid();
  insert into commerce_private.refund_evidence values(evidence,'e1191000-0000-4000-8000-000000000010',
   reason,gen_random_uuid(),'{{operations}}',clock_timestamp(),clock_timestamp()+interval '10 minutes');
  result:=public.staff_refund_command((select value from s11_authority),jsonb_build_object('action','review',
   'offerId','{{offer}}','reason',reason,'evidenceId',evidence,'requestKey',gen_random_uuid()));
  if result->>'requestState'<>'queued' or (select sum(j.amount_minor) from commerce_private.refund_jobs j
   join commerce_private.refund_decisions d on d.id=j.decision_id where d.offer_id='{{offer}}')<>99900
   or pg_temp.s11_protected_fingerprint() is distinct from before_hash
   then raise exception 'FINANCIAL_REVIEW_CHANGED_PROTECTED_STATE';end if;
  -- Force this subtransaction to roll back so the second reason starts from the same baseline.
  raise exception 'S11_REASON_ROLLBACK';
 exception when raise_exception then
  if sqlerrm<>'S11_REASON_ROLLBACK' then raise;end if;
 end;
 end loop;
end $$;
select true as clinical_rejection_blocks_product,true as dependency_failure_blocks_product,
 true as evidenced_full_refund_reserved,true as clinical_intake_case_fulfilment_unchanged;
rollback;
