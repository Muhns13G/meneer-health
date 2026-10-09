-- TD-065: a restored pending approval is not fresh medical authority.
begin;
alter table intake_private.intakes add column restore_authority_cutoff timestamptz;
update intake_private.intakes set restore_authority_cutoff=clock_timestamp()
 where restore_quarantined;
alter table intake_private.intakes add constraint intake_restore_cutoff_required
 check(not restore_quarantined or restore_authority_cutoff is not null);

create function intake_private.preserve_restore_authority_cutoff() returns trigger
language plpgsql set search_path='' as $$
begin
 if old.restore_authority_cutoff is not null and
  (new.restore_authority_cutoff is null or new.restore_authority_cutoff<old.restore_authority_cutoff)
 then raise exception using errcode='55000',message='MEDICAL_RESTORE_CUTOFF_IMMUTABLE';end if;
 return new;
end $$;
revoke all on function intake_private.preserve_restore_authority_cutoff()
 from public,anon,authenticated,service_role;
create trigger intake_restore_cutoff_guard before update on intake_private.intakes
 for each row execute function intake_private.preserve_restore_authority_cutoff();

create or replace function intake_private.quarantine_restored_medical_intakes() returns bigint
language plpgsql set search_path='' as $$
declare total bigint;
begin
 -- Intake row locks serialize quarantine with both approval and activation wrappers below.
 update intake_private.intakes set restore_quarantined=true,
  restore_authority_cutoff=clock_timestamp();
 get diagnostics total=row_count;
 update intake_private.access_grants set revoked_at=clock_timestamp() where revoked_at is null;
 return total;
end $$;
revoke all on function intake_private.quarantine_restored_medical_intakes()
 from public,anon,authenticated,service_role;

alter function public.approve_medical_grant(jsonb,jsonb)
 rename to approve_medical_grant_before_restore_epoch;
revoke all on function public.approve_medical_grant_before_restore_epoch(jsonb,jsonb)
 from public,anon,authenticated,service_role;
create function public.approve_medical_grant(p_context jsonb,p_command jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare target intake_private.intakes;
begin
 select * into target from intake_private.intakes
  where id=(p_command->>'intakeId')::uuid and tenant_id=(p_context->>'tenantId')::uuid for update;
 if target.id is null or target.restore_quarantined or target.state='deleted'
 then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 return public.approve_medical_grant_before_restore_epoch(p_context,p_command);
end $$;
revoke all on function public.approve_medical_grant(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.approve_medical_grant(jsonb,jsonb) to service_role;

alter function public.activate_medical_grant(jsonb,uuid)
 rename to activate_medical_grant_before_restore_epoch;
revoke all on function public.activate_medical_grant_before_restore_epoch(jsonb,uuid)
 from public,anon,authenticated,service_role;
create function public.activate_medical_grant(p_context jsonb,p_approval_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare target intake_private.intakes; approval intake_private.grant_approvals;
begin
 select * into approval from intake_private.grant_approvals where id=p_approval_id;
 select * into target from intake_private.intakes
  where id=approval.intake_id and tenant_id=(p_context->>'tenantId')::uuid for update;
 if target.id is null or target.restore_quarantined or target.state='deleted'
  or (target.restore_authority_cutoff is not null and approval.recorded_at<=target.restore_authority_cutoff)
 then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 return public.activate_medical_grant_before_restore_epoch(p_context,p_approval_id);
end $$;
revoke all on function public.activate_medical_grant(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.activate_medical_grant(jsonb,uuid) to service_role;
commit;
