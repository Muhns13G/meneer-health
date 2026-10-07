-- Task 2.10.7: reference-only audit and durable alert intent. No outbound delivery activation.
create table audit_private.operations_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  audit_fact_id uuid not null references public.audit_events(id),
  code text not null check (code in ('ASSIGNMENT_CHANGED','HANDOFF_UNCERTAIN',
    'OPERATIONS_EXCEPTION','ACKNOWLEDGEMENT_OVERDUE','ACCESS_DENIED','OVERRIDE_DENIED')),
  owner text not null check(owner in ('security','technology-operations')),
  severity text not null check(severity in ('warning','critical')),
  deduplication_key text not null,
  recorded_at timestamptz not null default clock_timestamp(),
  unique(tenant_id,deduplication_key)
);
alter table audit_private.operations_alerts enable row level security;
alter table audit_private.operations_alerts force row level security;
create index operations_alert_review_idx on audit_private.operations_alerts(tenant_id,recorded_at desc,id desc);
create index operations_alert_fact_idx on audit_private.operations_alerts(audit_fact_id);
revoke all on audit_private.operations_alerts from public,anon,authenticated,service_role;
create trigger operations_alerts_append_only before update or delete on audit_private.operations_alerts
for each row execute function audit_private.reject_append_only_mutation();

create function audit_private.operations_event_audit() returns trigger
language plpgsql security definer set search_path='' as $$
declare fact public.audit_events; event_name text; actor uuid; resource uuid; subject uuid;
  actor_type text := 'workforce'; actor_role text := 'operations'; assurance text := 'aal2';
begin
  if tg_table_name='operations_events' then
    event_name:=replace(new.event,'_','.'); actor:=new.actor_subject_id;
    resource:=new.case_id; subject:=new.subject_id;
  elsif tg_table_name='operations_assignments' then
    if tg_op='UPDATE' and new.revoked_at is not distinct from old.revoked_at then return new; end if;
    event_name:=case when tg_op='INSERT' then 'assignment.granted' else 'assignment.revoked' end;
    actor:=new.granted_by_subject_id; resource:=new.case_id; subject:=new.subject_id;
    -- The grantor is a persisted attribution, not evidence of a current privileged session.
    actor_type:='system'; actor_role:='assignment_journal'; assurance:='system';
  else
    event_name:=replace(new.kind,'_','.'); actor:=new.actor_subject_id;
    resource:=new.reference_id; subject:=null;
    if new.kind='portal_link_issued' then
      actor_type:='patient'; actor_role:='patient'; assurance:='aal1';
    elsif new.kind='destination_approved' then actor_role:='admin'; end if;
  end if;
  fact:=audit_private.append_audit_fact(new.tenant_id,actor_type,actor,actor_role,assurance,
    'operations.'||event_name,subject,'operations',resource::text,'operations','sprint-10.7-v1',
    'succeeded','OPERATIONS_FACT_RECORDED',new.id::text,new.id::text,clock_timestamp(),'{}');
  if tg_table_name='operations_assignments' then
    insert into audit_private.operations_alerts(tenant_id,audit_fact_id,code,owner,severity,deduplication_key)
    values(new.tenant_id,fact.id,'ASSIGNMENT_CHANGED','security','warning',new.id::text||':'||event_name);
  elsif tg_table_name='operations_events' and event_name='exception.recorded' then
    insert into audit_private.operations_alerts(tenant_id,audit_fact_id,code,owner,severity,deduplication_key)
    values(new.tenant_id,fact.id,'OPERATIONS_EXCEPTION','technology-operations','warning',new.id::text);
  end if;
  return new;
end;
$$;
revoke all on function audit_private.operations_event_audit() from public,anon,authenticated,service_role;
create trigger operations_events_central_audit after insert on public.operations_events
for each row execute function audit_private.operations_event_audit();
create trigger operations_assignments_central_audit after insert or update on public.operations_assignments
for each row execute function audit_private.operations_event_audit();
create trigger handoff_boundary_central_audit after insert on identity_private.handoff_boundary_events
for each row execute function audit_private.operations_event_audit();

alter function public.read_operations_queue(uuid,uuid,text,uuid,uuid,uuid,uuid,text,timestamptz,uuid)
rename to read_operations_queue_before_audit;
alter function public.read_operations_queue_before_audit(uuid,uuid,text,uuid,uuid,uuid,uuid,text,timestamptz,uuid)
set schema identity_private;
revoke all on function identity_private.read_operations_queue_before_audit(uuid,uuid,text,uuid,uuid,uuid,uuid,text,timestamptz,uuid)
from public,anon,authenticated,service_role;
create function public.read_operations_queue(
  p_provider_subject uuid,p_provider_session_id uuid,p_verified_email text,
  p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,p_case_id uuid default null,
  p_state text default null,p_after_created_at timestamptz default null,p_after_id uuid default null
) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb; correlation uuid := gen_random_uuid();
begin
  result:=identity_private.read_operations_queue_before_audit(p_provider_subject,p_provider_session_id,
    p_verified_email,p_session_id,p_subject_id,p_tenant_id,p_case_id,p_state,p_after_created_at,p_after_id);
  perform audit_private.append_audit_fact(p_tenant_id,'workforce',p_subject_id,'operations','aal2',
    case when p_case_id is null then 'operations.queue.read' else 'operations.case.read' end,
    null,'operations',coalesce(p_case_id,p_subject_id)::text,'operations','sprint-10.7-v1',
    'succeeded','ASSIGNED_ACCESS',correlation::text,correlation::text,clock_timestamp(),'{}');
  if not identity_private.handoff_workforce_deadline(p_session_id,p_provider_session_id,p_subject_id,p_tenant_id,'operations') then
    raise exception using errcode='42501',message='QUEUE_REJECTED';
  end if;
  return result;
end;
$$;
revoke all on function public.read_operations_queue(uuid,uuid,text,uuid,uuid,uuid,uuid,text,timestamptz,uuid)
from public,anon,authenticated;
grant execute on function public.read_operations_queue(uuid,uuid,text,uuid,uuid,uuid,uuid,text,timestamptz,uuid) to service_role;

-- A bounded, retry-safe service sweep. The caller explicitly selects the approved review interval;
-- this is not a clinical SLA. Never marks delivery, acknowledgement or resolution automatically.
create function public.sweep_operations_alerts(p_tenant_id uuid,p_overdue_hours integer)
returns integer language plpgsql volatile security definer set search_path='' as $$
declare item record; fact public.audit_events; alert_code text; total integer:=0;
begin
  if p_tenant_id is null or p_overdue_hours is null or p_overdue_hours not between 1 and 168 then
    raise exception using errcode='22023',message='OPERATIONS_ALERT_INPUT_INVALID';
  end if;
  -- Tenant first, then attempts in UUID order: serialize duplicate sweep generation.
  perform 1 from public.tenants where id=p_tenant_id for update;
  for item in select h.* from public.handoff_attempts h where h.tenant_id=p_tenant_id and
    (h.state='uncertain' or (h.state='delivered' and h.delivered_at<=clock_timestamp()-make_interval(hours=>p_overdue_hours)
      and not exists(select 1 from public.handoff_acknowledgements a where a.attempt_id=h.id)))
    and not exists(select 1 from audit_private.operations_alerts a where a.tenant_id=p_tenant_id
      and a.deduplication_key=h.id::text||':'||case when h.state='uncertain' then 'HANDOFF_UNCERTAIN' else 'ACKNOWLEDGEMENT_OVERDUE' end)
    order by h.id limit 100
  loop
    alert_code:=case when item.state='uncertain' then 'HANDOFF_UNCERTAIN' else 'ACKNOWLEDGEMENT_OVERDUE' end;
    if not exists(select 1 from audit_private.operations_alerts where tenant_id=p_tenant_id and deduplication_key=item.id::text||':'||alert_code) then
      fact:=audit_private.append_audit_fact(p_tenant_id,'system',item.workforce_subject_id,'alert_sweep','system',
        'operations.alert.raised',item.subject_id,'operations',item.case_id::text,'operations','sprint-10.7-v1',
        'succeeded',alert_code,item.id::text,item.id::text,clock_timestamp(),'{}');
      insert into audit_private.operations_alerts(tenant_id,audit_fact_id,code,owner,severity,deduplication_key)
      values(p_tenant_id,fact.id,alert_code,'technology-operations','warning',item.id::text||':'||alert_code);
      total:=total+1;
    end if;
  end loop;
  return total;
end;
$$;
revoke all on function public.sweep_operations_alerts(uuid,integer) from public,anon,authenticated;
grant execute on function public.sweep_operations_alerts(uuid,integer) to service_role;

-- Security evidence feeds the same durable alert queue, without modifying its authorisation contract.
create function audit_private.operations_denial_alert() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.action in ('authorisation.denied','breakglass.denied') and new.resource_type='operations' then
    insert into audit_private.operations_alerts(tenant_id,audit_fact_id,code,owner,severity,deduplication_key)
    values(new.tenant_id,new.id,case when new.action='breakglass.denied' then 'OVERRIDE_DENIED' else 'ACCESS_DENIED' end,
      'security','critical',new.id::text);
  end if;
  return new;
end;
$$;
revoke all on function audit_private.operations_denial_alert() from public,anon,authenticated,service_role;
create trigger operations_denial_alert after insert on public.audit_events
for each row execute function audit_private.operations_denial_alert();

-- Called after a failed queue transaction: the failure's audit must not roll back with it.
-- No attempted case id is accepted; the denied caller cannot create facts about another client.
create function public.record_operations_denial(
  p_provider_subject uuid,p_provider_session_id uuid,p_verified_email text,
  p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,p_reason_code text
) returns uuid language plpgsql volatile security definer set search_path='' as $$
declare ctx jsonb; fact public.audit_events; correlation uuid:=gen_random_uuid();
begin
  ctx:=public.resolve_workforce_context(p_provider_subject,p_provider_session_id,p_verified_email,
    p_session_id,p_subject_id,p_tenant_id);
  if p_subject_id is null or p_tenant_id is null or not identity_private.handoff_workforce_deadline(
    p_session_id,p_provider_session_id,p_subject_id,p_tenant_id,ctx->>'role') then
    raise exception using errcode='42501',message='OPERATIONS_DENIAL_REJECTED';
  end if;
  if p_reason_code is null or p_reason_code not in ('QUEUE_REJECTED','QUEUE_CONFLICT','QUEUE_NOT_READY','BREAK_GLASS_DISABLED') then
    raise exception using errcode='22023',message='OPERATIONS_DENIAL_INVALID';
  end if;
  fact:=audit_private.append_audit_fact(p_tenant_id,'workforce',p_subject_id,ctx->>'role','aal2',
    case when p_reason_code='BREAK_GLASS_DISABLED' then 'breakglass.denied' else 'authorisation.denied' end,
    null,'operations',p_subject_id::text,ctx->>'purpose','sprint-10.7-v1','denied',p_reason_code,
    correlation::text,correlation::text,clock_timestamp(),'{}');
  if not identity_private.handoff_workforce_deadline(p_session_id,p_provider_session_id,p_subject_id,p_tenant_id,ctx->>'role') then
    raise exception using errcode='42501',message='OPERATIONS_DENIAL_REJECTED';
  end if;
  return fact.id;
end;
$$;
revoke all on function public.record_operations_denial(uuid,uuid,text,uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.record_operations_denial(uuid,uuid,text,uuid,uuid,uuid,text) to service_role;

-- Human review is separately authorised and never inferred from alert creation or delivery.
create function public.read_operations_alerts(
  p_provider_subject uuid,p_provider_session_id uuid,p_verified_email text,
  p_session_id uuid,p_subject_id uuid,p_tenant_id uuid
) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare ctx jsonb; result jsonb; correlation uuid:=gen_random_uuid();
begin
  ctx:=public.resolve_workforce_context(p_provider_subject,p_provider_session_id,p_verified_email,
    p_session_id,p_subject_id,p_tenant_id);
  if ctx->>'role'<>'admin' or ctx->>'purpose'<>'security_administration' then
    raise exception using errcode='42501',message='OPERATIONS_ALERT_REJECTED';
  end if;
  if p_subject_id is null or p_tenant_id is null or not identity_private.handoff_workforce_deadline(
    p_session_id,p_provider_session_id,p_subject_id,p_tenant_id,'admin') then
    raise exception using errcode='42501',message='OPERATIONS_ALERT_REJECTED';
  end if;
  select coalesce(jsonb_agg(to_jsonb(item)),'[]') into result from (
    select a.id,a.code,a.owner,a.severity,a.recorded_at,
      coalesce(d.state,'pending') as delivery,
      exists(select 1 from audit_private.operations_alert_responses r where r.alert_id=a.id and r.action='acknowledged') as acknowledged,
      exists(select 1 from audit_private.operations_alert_responses r where r.alert_id=a.id and r.action='resolved') as resolved
    from audit_private.operations_alerts a left join audit_private.operations_alert_dispatch d on d.alert_id=a.id
    where a.tenant_id=p_tenant_id order by a.recorded_at desc,a.id desc limit 100
  ) item;
  perform audit_private.append_audit_fact(p_tenant_id,'workforce',p_subject_id,'admin','aal2',
    'operations.alert.read',null,'operations',p_subject_id::text,'security_administration','sprint-10.7-v1',
    'succeeded','ALERT_REVIEW_RECORDED',correlation::text,correlation::text,clock_timestamp(),'{}');
  if not identity_private.handoff_workforce_deadline(p_session_id,p_provider_session_id,p_subject_id,p_tenant_id,'admin') then
    raise exception using errcode='42501',message='OPERATIONS_ALERT_REJECTED';
  end if;
  return result;
end;
$$;
revoke all on function public.read_operations_alerts(uuid,uuid,text,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_operations_alerts(uuid,uuid,text,uuid,uuid,uuid) to service_role;

-- Mutable transport cursor; all attempts and human responses remain separately append-only.
create table audit_private.operations_alert_dispatch (
  alert_id uuid primary key references audit_private.operations_alerts(id),
  state text not null default 'pending' check(state in ('pending','leased','accepted','failed','uncertain')),
  attempt integer not null default 0 check(attempt between 0 and 3),
  lease_id uuid, lease_until timestamptz, next_attempt_at timestamptz not null default clock_timestamp()
);
create table audit_private.operations_alert_attempts (
  lease_id uuid primary key, alert_id uuid not null references audit_private.operations_alerts(id),
  attempt integer not null check(attempt between 1 and 3), recorded_at timestamptz not null default clock_timestamp(),
  unique(alert_id,attempt)
);
create index operations_alert_attempt_time_idx on audit_private.operations_alert_attempts(recorded_at);
create table audit_private.operations_alert_delivery_facts (
  lease_id uuid primary key references audit_private.operations_alert_attempts(lease_id),
  outcome text not null check(outcome in ('accepted','retryable','failed','uncertain')),
  recorded_at timestamptz not null default clock_timestamp()
);
create table audit_private.operations_alert_responses (
  id uuid primary key default gen_random_uuid(), alert_id uuid not null references audit_private.operations_alerts(id),
  tenant_id uuid not null references public.tenants(id), actor_subject_id uuid not null references public.subjects(id),
  action text not null check(action in ('acknowledged','resolved')), request_key uuid not null,
  recorded_at timestamptz not null default clock_timestamp(), unique(alert_id,action), unique(tenant_id,request_key)
);
create index operations_alert_response_actor_idx on audit_private.operations_alert_responses(actor_subject_id);
do $$declare table_name text; begin
  foreach table_name in array array['operations_alert_dispatch','operations_alert_attempts','operations_alert_delivery_facts','operations_alert_responses'] loop
    execute format('alter table audit_private.%I enable row level security',table_name);
    execute format('alter table audit_private.%I force row level security',table_name);
    execute format('revoke all on audit_private.%I from public,anon,authenticated,service_role',table_name);
    if table_name<>'operations_alert_dispatch' then
      execute format('create trigger %I before update or delete on audit_private.%I for each row execute function audit_private.reject_append_only_mutation()',table_name||'_append_only',table_name);
    end if;
  end loop;
end$$;

create function public.claim_operations_alert_notification(p_tenant_id uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare item audit_private.operations_alerts; cursor_row audit_private.operations_alert_dispatch; token uuid:=gen_random_uuid();
begin
  -- Global daily send-attempt budget leaves the shared free email allocation available for Auth.
  perform pg_advisory_xact_lock(107,1);
  insert into audit_private.operations_alert_delivery_facts(lease_id,outcome)
    select lease_id,'uncertain' from audit_private.operations_alert_dispatch
    where state='leased' and lease_until<=clock_timestamp() on conflict do nothing;
  update audit_private.operations_alert_dispatch set state='uncertain'
    where state='leased' and lease_until<=clock_timestamp();
  if (select count(*) from audit_private.operations_alert_attempts where recorded_at>=date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC')>=50 then return null; end if;
  insert into audit_private.operations_alert_dispatch(alert_id)
    select id from audit_private.operations_alerts where tenant_id=p_tenant_id on conflict do nothing;
  select a.* into item from audit_private.operations_alerts a join audit_private.operations_alert_dispatch d on d.alert_id=a.id
    where a.tenant_id=p_tenant_id and d.state='pending' and d.attempt<3 and d.next_attempt_at<=clock_timestamp()
    and not exists(select 1 from audit_private.operations_alert_responses r where r.alert_id=a.id)
    order by case a.severity when 'critical' then 0 else 1 end,a.recorded_at,a.id limit 1 for update of a;
  if item.id is null then return null; end if;
  -- Recheck after acquiring the alert lock: a responder may have committed while we waited.
  if exists(select 1 from audit_private.operations_alert_responses where alert_id=item.id) then return null; end if;
  update audit_private.operations_alert_dispatch set state='leased',attempt=attempt+1,lease_id=token,
    lease_until=clock_timestamp()+interval '2 minutes' where alert_id=item.id returning * into cursor_row;
  insert into audit_private.operations_alert_attempts(lease_id,alert_id,attempt) values(token,item.id,cursor_row.attempt);
  return jsonb_build_object('alertId',item.id,'leaseId',token,'code',item.code,'severity',item.severity,'owner',item.owner);
end$$;
revoke all on function public.claim_operations_alert_notification(uuid) from public,anon,authenticated;
grant execute on function public.claim_operations_alert_notification(uuid) to service_role;

create function public.finish_operations_alert_notification(p_tenant_id uuid,p_alert_id uuid,p_lease_id uuid,p_outcome text)
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare cursor_row audit_private.operations_alert_dispatch; prior text;
begin
  if p_outcome is null or p_outcome not in ('accepted','retryable','failed','uncertain') then
    raise exception using errcode='22023',message='ALERT_OUTCOME_INVALID'; end if;
  if not exists(select 1 from audit_private.operations_alerts where id=p_alert_id and tenant_id=p_tenant_id) then
    raise exception using errcode='42501',message='ALERT_REJECTED'; end if;
  select * into cursor_row from audit_private.operations_alert_dispatch where alert_id=p_alert_id for update;
  if not exists(select 1 from audit_private.operations_alert_attempts where lease_id=p_lease_id and alert_id=p_alert_id) then
    raise exception using errcode='40001',message='ALERT_CONFLICT'; end if;
  select outcome into prior from audit_private.operations_alert_delivery_facts where lease_id=p_lease_id;
  if prior is not null then
    if prior<>p_outcome then raise exception using errcode='40001',message='ALERT_CONFLICT'; end if;
    return true;
  end if;
  if cursor_row.alert_id is null or cursor_row.state<>'leased' or cursor_row.lease_id is distinct from p_lease_id or cursor_row.lease_until<=clock_timestamp() then
    raise exception using errcode='40001',message='ALERT_CONFLICT'; end if;
  insert into audit_private.operations_alert_delivery_facts(lease_id,outcome) values(p_lease_id,p_outcome);
  update audit_private.operations_alert_dispatch set state=case
    when p_outcome='retryable' and attempt<3 then 'pending' when p_outcome='retryable' then 'failed' else p_outcome end,
    next_attempt_at=clock_timestamp()+make_interval(secs=>case when attempt=1 then 60 else 300 end),lease_until=null
    where alert_id=p_alert_id;
  return true;
end$$;
revoke all on function public.finish_operations_alert_notification(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.finish_operations_alert_notification(uuid,uuid,uuid,text) to service_role;

create function public.respond_operations_alert(
 p_provider_subject uuid,p_provider_session_id uuid,p_verified_email text,p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,
 p_alert_id uuid,p_action text,p_request_key uuid
) returns uuid language plpgsql volatile security definer set search_path='' as $$
declare ctx jsonb; prior audit_private.operations_alert_responses; result uuid;
begin
  ctx:=public.resolve_workforce_context(p_provider_subject,p_provider_session_id,p_verified_email,p_session_id,p_subject_id,p_tenant_id);
  if ctx->>'role'<>'admin' or ctx->>'purpose'<>'security_administration' or p_subject_id is null or p_tenant_id is null
    or not identity_private.handoff_workforce_deadline(p_session_id,p_provider_session_id,p_subject_id,p_tenant_id,'admin') then
    raise exception using errcode='42501',message='OPERATIONS_ALERT_REJECTED'; end if;
  if p_action is null or p_action not in ('acknowledged','resolved') or p_request_key is null then
    raise exception using errcode='22023',message='ALERT_RESPONSE_INVALID'; end if;
  perform 1 from audit_private.operations_alerts where id=p_alert_id and tenant_id=p_tenant_id for update;
  if not found then raise exception using errcode='42501',message='OPERATIONS_ALERT_REJECTED'; end if;
  if not identity_private.handoff_workforce_deadline(p_session_id,p_provider_session_id,p_subject_id,p_tenant_id,'admin') then
    raise exception using errcode='42501',message='OPERATIONS_ALERT_REJECTED'; end if;
  select * into prior from audit_private.operations_alert_responses where tenant_id=p_tenant_id and request_key=p_request_key;
  if prior.id is not null then
    if prior.alert_id<>p_alert_id or prior.action<>p_action or prior.actor_subject_id<>p_subject_id then
      raise exception using errcode='40001',message='ALERT_CONFLICT'; end if;
    return prior.id;
  end if;
  if p_action='resolved' and not exists(select 1 from audit_private.operations_alert_responses where alert_id=p_alert_id and action='acknowledged') then
    raise exception using errcode='55000',message='ALERT_ACKNOWLEDGEMENT_REQUIRED'; end if;
  insert into audit_private.operations_alert_responses(alert_id,tenant_id,actor_subject_id,action,request_key)
  values(p_alert_id,p_tenant_id,p_subject_id,p_action,p_request_key) returning id into result;
  perform audit_private.append_audit_fact(p_tenant_id,'workforce',p_subject_id,'admin','aal2',
    'operations.alert.'||p_action,null,'operations_alert',p_alert_id::text,'security_administration',
    'sprint-10.7-v1','succeeded','ALERT_RESPONSE_RECORDED',p_request_key::text,result::text,clock_timestamp(),'{}');
  if not identity_private.handoff_workforce_deadline(p_session_id,p_provider_session_id,p_subject_id,p_tenant_id,'admin') then
    raise exception using errcode='42501',message='OPERATIONS_ALERT_REJECTED'; end if;
  return result;
end$$;
revoke all on function public.respond_operations_alert(uuid,uuid,text,uuid,uuid,uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.respond_operations_alert(uuid,uuid,text,uuid,uuid,uuid,uuid,text,uuid) to service_role;
