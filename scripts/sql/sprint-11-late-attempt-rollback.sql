-- An expired Stripe Checkout cannot actually be paid. This normalized adversarial late receipt
-- tests the deployed database boundary; it is NOT a second real provider capture.
begin;
do $$declare old_offer uuid:=gen_random_uuid();acceptance uuid:=gen_random_uuid();intent uuid:=gen_random_uuid();
 event text:='evt_syntheticlate'||replace(gen_random_uuid()::text,'-','');payment text:='pi_syntheticlate'||replace(gen_random_uuid()::text,'-','');
begin
 if not commerce_private.deposit_ready('e1191000-0000-4000-8000-000000000010') then raise exception 'LATE_BASELINE_INVALID';end if;
 insert into commerce_private.offers(id,tenant_id,subject_id,case_id,request_key,selection,snapshot,expires_at)
 select old_offer,tenant_id,subject_id,case_id,gen_random_uuid(),selection,snapshot,expires_at
 from commerce_private.offers where id='{{offer}}';
 insert into commerce_private.order_acceptances(id,offer_id,publication_id,subject_id,tenant_id,session_id,content_hash,snapshot_hash,request_key,assurance)
 select acceptance,old_offer,publication_id,subject_id,tenant_id,session_id,content_hash,snapshot_hash,gen_random_uuid(),assurance
 from commerce_private.order_acceptances where offer_id='{{offer}}';
 insert into commerce_private.checkout_intents(id,offer_id,tenant_id,subject_id,acceptance_id,provider_account_id,request_key,payload,creation_deadline,provider_expires_epoch,state,session_id,checkout_url)
 select intent,old_offer,tenant_id,subject_id,acceptance,provider_account_id,gen_random_uuid(),payload,
 creation_deadline,provider_expires_epoch,'open','cs_test_syntheticlate'||replace(intent::text,'-',''),'https://checkout.stripe.com/c/pay/synthetic'
 from commerce_private.checkout_intents where offer_id='{{offer}}';
 insert into commerce_private.intent_payment_bindings values(intent,'acct_1U32UbFfj16Nnr1i',payment);
 insert into commerce_private.settlements(intent_id,expiry_seen) values(intent,true);
 insert into commerce_private.deposit_attempt_links values(old_offer,'{{offer}}');
 perform public.apply_pilot_provider_event('e1191000-0000-4000-8000-000000000020',
 'e1191000-0000-4000-8000-000000000001','acct_1U32UbFfj16Nnr1i',jsonb_build_object(
 'eventId',event,'fingerprint',repeat('b',64),'eventType','checkout.session.completed','intentId',intent,
 'tenantId','e1191000-0000-4000-8000-000000000001','sessionId','cs_test_syntheticlate'||replace(intent::text,'-',''),
 'paymentIntentId',payment,'amountMinor',99900,'currency','zar','paymentStatus','paid',
 'refundMinor',null,'chargeId',null,'disputeId',null,'disputeStatus',null,'occurredAt',clock_timestamp()));
 if commerce_private.deposit_ready('e1191000-0000-4000-8000-000000000010')
 or not exists(select 1 from commerce_private.provider_exceptions where event_id=event)
 or (select count(*) from commerce_private.deposit_funding where case_id='e1191000-0000-4000-8000-000000000010')<>1
 or exists(select 1 from public.fulfilment_cases where tenant_id='e1191000-0000-4000-8000-000000000001')
 then raise exception 'LATE_CAPTURE_NOT_QUARANTINED';end if;
end $$;
select true as retired_original_quarantined,true as funding_once,true as no_supply;
rollback;
