-- Explicitly authorised audit-only hosted rehearsal; never run automatically or as a migration.
-- No Auth identity, transport, payment, clinical approval or configuration change.
-- Rollback removes every fixture without disabling immutable triggers. Audit sequence gaps
-- are expected: PostgreSQL nextval is not transactional; never reset the shared sequence.
begin;
set local statement_timeout = '45s';
set local lock_timeout = '5s';

do $$
declare
  tenant uuid := 'e1370000-0000-4000-8000-000000000001';
  subject uuid := 'e1370000-0000-4000-8000-000000000002';
  workflow uuid := 'e1370000-0000-4000-8000-000000000003';
  service uuid := 'e1370000-0000-4000-8000-000000000004';
  result jsonb;
  inbox jsonb;
  prior_head text;
  blocked boolean := false;
begin
  if exists(select 1 from public.tenants where id = tenant)
    or exists(select 1 from public.subjects where id = subject)
    or exists(select 1 from public.workflow_instances where id = workflow)
    or exists(select 1 from public.service_identities where id = service)
  then raise exception 'EVIDENCE_FIXTURE_COLLISION'; end if;

  insert into public.tenants(id,slug,display_name,status)
    values(tenant,'synthetic-audit-13-7','Synthetic audit-only rehearsal','suspended');
  insert into public.subjects(id) values(subject);
  insert into public.workflow_instances(id,tenant_id,subject_id) values(workflow,tenant,subject);
  insert into public.service_identities(id,tenant_id,name,environment,purpose,expires_at)
    values(service,tenant,'synthetic-audit-13-7','preview','operations',now()+interval '1 hour');

  -- A cancellation request changes no financial/clinical state and invokes no transport.
  result := public.execute_audited_workflow_transition(
    tenant,workflow,'workflow.transition','synthetic-13-7-command','synthetic-13-7-key',
    repeat('a',64),0,'cancellation.request',now(),'patient',subject,'patient','aal1',
    subject,'operations','synthetic.v1','synthetic-13-7-chain','synthetic-13-7-command');
  if result->>'version' <> '1' or (result->>'replayed')::boolean then
    raise exception 'EVIDENCE_COMMAND_FAILED'; end if;

  result := public.execute_audited_workflow_transition(
    tenant,workflow,'workflow.transition','synthetic-13-7-command','synthetic-13-7-key',
    repeat('a',64),0,'cancellation.request',now(),'patient',subject,'patient','aal1',
    subject,'operations','synthetic.v1','synthetic-13-7-chain','synthetic-13-7-command');
  if not (result->>'replayed')::boolean then raise exception 'EVIDENCE_REPLAY_FAILED'; end if;

  inbox := public.record_integration_inbox(tenant,'synthetic_audit','preview',
    'synthetic-13-7-response',repeat('b',64),'synthetic-13-7-chain',service,now(),'{}');
  result := public.record_integration_inbox(tenant,'synthetic_audit','preview',
    'synthetic-13-7-response',repeat('b',64),'synthetic-13-7-chain',service,now(),'{}');
  if not (result->>'replayed')::boolean then raise exception 'EVIDENCE_INBOX_REPLAY_FAILED'; end if;

  perform audit_private.append_audit_fact(tenant,'system',subject,'system','system',
    'audit.reconcile',subject,'workflow',workflow::text,'operations','synthetic.v1',
    'succeeded','CHAIN_VERIFIED','synthetic-13-7-chain','synthetic-13-7-response',now(),
    '{"chainVerified":true,"reviewEventCount":2}'::jsonb);

  if (select count(*) from public.audit_events where tenant_id=tenant) <> 3
    or not audit_private.verify_audit_chain(tenant)
    or (select count(*) from public.command_receipts where tenant_id=tenant and
      aggregate_id=workflow and status='committed' and response_body->>'version'='1') <> 1
    or (select count(*) from public.integration_outbox where tenant_id=tenant and
      aggregate_id=workflow and aggregate_version=1 and correlation_id='synthetic-13-7-chain') <> 1
    or (select count(*) from public.integration_inbox where tenant_id=tenant and
      id::text=inbox->>'inboxId' and status='verified' and correlation_id='synthetic-13-7-chain') <> 1
    or (select count(*) from public.audit_events where tenant_id=tenant and
      correlation_id='synthetic-13-7-chain') <> 3
  then raise exception 'EVIDENCE_CROSS_RECORD_FAILED'; end if;

  -- Append-only enforcement: caught subtransaction must leave the original fact unchanged.
  begin
    update public.audit_events set reason_code='SYNTHETIC_TAMPER' where tenant_id=tenant;
  exception when others then blocked := true;
  end;
  if not blocked or not audit_private.verify_audit_chain(tenant) then
    raise exception 'EVIDENCE_IMMUTABILITY_FAILED'; end if;

  -- Head corruption detection uses only the isolated fixture and is immediately reversed.
  select last_hash into prior_head from public.audit_chain_heads where tenant_id=tenant;
  update public.audit_chain_heads set last_hash=repeat('0',64) where tenant_id=tenant;
  if audit_private.verify_audit_chain(tenant) then raise exception 'EVIDENCE_TAMPER_NOT_DETECTED'; end if;
  update public.audit_chain_heads set last_hash=prior_head where tenant_id=tenant;
  if not audit_private.verify_audit_chain(tenant) then raise exception 'EVIDENCE_CHAIN_NOT_RESTORED'; end if;
end;
$$;

select 'synthetic-audit-only' as exercise,
  audit_private.verify_audit_chain('e1370000-0000-4000-8000-000000000001') as nonempty_chain_verified,
  (select count(*) from public.audit_events where tenant_id='e1370000-0000-4000-8000-000000000001') as facts,
  true as command_receipt_outbox_inbox_response_linked,
  true as replay_deduplicated,
  true as append_only_enforced,
  true as head_tamper_detected;
rollback;
