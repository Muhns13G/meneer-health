-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE OR REPLACE FUNCTION intake_private.medical_grant (
  c       jsonb,
  target  uuid,
  purpose text
)
  RETURNS intake_private.access_grants
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare ctx jsonb;i intake_private.intakes;g intake_private.access_grants;begin
 ctx:=intake_private.workforce(c);
 select * into i from intake_private.intakes where id=target and tenant_id=(c->>'tenantId')::uuid;
 if i.id is null or i.restore_quarantined or i.state='deleted' or (i.state='restricted' and purpose<>'medical_rights' and not (purpose='medical_safety' and i.safety_hold))
 or (purpose in('medical_review','medical_safety') and ctx->>'role'<>'clinician')
 or (purpose='medical_transfer' and ctx->>'role' not in('clinician','operations'))
 or (purpose='medical_rights' and ctx->>'role'<>'auditor') then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 if purpose not in('medical_review','medical_safety','medical_transfer','medical_rights') or not exists(select 1 from public.operations_cases o join public.subjects s on s.id=o.subject_id
 where o.id=i.case_id and s.status='active' and (purpose='medical_rights' or o.state not in('cancelled','provider_outcome_recorded'))) then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 if ctx->>'role'='operations' and not exists(select 1 from public.operations_assignments a where a.case_id=i.case_id and a.workforce_subject_id=(c->>'subjectId')::uuid
 and a.starts_at<=clock_timestamp() and a.expires_at>clock_timestamp() and a.revoked_at is null) then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 select * into g from intake_private.access_grants where intake_id=i.id and actor_subject_id=(c->>'subjectId')::uuid and intake_private.access_grants.purpose=medical_grant.purpose
 and snapshot_id=i.snapshot_id and starts_at<=clock_timestamp() and expires_at>clock_timestamp() and revoked_at is null order by starts_at desc,id desc limit 1;
 if g.id is null or (i.state='draft' and i.expires_at<=clock_timestamp() and not i.safety_hold and purpose<>'medical_rights')
 or not exists(select 1 from public.tenant_memberships m where m.tenant_id=i.tenant_id and m.subject_id=g.clinical_approver and m.role='clinician' and m.status='active' and m.expires_at>clock_timestamp())
 or not exists(select 1 from public.tenant_memberships m where m.tenant_id=i.tenant_id and m.subject_id=g.security_approver and m.role='admin' and m.status='active' and m.expires_at>clock_timestamp())
 then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;return g;end $function$;

CREATE OR REPLACE FUNCTION public.claim_medical_safety_notification (
  p_tenant_id uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare claimed intake_private.notifications;episode intake_private.intakes;publication intake_private.publications;recipient uuid;address text;token uuid:=gen_random_uuid();begin
 perform pg_advisory_xact_lock(107,1);
 insert into intake_private.notification_receipts(lease_id,outcome)
 select lease_id,'uncertain' from intake_private.notifications where state='leased' and lease_until<=clock_timestamp() on conflict do nothing;
 update intake_private.notifications set state='uncertain' where state='leased' and lease_until<=clock_timestamp();
 if (select count(*) from audit_private.operations_alert_attempts where recorded_at>=date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC')+
 (select count(*) from intake_private.notification_attempts where recorded_at>=date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC')>=50 then return null;end if;
 insert into intake_private.notifications(intake_id,flag_id,tier)
 select i.id,f.id,'primary' from intake_private.intakes i join public.tenants t on t.id=i.tenant_id and t.status='active'
 join lateral(select * from intake_private.safety_events f where f.intake_id=i.id and f.event='flagged' order by f.recorded_at desc,f.id desc limit 1)f on true
 where i.tenant_id=p_tenant_id and i.safety_hold and i.state<>'deleted' and not i.restore_quarantined on conflict do nothing;
 insert into intake_private.notifications(intake_id,flag_id,tier)
 select n.intake_id,n.flag_id,'fallback' from intake_private.notifications n join intake_private.intakes i on i.id=n.intake_id
 join intake_private.publications p on p.id=i.publication_id where i.tenant_id=p_tenant_id and i.safety_hold and n.tier='primary'
 and (n.state in('failed','uncertain') or n.created_at+make_interval(secs=>p.acknowledgement_seconds)<=clock_timestamp())
 and not exists(select 1 from intake_private.safety_events e where e.intake_id=i.id and e.snapshot_id=i.snapshot_id and e.event='acknowledged' and e.recorded_at>=n.created_at)
 on conflict do nothing;
 select x.* into claimed from intake_private.notifications x join intake_private.intakes i on i.id=x.intake_id join public.tenants t on t.id=i.tenant_id and t.status='active'
 where i.tenant_id=p_tenant_id and i.safety_hold and i.state<>'deleted' and not i.restore_quarantined and x.state='pending' and x.attempt<3 and x.next_attempt_at<=clock_timestamp()
 order by x.created_at,x.id limit 1 for update of x;
 if claimed.id is null then return null;end if;
 select * into episode from intake_private.intakes where id=claimed.intake_id;select * into publication from intake_private.publications where id=episode.publication_id;
 recipient:=case when claimed.tier='primary' then publication.primary_responder else publication.fallback_responder end;
 select c.normalized_value into address from public.subject_contacts c join public.tenant_memberships m on m.subject_id=c.subject_id and m.tenant_id=episode.tenant_id
 where c.subject_id=recipient and c.kind='email' and c.status='verified' and m.role='clinician' and m.status='active' and m.valid_from<=clock_timestamp() and m.expires_at>clock_timestamp()
 and publication.status='published' and publication.expires_at>clock_timestamp() limit 1;
 update intake_private.notifications set state='leased',attempt=attempt+1,lease_id=token,lease_until=clock_timestamp()+interval '2 minutes' where id=claimed.id returning * into claimed;
 insert into intake_private.notification_attempts(lease_id,notification_id,attempt) values(token,claimed.id,claimed.attempt);
 return jsonb_build_object('notificationId',claimed.id,'leaseId',token,'recipient',address);
end $function$;
