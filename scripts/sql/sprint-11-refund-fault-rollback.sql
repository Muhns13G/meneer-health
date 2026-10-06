-- Fixed isolated fixture only. Normalized provider facts below are fault injection, NOT Stripe
-- deliveries. The transaction must roll back before the genuine provider refund is dispatched.
begin;
create temporary table s11_authority as
select jsonb_build_object('p_provider_subject',e.provider_subject,
 'p_provider_session_id',s.provider_session_id,'p_verified_email',c.normalized_value,
 'p_session_id',s.id,'p_subject_id',s.subject_id,'p_tenant_id','e1191000-0000-4000-8000-000000000001') value
from public.identity_sessions s join public.external_identities e on e.subject_id=s.subject_id
join public.subject_contacts c on c.subject_id=s.subject_id and c.kind='email'
where s.subject_id='{{operations}}' and s.assurance='aal2' and s.revoked_at is null
and s.idle_expires_at>clock_timestamp() order by s.issued_at desc limit 1;
create function pg_temp.s11_command(action text,job uuid) returns jsonb language sql as $$
 select public.staff_refund_command((select value from s11_authority),jsonb_build_object(
 'action',action,'offerId','{{offer}}','refundId',job,'requestKey',gen_random_uuid())) $$;
create function pg_temp.s11_refund_event(job uuid,provider_status text,seconds integer) returns jsonb language sql as $$
 select public.apply_pilot_provider_event('e1191000-0000-4000-8000-000000000020',
 'e1191000-0000-4000-8000-000000000001','acct_1U32UbFfj16Nnr1i',jsonb_build_object(
 'eventId','evt_syntheticfault'||replace(gen_random_uuid()::text,'-',''),'fingerprint',repeat('a',64),
 'eventType','refund.updated','intentId',null,'tenantId',null,'sessionId',null,
 'paymentIntentId',j.payment_intent_id,'amountMinor',j.amount_minor,'currency','zar',
 'paymentStatus',null,'refundMinor',null,'chargeId',null,'disputeId',null,'disputeStatus',null,
 'refundId','re_syntheticfault'||replace(j.id::text,'-',''),'refundReference',j.id,'refundStatus',provider_status,
 'occurredAt',clock_timestamp()+seconds*interval '1 second'))
 from commerce_private.refund_jobs j where j.id=job $$;
do $$declare j uuid:='{{job}}';replacement uuid;denied boolean;begin
 if (select count(*) from s11_authority)<>1 or not exists(select 1 from commerce_private.refund_jobs
 where id=j and state='queued' and duplicate_capture_id is not null and amount_minor=99900)
 then raise exception 'FAULT_PACKET_BASELINE_INVALID';end if;
 perform pg_temp.s11_command('dispatch',j);
 if (select state from commerce_private.refund_jobs where id=j)<>'uncertain' then raise exception 'UNCERTAIN_NOT_RESERVED';end if;
 denied:=false;
 begin perform pg_temp.s11_command('retry',j);exception when sqlstate '40001' then
 if sqlerrm<>'REFUND_RECONCILIATION_REQUIRED' then raise;end if;denied:=true;end;
 if not denied then raise exception 'UNCERTAIN_RETRY_ALLOWED';end if;
 perform public.staff_refund_command((select value from s11_authority),jsonb_build_object(
 'action','record','offerId','{{offer}}','refundId',j,
 'providerId','re_syntheticfault'||replace(j::text,'-',''),'state','pending'));
 perform pg_temp.s11_refund_event(j,'pending',0);
 if (select state from commerce_private.refund_jobs where id=j)<>'pending' then raise exception 'PENDING_NOT_HELD';end if;
 denied:=false;
 begin perform pg_temp.s11_command('retry',j);exception when sqlstate '40001' then
 if sqlerrm<>'REFUND_RECONCILIATION_REQUIRED' then raise;end if;denied:=true;end;
 if not denied then raise exception 'PENDING_RETRY_ALLOWED';end if;
 perform pg_temp.s11_refund_event(j,'failed',1);
 if (select state from commerce_private.refund_jobs where id=j)<>'failed_verified' then raise exception 'FAILURE_NOT_VERIFIED';end if;
 perform pg_temp.s11_command('retry',j);
 perform pg_temp.s11_command('retry',j);
 if (select count(*) from commerce_private.refund_retries where source_job=j)<>1 then raise exception 'RETRY_NOT_BOUNDED';end if;
 select replacement_job into replacement from commerce_private.refund_retries where source_job=j;
 perform pg_temp.s11_command('dispatch',replacement);
 perform pg_temp.s11_refund_event(replacement,'succeeded',2);
 if (select state from commerce_private.refund_jobs where id=replacement)<>'confirmed'
 or not commerce_private.deposit_ready('e1191000-0000-4000-8000-000000000010')
 or (select refunded_minor from commerce_private.settlements where intent_id=(select source_intent_id
 from commerce_private.deposit_funding where case_id='e1191000-0000-4000-8000-000000000010'))<>0
 then raise exception 'RETRY_RETAINED_BOUNDARY_FAILED';end if;
end $$;
select true as uncertain_reserved,true as uncertain_retry_denied,true as pending_retry_denied,
 true as verified_failure_required,true as retry_once,true as retained_deposit_unchanged;
rollback;
