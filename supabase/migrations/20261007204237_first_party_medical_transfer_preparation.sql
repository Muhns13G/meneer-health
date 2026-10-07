begin;
create table intake_private.transfer_preparations (
 id uuid primary key default gen_random_uuid(),
 intake_id uuid not null references intake_private.intakes(id),
 snapshot_id uuid not null,
 case_id uuid not null references public.operations_cases(id),
 actor_subject_id uuid not null references public.subjects(id),
 grant_id uuid not null references intake_private.access_grants(id),
 claim_id uuid not null references public.operations_claims(id),
 authorisation_id uuid not null references intake_private.transfer_authorisations(id),
 expected_case_version integer not null check(expected_case_version>0),
 prepared_case_version integer not null check(prepared_case_version=expected_case_version+1),
 command_sha256 text not null check(command_sha256~'^[a-f0-9]{64}$'),
 request_key uuid not null,
 expires_at timestamptz not null,
 recorded_at timestamptz not null default clock_timestamp(),
 unique(intake_id,request_key),
 foreign key(intake_id,snapshot_id) references intake_private.snapshots(intake_id,id),
 check(expires_at>recorded_at)
);
create index transfer_preparations_case_idx on intake_private.transfer_preparations(case_id);
create index transfer_preparations_actor_idx on intake_private.transfer_preparations(actor_subject_id);
create table intake_private.transfer_preparation_receipts (
 transfer_id uuid primary key references intake_private.transfers(id),
 preparation_id uuid not null unique references intake_private.transfer_preparations(id),
 recorded_at timestamptz not null default clock_timestamp()
);
alter table intake_private.transfer_preparations enable row level security;
alter table intake_private.transfer_preparations force row level security;
alter table intake_private.transfer_preparation_receipts enable row level security;
alter table intake_private.transfer_preparation_receipts force row level security;
revoke all on intake_private.transfer_preparations,intake_private.transfer_preparation_receipts
 from public,anon,authenticated,service_role;
create trigger transfer_preparations_append_only before update or delete on intake_private.transfer_preparations
 for each row execute function audit_private.reject_append_only_mutation();
create trigger transfer_preparation_receipts_append_only before update or delete on intake_private.transfer_preparation_receipts
 for each row execute function audit_private.reject_append_only_mutation();

-- Same live guards are checked before preparation and before recording external work.
create function intake_private.transfer_preparation_authority(c jsonb,target uuid,expected_snapshot uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare g intake_private.access_grants;i intake_private.intakes;p intake_private.publications;
 a intake_private.transfer_authorisations;claim public.operations_claims;assignment public.operations_assignments;facts jsonb;
begin
 g:=intake_private.medical_grant(c,target,'medical_transfer');
 select * into i from intake_private.intakes where id=target and tenant_id=(c->>'tenantId')::uuid for update;
 perform 1 from intake_private.access_grants where id=g.id for share;
 g:=intake_private.medical_grant(c,target,'medical_transfer');
 select * into p from intake_private.publications where id=i.publication_id for share;
 facts:=identity_private.operations_readiness(i.case_id);
 if facts is null or not coalesce((facts->>'profileActive')::boolean,false)
 or not coalesce((facts->>'accountActive')::boolean,false) or not coalesce((facts->>'emailVerified')::boolean,false)
 or not coalesce((facts->>'instrumentsCurrent')::boolean,false) then
  raise exception using errcode='42501',message='MEDICAL_PREPARATION_REJECTED';end if;
 if i.state<>'submitted' or i.snapshot_id is distinct from expected_snapshot or i.safety_hold
 or i.lifecycle_hold or i.restore_quarantined or p.status<>'published' or p.effective_at>clock_timestamp()
 or p.expires_at<=clock_timestamp() or p.transfer_notice is null then
  raise exception using errcode='42501',message='MEDICAL_PREPARATION_REJECTED';end if;
 if not intake_private.review_payment_ready(i.id) then
  raise exception using errcode='P0001',message='MEDICAL_PAYMENT_NOT_READY';end if;
 select * into claim from public.operations_claims where case_id=i.case_id
  and workforce_subject_id=(c->>'subjectId')::uuid and released_at is null for share;
 select * into assignment from public.operations_assignments where id=claim.assignment_id
  and tenant_id=i.tenant_id and case_id=i.case_id and subject_id=i.subject_id
  and workforce_subject_id=(c->>'subjectId')::uuid and role='operations' and purpose='operations'
  and revoked_at is null and starts_at<=clock_timestamp() and expires_at>clock_timestamp() for share;
 if claim.id is null or assignment.id is null then
  raise exception using errcode='42501',message='MEDICAL_PREPARATION_REJECTED';end if;
 select * into a from intake_private.transfer_authorisations where intake_id=i.id and snapshot_id=i.snapshot_id
  and publication_id=p.id and recipient_reference=p.recipient_reference and actor_subject_id=i.subject_id
  and notice_hash=encode(extensions.digest(convert_to(p.transfer_notice,'UTF8'),'sha256'),'hex')
  and expires_at>clock_timestamp() order by recorded_at desc,id desc limit 1 for share;
 if a.id is null then raise exception using errcode='42501',message='MEDICAL_PREPARATION_REJECTED';end if;
 perform intake_private.medical_grant(c,target,'medical_transfer');
 return jsonb_build_object('caseId',i.case_id,'grantId',g.id,'claimId',claim.id,'authorisationId',a.id,
  'expiresAt',least(g.expires_at,assignment.expires_at,a.expires_at,p.expires_at,clock_timestamp()+interval '15 minutes'));
end $$;
revoke all on function intake_private.transfer_preparation_authority(jsonb,uuid,uuid)
 from public,anon,authenticated,service_role;

create function public.prepare_medical_transfer(p_context jsonb,p_command jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare authority jsonb;o public.operations_cases;prior intake_private.transfer_preparations;
 result uuid;digest text;
begin
 if p_command is null or jsonb_typeof(p_command)<>'object'
 or not(p_command ?& array['intakeId','snapshotId','caseVersion','requestKey'])
 or (select count(*) from jsonb_object_keys(p_command))<>4
 or jsonb_typeof(p_command->'caseVersion')<>'number'
 or p_command->>'caseVersion'!~'^[1-9][0-9]{0,8}$' then
  raise exception using errcode='22023',message='MEDICAL_PREPARATION_INVALID';end if;
 if (p_command->>'requestKey')::uuid is null then
  raise exception using errcode='22023',message='MEDICAL_PREPARATION_INVALID';end if;
 authority:=intake_private.transfer_preparation_authority(p_context,(p_command->>'intakeId')::uuid,(p_command->>'snapshotId')::uuid);
 select * into o from public.operations_cases where id=(authority->>'caseId')::uuid for update;
 digest:=encode(extensions.digest(convert_to(p_command::text,'UTF8'),'sha256'),'hex');
 select * into prior from intake_private.transfer_preparations where intake_id=(p_command->>'intakeId')::uuid
  and request_key=(p_command->>'requestKey')::uuid;
 if prior.id is not null then
  if prior.actor_subject_id<>(p_context->>'subjectId')::uuid or prior.command_sha256<>digest
  or prior.grant_id<>(authority->>'grantId')::uuid or prior.claim_id<>(authority->>'claimId')::uuid
  or prior.authorisation_id<>(authority->>'authorisationId')::uuid or prior.expires_at<=clock_timestamp()
  or o.state<>'ready_for_handoff' or o.version<>prior.prepared_case_version then
   raise exception using errcode='PT409',message='MEDICAL_PREPARATION_CONFLICT';end if;
  return prior.id;
 end if;
 if o.state<>'onboarding_pending' or o.version<>(p_command->>'caseVersion')::integer then
  raise exception using errcode='PT409',message='MEDICAL_PREPARATION_CONFLICT';end if;
 insert into intake_private.transfer_preparations(intake_id,snapshot_id,case_id,actor_subject_id,grant_id,
  claim_id,authorisation_id,expected_case_version,prepared_case_version,command_sha256,request_key,expires_at)
 values((p_command->>'intakeId')::uuid,(p_command->>'snapshotId')::uuid,o.id,(p_context->>'subjectId')::uuid,
  (authority->>'grantId')::uuid,(authority->>'claimId')::uuid,(authority->>'authorisationId')::uuid,o.version,
  o.version+1,digest,(p_command->>'requestKey')::uuid,(authority->>'expiresAt')::timestamptz) returning id into result;
 update public.operations_cases set state='ready_for_handoff',version=version+1,updated_at=clock_timestamp() where id=o.id;
 perform intake_private.audit(o.tenant_id,o.subject_id,(p_context->>'subjectId')::uuid,'operations','intake.transfer.prepared',
  (p_command->>'intakeId')::uuid);
 perform intake_private.transfer_preparation_authority(p_context,(p_command->>'intakeId')::uuid,(p_command->>'snapshotId')::uuid);
 return result;
end $$;
revoke all on function public.prepare_medical_transfer(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.prepare_medical_transfer(jsonb,jsonb) to service_role;

create function intake_private.assert_transfer_prepared(c jsonb,command jsonb,recorded_transfer uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare authority jsonb;preparation intake_private.transfer_preparations;
begin
 authority:=intake_private.transfer_preparation_authority(c,(command->>'intakeId')::uuid,(command->>'snapshotId')::uuid);
 select * into preparation from intake_private.transfer_preparations where intake_id=(command->>'intakeId')::uuid
  and snapshot_id=(command->>'snapshotId')::uuid and case_id=(authority->>'caseId')::uuid
  and actor_subject_id=(c->>'subjectId')::uuid and grant_id=(authority->>'grantId')::uuid
  and claim_id=(authority->>'claimId')::uuid and authorisation_id=(authority->>'authorisationId')::uuid
  and prepared_case_version=(command->>'caseVersion')::integer and expires_at>clock_timestamp()
 order by recorded_at desc,id desc limit 1 for share;
 if preparation.id is null or (recorded_transfer is null and exists(select 1 from intake_private.transfer_preparation_receipts
  where preparation_id=preparation.id)) or (recorded_transfer is not null and not exists(select 1
  from intake_private.transfer_preparation_receipts where preparation_id=preparation.id and transfer_id=recorded_transfer)) then
  raise exception using errcode='42501',message='MEDICAL_PREPARATION_REQUIRED';end if;
 return preparation.id;
end $$;
revoke all on function intake_private.assert_transfer_prepared(jsonb,jsonb,uuid) from public,anon,authenticated,service_role;

-- Retain existing replay, clinical, authority and payment guards, owner and ACL of the public RPC.
do $$declare function_id oid:='public.record_medical_transfer(jsonb,jsonb)'::regprocedure::oid;
 definition text;old_owner oid;old_acl aclitem[];old_config text[];old_security boolean;
 insert_marker constant text:=' insert into intake_private.transfers(';
 update_marker constant text:=' update public.operations_cases set state=''handed_off''';
 replay_marker constant text:='return prior.id;end if;';
begin
 select pg_get_functiondef(p.oid),p.proowner,p.proacl,p.proconfig,p.prosecdef
 into definition,old_owner,old_acl,old_config,old_security from pg_proc p where p.oid=function_id;
 if (length(definition)-length(replace(definition,insert_marker,'')))/length(insert_marker)<>1
 or (length(definition)-length(replace(definition,update_marker,'')))/length(update_marker)<>1
 or (length(definition)-length(replace(definition,replay_marker,'')))/length(replay_marker)<>1 then
  raise exception 'MEDICAL_PREPARATION_DEFINITION_UNEXPECTED';end if;
 definition:=replace(definition,insert_marker,
  ' perform intake_private.assert_transfer_prepared(p_context,p_command);'||chr(10)||insert_marker);
 definition:=replace(definition,update_marker,
  ' insert into intake_private.transfer_preparation_receipts(transfer_id,preparation_id) values(result,intake_private.assert_transfer_prepared(p_context,p_command));'||chr(10)||update_marker);
 definition:=replace(definition,replay_marker,
  'perform intake_private.assert_transfer_prepared(p_context,p_command,prior.id);'||replay_marker);
 execute definition;
 if exists(select 1 from pg_proc p where p.oid=function_id and (p.proowner<>old_owner or p.proacl is distinct from old_acl
  or p.proconfig is distinct from old_config or p.prosecdef<>old_security)) then
  raise exception 'MEDICAL_PREPARATION_SECURITY_METADATA_CHANGED';end if;
end $$;
commit;
