-- CLI-created migration timestamp ordered after the committed 12.3 prerequisite (152000).
-- Local implementation only: no roster, independent evidence or transport activation seed.
create index support_case_queue_idx on identity_private.support_cases(tenant_id,purpose,recorded_at,id);
create index support_case_route_idx on identity_private.support_cases(route_id);
create index support_route_queue_idx on identity_private.support_routes(tenant_id,purpose,expires_at);
create index transactional_notification_queue_idx on audit_private.transactional_notifications(tenant_id,recorded_at,id);

create table audit_private.notification_followup_actions (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id),
 notification_id uuid not null references audit_private.transactional_notifications(id),
 actor_subject_id uuid not null references public.subjects(id),
 action text not null check(action in('acknowledged','resolved','resend')),
 reason text not null check(reason in('review_started','secure_followup_completed','confirmed_non_acceptance')),
 request_key uuid not null,
 observed_revision text not null check(observed_revision ~ '^[a-f0-9]{64}$'),
 recorded_at timestamptz not null default clock_timestamp(),
 unique(actor_subject_id,request_key),
 check((action='acknowledged' and reason='review_started') or
       (action='resolved' and reason='secure_followup_completed') or
       (action='resend' and reason='confirmed_non_acceptance'))
);
create unique index notification_followup_once_idx on audit_private.notification_followup_actions(notification_id,action)
 where action='acknowledged';
create unique index notification_resolution_revision_idx on audit_private.notification_followup_actions(notification_id,observed_revision)
 where action='resolved';
-- Uncertain transport can be retried only with independently reviewed, time-limited evidence
-- concerning its exact last lease. No public/service setter or browser evidence assertion exists.
create table audit_private.notification_nonacceptance_evidence (
 id uuid primary key default gen_random_uuid(),
 notification_id uuid not null references audit_private.transactional_notifications(id),
 lease_id uuid not null references audit_private.transactional_attempts(lease_id),
 reviewed_by_subject_id uuid not null references public.subjects(id),
 evidence_sha256 text not null check(evidence_sha256 ~ '^[a-f0-9]{64}$'),
 approval_reference uuid not null,
 recorded_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null,
 check(expires_at>recorded_at and expires_at<=recorded_at+interval '24 hours'),
 unique(notification_id,lease_id)
);
do $$declare t text;begin
 foreach t in array array['notification_followup_actions','notification_nonacceptance_evidence'] loop
  execute format('alter table audit_private.%I enable row level security',t);
  execute format('alter table audit_private.%I force row level security',t);
  execute format('revoke all on audit_private.%I from public,anon,authenticated,service_role',t);
  execute format('create trigger %I before update or delete on audit_private.%I for each row execute function audit_private.reject_append_only_mutation()',t||'_immutable',t);
 end loop;
end$$;

create function identity_private.notification_owner_live(n audit_private.transactional_notifications,c jsonb) returns boolean
language sql stable set search_path='' as $$
 select (select count(*)=1 from identity_private.support_routes r
 where r.tenant_id=n.tenant_id and identity_private.support_route_live(r)
 and r.purpose=case when n.source_kind='support' then (select purpose from identity_private.support_cases where id=n.source_id and tenant_id=n.tenant_id)
                   when n.owner='privacy' then 'privacy' else 'complaint' end
 and (n.source_kind<>'support' or r.id=(select route_id from identity_private.support_cases where id=n.source_id and tenant_id=n.tenant_id))
 and case r.purpose when 'privacy' then c->>'purpose'='privacy_review'
                    when 'clinical' then c->>'purpose'='care_delivery'
                    else c->>'purpose' in('operations','support') end
 and identity_private.support_owner_live(r,(c->>'subjectId')::uuid))
$$;
revoke all on function identity_private.notification_owner_live(audit_private.transactional_notifications,jsonb) from public,anon,authenticated,service_role;

-- Resolution closes only the exact observed transport revision. Later failure/lease evidence
-- reopens follow-up without rewriting the original immutable human response.
create function audit_private.notification_revision(n uuid) returns text
language sql stable set search_path='' as $$
 select encode(extensions.digest(convert_to(jsonb_build_object(
  'dispatch',(select to_jsonb(d) from audit_private.transactional_dispatch d where notification_id=n),
  'expired',(select state='leased' and lease_until<=clock_timestamp() from audit_private.transactional_dispatch where notification_id=n),
  'suppressed',exists(select 1 from audit_private.transactional_suppressions s join audit_private.transactional_notifications x on x.tenant_id=s.tenant_id and x.subject_id=s.subject_id where x.id=n),
  'transport',(select coalesce(jsonb_agg(to_jsonb(f) order by f.lease_id),'[]'::jsonb) from audit_private.transactional_delivery_facts f join audit_private.transactional_attempts a on a.lease_id=f.lease_id where a.notification_id=n),
  'provider',(select coalesce(jsonb_agg(to_jsonb(f) order by f.lease_id,f.event,f.occurred_at),'[]'::jsonb) from audit_private.transactional_provider_deliveries f join audit_private.transactional_attempts a on a.lease_id=f.lease_id where a.notification_id=n)
 )::text,'UTF8'),'sha256'),'hex')
$$;
revoke all on function audit_private.notification_revision(uuid) from public,anon,authenticated,service_role;

create function audit_private.notification_resend_allowed(n audit_private.transactional_notifications,c jsonb) returns boolean
language plpgsql stable set search_path='' as $$
declare d audit_private.transactional_dispatch;address text;begin
 select * into d from audit_private.transactional_dispatch where notification_id=n.id;
 if d.notification_id is null or d.attempt>=3 or d.state not in('failed','uncertain')
 or exists(select 1 from audit_private.notification_followup_actions where notification_id=n.id and action='resolved' and observed_revision=audit_private.notification_revision(n.id))
 or not exists(select 1 from audit_private.notification_followup_actions where notification_id=n.id and action='acknowledged')
 or exists(select 1 from audit_private.transactional_suppressions where tenant_id=n.tenant_id and subject_id=n.subject_id)
 or exists(select 1 from audit_private.transactional_provider_deliveries x join audit_private.transactional_attempts a on a.lease_id=x.lease_id where a.notification_id=n.id)
 or exists(select 1 from audit_private.transactional_delivery_facts f join audit_private.transactional_attempts a on a.lease_id=f.lease_id where a.notification_id=n.id and f.outcome='accepted')
 or not exists(select 1 from public.subjects where id=n.subject_id and status='active')
 or not exists(select 1 from public.tenant_memberships where tenant_id=n.tenant_id and subject_id=n.subject_id and role='patient' and status='active' and valid_from<=clock_timestamp() and (expires_at is null or expires_at>clock_timestamp()))
 or not exists(select 1 from public.client_profiles where tenant_id=n.tenant_id and subject_id=n.subject_id and status='active' and contact_preference='email')
 then return false;end if;
 select normalized_value into address from public.subject_contacts where subject_id=n.subject_id and kind='email' and status='verified' and verified_at is not null;
 if address is null or length(address)>254 or address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 or (d.destination_hash is not null and d.destination_hash<>encode(extensions.digest(convert_to(address,'UTF8'),'sha256'),'hex')) then return false;end if;
 if d.state='uncertain' then
  return exists(select 1 from audit_private.notification_nonacceptance_evidence e
   join public.tenant_memberships m on m.subject_id=e.reviewed_by_subject_id and m.tenant_id=n.tenant_id
   join public.subjects s on s.id=m.subject_id
   where e.notification_id=n.id and e.lease_id=d.lease_id and e.reviewed_by_subject_id<>(c->>'subjectId')::uuid
   and e.expires_at>clock_timestamp() and m.role='admin' and m.status='active' and m.valid_from<=clock_timestamp()
   and m.expires_at>clock_timestamp() and s.status='active');
 end if;
 return (d.attempt=0 and d.reason in('CHANNEL_UNAVAILABLE','RECIPIENT_UNAVAILABLE')) or
  (d.reason='TRANSPORT_FAILED' and exists(select 1 from audit_private.transactional_delivery_facts where lease_id=d.lease_id and outcome='failed')
   and not exists(select 1 from audit_private.transactional_message_bindings b join audit_private.transactional_attempts a on a.lease_id=b.lease_id where a.notification_id=n.id));
end$$;
revoke all on function audit_private.notification_resend_allowed(audit_private.transactional_notifications,jsonb) from public,anon,authenticated,service_role;

create function public.staff_support_followup(p_context jsonb,p_command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ctx jsonb;t uuid;actor uuid;n audit_private.transactional_notifications;d audit_private.transactional_dispatch;
 prior audit_private.notification_followup_actions;result jsonb;cases jsonb;notices jsonb;coverage jsonb;
begin
 ctx:=intake_private.workforce(p_context);t:=(p_context->>'tenantId')::uuid;actor:=(p_context->>'subjectId')::uuid;
 if p_command is null or jsonb_typeof(p_command)<>'object' or p_command->>'action' is null then
 raise exception using errcode='42501',message='FOLLOWUP_REJECTED';end if;
 if p_command->>'action'='read' then
  if (select count(*) from jsonb_object_keys(p_command))<>1 then raise exception using errcode='42501',message='FOLLOWUP_REJECTED';end if;
  if ctx->>'role'='admin' and p_context->>'purpose'='security_administration' then
   select coalesce(jsonb_agg(jsonb_build_object('reference',null,'purpose',p,'reason','coverage_unavailable') order by p),'[]'::jsonb) into coverage
   from unnest(array['privacy','complaint','clinical']) p
   where (select count(*) from identity_private.support_routes r where r.tenant_id=t and r.purpose=p
     and identity_private.support_route_live(r) and identity_private.support_owner_live(r,r.primary_subject_id)
     and identity_private.support_owner_live(r,r.alternate_subject_id))<>1;
   return jsonb_build_object('cases','[]'::jsonb,'notifications','[]'::jsonb,'coverage',coverage);
  end if;
  if p_context->>'purpose' not in('privacy_review','operations','support','care_delivery') then raise exception using errcode='42501',message='FOLLOWUP_REJECTED';end if;
  select coalesce(jsonb_agg(jsonb_build_object('reference',x.id,'purpose',x.purpose,'state',identity_private.support_case_state(x),
   'recordedAt',x.recorded_at,'canRespond',not (actor=r.primary_subject_id and identity_private.support_case_state(x)='escalated')) order by x.recorded_at,x.id),'[]'::jsonb) into cases
  from(select item.* from identity_private.support_cases item join identity_private.support_routes route on route.id=item.route_id
   where item.tenant_id=t and identity_private.support_route_live(route) and identity_private.support_owner_live(route,actor)
   and case item.purpose when 'privacy' then p_context->>'purpose'='privacy_review' when 'clinical' then p_context->>'purpose'='care_delivery' else p_context->>'purpose' in('operations','support') end
   and identity_private.support_case_state(item)<>'resolved' order by item.recorded_at,item.id limit 20)x
  join identity_private.support_routes r on r.id=x.route_id;
  select coalesce(jsonb_agg(jsonb_build_object('reference',x.id,'template',x.template,'state',x.display_state,'reason',x.reason,
   'recordedAt',x.recorded_at,'reviewState',x.review_state,'canResend',audit_private.notification_resend_allowed(x.n,p_context) and audit_private.notification_budget_used()<50) order by x.priority,x.recorded_at,x.id),'[]'::jsonb) into notices
  from(select item.id,item.template,item.recorded_at,item as n,
   case when exists(select 1 from audit_private.transactional_suppressions where tenant_id=item.tenant_id and subject_id=item.subject_id) then 'suppressed'
    when exists(select 1 from audit_private.transactional_provider_deliveries f join audit_private.transactional_attempts a on a.lease_id=f.lease_id where a.notification_id=item.id and f.event<>'delivered') then 'delivery_failed'
    when exists(select 1 from audit_private.transactional_provider_deliveries f join audit_private.transactional_attempts a on a.lease_id=f.lease_id where a.notification_id=item.id and f.event='delivered') then 'delivered'
    when cursor.state='leased' and cursor.lease_until<=clock_timestamp() then 'uncertain'
    when cursor.reason='BUDGET_EXHAUSTED' then 'deferred'
    when cursor.state='pending' and cursor.attempt>0 then 'retryable'
    else coalesce(cursor.state,'pending') end as display_state,
   case when cursor.state='leased' and cursor.lease_until<=clock_timestamp() then 'TRANSPORT_UNCERTAIN' else cursor.reason end as reason,
   case when cursor.state in('failed','uncertain','suppressed') or cursor.reason='BUDGET_EXHAUSTED'
     or cursor.state='leased' and cursor.lease_until<=clock_timestamp()
     or exists(select 1 from audit_private.transactional_suppressions where tenant_id=item.tenant_id and subject_id=item.subject_id)
     or exists(select 1 from audit_private.transactional_provider_deliveries f join audit_private.transactional_attempts a on a.lease_id=f.lease_id where a.notification_id=item.id and f.event<>'delivered') then 0 else 1 end as priority,
   case when exists(select 1 from audit_private.notification_followup_actions where notification_id=item.id and action='resolved' and observed_revision=audit_private.notification_revision(item.id)) then 'resolved'
    when exists(select 1 from audit_private.notification_followup_actions where notification_id=item.id and action='acknowledged') then 'acknowledged' else 'unreviewed' end as review_state
   from audit_private.transactional_notifications item left join audit_private.transactional_dispatch cursor on cursor.notification_id=item.id
   where item.tenant_id=t and identity_private.notification_owner_live(item,p_context)
   and not exists(select 1 from audit_private.notification_followup_actions where notification_id=item.id and action='resolved' and observed_revision=audit_private.notification_revision(item.id))
   order by priority,item.recorded_at,item.id limit 20)x;
  return jsonb_build_object('cases',cases,'notifications',notices,'coverage','[]'::jsonb);
 end if;
 if p_command->>'action' not in('acknowledged','resolved','resend') or (select count(*) from jsonb_object_keys(p_command))<>4
 or p_command->>'reference' is null or p_command->>'requestKey' is null or p_command->>'reason' is distinct from
 (case p_command->>'action' when 'acknowledged' then 'review_started' when 'resolved' then 'secure_followup_completed' else 'confirmed_non_acceptance' end) then
 raise exception using errcode='42501',message='FOLLOWUP_REJECTED';end if;
 -- Same lock ordering as dispatcher/receipt handlers; no alternate quota or direct send.
 perform pg_advisory_xact_lock(107,1);
 perform audit_private.expire_notification_leases();
 perform pg_advisory_xact_lock(hashtextextended(actor::text,124));
 select * into n from audit_private.transactional_notifications where id=(p_command->>'reference')::uuid and tenant_id=t;
 if n.id is null or not identity_private.notification_owner_live(n,p_context) then raise exception using errcode='42501',message='FOLLOWUP_REJECTED';end if;
 select * into prior from audit_private.notification_followup_actions where actor_subject_id=actor and request_key=(p_command->>'requestKey')::uuid;
 if prior.id is not null then
  if prior.notification_id<>n.id or prior.action<>p_command->>'action' or prior.reason<>p_command->>'reason' then raise exception using errcode='40001',message='FOLLOWUP_CONFLICT';end if;
  return to_jsonb(prior.id);
 end if;
 if (select count(*) from audit_private.notification_followup_actions where actor_subject_id=actor and recorded_at>clock_timestamp()-interval '1 hour')>=30 then
 raise exception using errcode='P0001',message='FOLLOWUP_RATE_LIMIT';end if;
 if p_command->>'action'<>'acknowledged' and not exists(select 1 from audit_private.notification_followup_actions where notification_id=n.id and action='acknowledged') then
 raise exception using errcode='40001',message='FOLLOWUP_CONFLICT';end if;
 if exists(select 1 from audit_private.notification_followup_actions where notification_id=n.id and ((action='resolved' and observed_revision=audit_private.notification_revision(n.id)) or action=p_command->>'action' and action='acknowledged')) then
 raise exception using errcode='40001',message='FOLLOWUP_CONFLICT';end if;
 if p_command->>'action'='resend' then
  select * into d from audit_private.transactional_dispatch where notification_id=n.id for update;
  if not audit_private.notification_resend_allowed(n,p_context) or audit_private.notification_budget_used()>=50 then
   raise exception using errcode='40001',message='FOLLOWUP_CONFLICT';end if;
  update audit_private.transactional_dispatch set state='pending',reason=null,lease_until=null,
   next_attempt_at=greatest(next_attempt_at,clock_timestamp()) where notification_id=n.id;
 end if;
 insert into audit_private.notification_followup_actions(tenant_id,notification_id,actor_subject_id,action,reason,request_key,observed_revision)
 values(t,n.id,actor,p_command->>'action',p_command->>'reason',(p_command->>'requestKey')::uuid,audit_private.notification_revision(n.id)) returning * into prior;
 perform intake_private.workforce(p_context);
 return to_jsonb(prior.id);
end$$;
revoke all on function public.staff_support_followup(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.staff_support_followup(jsonb,jsonb) to service_role;

-- Requeue is not a reservation against future delivery evidence. Reconcile late callbacks and
-- evidence expiry again under the same shared sender lock immediately before a new claim.
alter function public.claim_transactional_notification(uuid) rename to claim_transactional_before_followup;
alter function public.claim_transactional_before_followup(uuid) set schema audit_private;
revoke all on function audit_private.claim_transactional_before_followup(uuid) from public,anon,authenticated,service_role;
create function public.claim_transactional_notification(p_tenant_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare item record;begin
 perform pg_advisory_xact_lock(107,1);
 for item in select d.* from audit_private.transactional_dispatch d join audit_private.transactional_notifications n on n.id=d.notification_id
 where n.tenant_id=p_tenant_id and d.state='pending' and exists(select 1 from audit_private.notification_followup_actions where notification_id=n.id and action='resend')
 order by d.notification_id for update of d loop
  if exists(select 1 from audit_private.transactional_provider_deliveries f join audit_private.transactional_attempts a on a.lease_id=f.lease_id where a.notification_id=item.notification_id)
   or exists(select 1 from audit_private.transactional_delivery_facts f join audit_private.transactional_attempts a on a.lease_id=f.lease_id where a.notification_id=item.notification_id and f.outcome='accepted') then
   update audit_private.transactional_dispatch set state='uncertain',reason='TRANSPORT_UNCERTAIN' where notification_id=item.notification_id;
  elsif exists(select 1 from audit_private.transactional_delivery_facts where lease_id=item.lease_id and outcome='uncertain')
   and not exists(select 1 from audit_private.notification_nonacceptance_evidence e
    join audit_private.transactional_notifications n on n.id=e.notification_id
    join public.tenant_memberships m on m.tenant_id=n.tenant_id and m.subject_id=e.reviewed_by_subject_id
    join public.subjects s on s.id=m.subject_id
    where e.notification_id=item.notification_id and e.lease_id=item.lease_id and e.expires_at>clock_timestamp()
    and s.status='active' and m.role='admin' and m.status='active' and m.valid_from<=clock_timestamp() and m.expires_at>clock_timestamp()) then
   update audit_private.transactional_dispatch set state='uncertain',reason='TRANSPORT_UNCERTAIN' where notification_id=item.notification_id;
  end if;
 end loop;
 return audit_private.claim_transactional_before_followup(p_tenant_id);
end$$;
revoke all on function public.claim_transactional_notification(uuid) from public,anon,authenticated;
grant execute on function public.claim_transactional_notification(uuid) to service_role;
