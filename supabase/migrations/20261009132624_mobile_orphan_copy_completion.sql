-- TD-066: independently retained dispositions and conservative copy-expiry evidence.
begin;
create table identity_private.mobile_orphan_copy_evidence (
 operation_id uuid primary key references identity_private.mobile_orphan_retirements(id),
 object_key text not null check(object_key ~ '^\d{4}-\d{2}-\d{2}/[a-f0-9-]{36}\.json\.enc$'),
 operation_fingerprint text not null check(operation_fingerprint ~ '^[a-f0-9]{64}$'),
 archive_checksum text not null check(archive_checksum ~ '^[a-f0-9]{64}$'),
 inventory_checksum text not null check(inventory_checksum ~ '^[a-f0-9]{64}$'),
 recorded_at timestamptz not null default clock_timestamp()
);
alter table identity_private.mobile_orphan_copy_evidence enable row level security;
alter table identity_private.mobile_orphan_copy_evidence force row level security;
revoke all on identity_private.mobile_orphan_copy_evidence from public,anon,authenticated,service_role;
create trigger mobile_orphan_copy_evidence_immutable before update or delete
 on identity_private.mobile_orphan_copy_evidence for each row execute function audit_private.reject_append_only_mutation();

create function identity_private.require_mobile_orphan_maintenance_context(p_provider_subject uuid,p_provider_session_id uuid,
 p_verified_email text,p_session_id uuid,p_subject_id uuid,p_tenant_id uuid) returns void
language plpgsql volatile security definer set search_path='' as $$
begin
 perform identity_private.require_mobile_invitation_operator(p_provider_subject,p_provider_session_id,p_verified_email,
  p_session_id,p_subject_id,p_tenant_id);
 if not exists(select 1 from auth.mfa_amr_claims where session_id=p_provider_session_id
  and authentication_method='totp' and updated_at<=clock_timestamp() and updated_at>clock_timestamp()-interval '5 minutes') then
  raise exception using errcode='42501',message='MOBILE_ORPHAN_MAINTENANCE_REJECTED';end if;
end $$;
revoke all on function identity_private.require_mobile_orphan_maintenance_context(uuid,uuid,text,uuid,uuid,uuid) from public,anon,authenticated,service_role;

create function public.read_mobile_orphan_maintenance(p_provider_subject uuid,p_provider_session_id uuid,
 p_verified_email text,p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,p_email_invitation_id uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare op identity_private.mobile_orphan_retirements;
begin
 perform identity_private.require_mobile_orphan_maintenance_context(p_provider_subject,p_provider_session_id,p_verified_email,p_session_id,p_subject_id,p_tenant_id);
 select * into op from identity_private.mobile_orphan_retirements where tenant_id=p_tenant_id and email_invitation_id=p_email_invitation_id;
 if op.id is null then return null;end if;
 return jsonb_build_object('operationId',op.id,'state',op.state,
  'operationFingerprint',encode(sha256(convert_to(to_jsonb(op)::text,'UTF8')),'hex'),
  'manifest',jsonb_build_object('observedAt',clock_timestamp(),'retirements',jsonb_build_array(jsonb_build_object(
   'operationId',op.id,'tenantId',op.tenant_id,'emailInvitationId',op.email_invitation_id,'subjectId',op.subject_id,
   'providerSubjectId',op.provider_subject_id,'contactDigest',op.contact_digest,'providerAbsentAt',op.provider_absent_at))));
end $$;
revoke all on function public.read_mobile_orphan_maintenance(uuid,uuid,text,uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_mobile_orphan_maintenance(uuid,uuid,text,uuid,uuid,uuid,uuid) to service_role;

create function public.complete_mobile_orphan_copy_retirement(p_provider_subject uuid,p_provider_session_id uuid,
 p_verified_email text,p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,p_operation_id uuid,p_evidence jsonb) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare op identity_private.mobile_orphan_retirements; prior identity_private.mobile_orphan_copy_evidence;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text,14103));
 perform identity_private.require_mobile_orphan_maintenance_context(p_provider_subject,p_provider_session_id,p_verified_email,p_session_id,p_subject_id,p_tenant_id);
 select * into op from identity_private.mobile_orphan_retirements where id=p_operation_id and tenant_id=p_tenant_id for update;
 if op.id is null or p_evidence is null or jsonb_typeof(p_evidence)<>'object'
  or (select count(*) from jsonb_object_keys(p_evidence))<>6
  or not(p_evidence ?& array['objectKey','operationFingerprint','archiveChecksum','inventoryChecksum','observedAt','olderObjectCount'])
  or coalesce(p_evidence->>'objectKey','')!~'^\d{4}-\d{2}-\d{2}/[a-f0-9-]{36}\.json\.enc$'
  or coalesce(p_evidence->>'operationFingerprint','')!~'^[a-f0-9]{64}$'
  or coalesce(p_evidence->>'archiveChecksum','')!~'^[a-f0-9]{64}$'
  or coalesce(p_evidence->>'inventoryChecksum','')!~'^[a-f0-9]{64}$'
  or p_evidence->'olderObjectCount' is distinct from '0'::jsonb
  or p_evidence->>'observedAt' is null
  or (p_evidence->>'observedAt')::timestamptz>clock_timestamp()
  or (p_evidence->>'observedAt')::timestamptz<clock_timestamp()-interval '60 seconds' then
  raise exception using errcode='42501',message='MOBILE_ORPHAN_COPY_EVIDENCE_REJECTED';end if;
 select * into prior from identity_private.mobile_orphan_copy_evidence where operation_id=op.id;
 if op.state='completed' then
  if prior.object_key=p_evidence->>'objectKey' and prior.operation_fingerprint=p_evidence->>'operationFingerprint'
   and prior.archive_checksum=p_evidence->>'archiveChecksum' and prior.inventory_checksum=p_evidence->>'inventoryChecksum' then return true;end if;
  raise exception using errcode='PT409',message='MOBILE_ORPHAN_COPY_CONFLICT';end if;
 -- One extra day contains bounded in-flight exports begun before erasure. A real complete,
 -- paginated R2 inventory must additionally show zero objects from that conservative boundary.
 if op.state<>'copies_pending' or op.provider_absent_at+interval '36 days'>clock_timestamp()
  or p_evidence->>'operationFingerprint'<>encode(sha256(convert_to(to_jsonb(op)::text,'UTF8')),'hex')
  or exists(select 1 from auth.users where id=op.provider_subject_id)
  or exists(select 1 from public.subject_contacts where subject_id=op.subject_id)
  or exists(select 1 from public.record_holds where subject_id=op.subject_id and status='active')
  or not exists(select 1 from public.subjects where id=op.subject_id and status='erased') then
  raise exception using errcode='42501',message='MOBILE_ORPHAN_COPY_COMPLETION_NOT_READY';end if;
 insert into identity_private.mobile_orphan_copy_evidence(operation_id,object_key,operation_fingerprint,archive_checksum,inventory_checksum)
  values(op.id,p_evidence->>'objectKey',p_evidence->>'operationFingerprint',p_evidence->>'archiveChecksum',p_evidence->>'inventoryChecksum');
 update identity_private.mobile_orphan_retirements set state='completed' where id=op.id;
 insert into identity_private.mobile_orphan_retirement_events(operation_id,event) values(op.id,'completed');
 return true;
end $$;
revoke all on function public.complete_mobile_orphan_copy_retirement(uuid,uuid,text,uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.complete_mobile_orphan_copy_retirement(uuid,uuid,text,uuid,uuid,uuid,uuid,jsonb) to service_role;
commit;
