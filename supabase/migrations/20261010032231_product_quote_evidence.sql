begin;
-- Patient activation permits an unbounded membership; workforce approvals remain expiring.
-- Forward correction only: preserve the committed 15.4 migration and function metadata.
do $$declare definition text; needle text:='and status=''active'' and valid_from<=clock_timestamp() and expires_at>clock_timestamp() for share;';begin
 definition:=pg_get_functiondef('public.staff_product_quote(jsonb,jsonb,text)'::regprocedure);
 if array_length(string_to_array(definition,needle),1)<>2 then raise exception 'PRODUCT_DRAFT_GUARD_DRIFT';end if;
 execute replace(definition,needle,'and status=''active'' and valid_from<=clock_timestamp() and (expires_at is null or expires_at>clock_timestamp()) for share;');
end $$;
create table commerce_private.product_quote_evidence (
 id uuid primary key default gen_random_uuid(), draft_id uuid not null references commerce_private.product_quote_drafts(id),
 tenant_id uuid not null, case_id uuid not null, subject_id uuid not null references public.subjects(id),
 actor_id uuid not null references public.subjects(id), kind text not null
 check(kind in('clinical','provider_stock','pharmacy_authority','address_custody')),
 intake_id uuid not null, snapshot_id uuid not null, grant_id uuid references intake_private.access_grants(id),
 evidence_reference uuid not null, expires_at timestamptz not null,
 request_key uuid not null, fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
 recorded_at timestamptz not null default clock_timestamp(),
 check(expires_at>recorded_at and expires_at<=recorded_at+interval '24 hours'),
 check((kind='clinical')=(grant_id is not null)),
 unique(tenant_id,actor_id,request_key),
 foreign key(case_id,tenant_id,subject_id) references public.operations_cases(id,tenant_id,subject_id),
 foreign key(intake_id,snapshot_id) references intake_private.snapshots(intake_id,id)
);
create index product_evidence_draft_idx on commerce_private.product_quote_evidence(draft_id,kind,recorded_at desc);
create index product_evidence_actor_idx on commerce_private.product_quote_evidence(actor_id);
create index product_evidence_subject_idx on commerce_private.product_quote_evidence(subject_id);
create index product_evidence_case_idx on commerce_private.product_quote_evidence(case_id,tenant_id,subject_id);
create index product_evidence_snapshot_idx on commerce_private.product_quote_evidence(intake_id,snapshot_id);
create index product_evidence_grant_idx on commerce_private.product_quote_evidence(grant_id);
create table commerce_private.product_evidence_revocations (
 evidence_id uuid primary key references commerce_private.product_quote_evidence(id),
 actor_id uuid not null references public.subjects(id), evidence_reference uuid not null,
 request_key uuid not null, recorded_at timestamptz not null default clock_timestamp(), unique(actor_id,request_key)
);
create index product_evidence_revoker_idx on commerce_private.product_evidence_revocations(actor_id);
do $$declare table_name text;begin
 foreach table_name in array array['product_quote_evidence','product_evidence_revocations'] loop
  execute format('alter table commerce_private.%I enable row level security',table_name);
  execute format('alter table commerce_private.%I force row level security',table_name);
  execute format('revoke all on commerce_private.%I from public,anon,authenticated,service_role',table_name);
  execute format('create trigger product_evidence_immutable before update or delete on commerce_private.%I for each row execute function audit_private.reject_append_only_mutation()',table_name);
 end loop;
end $$;
create trigger mobile_orphan_reference_guard before insert or update on commerce_private.product_quote_evidence
 for each row execute function identity_private.guard_mobile_orphan_reference('subject_id','actor_id');
create trigger mobile_orphan_reference_guard before insert or update on commerce_private.product_evidence_revocations
 for each row execute function identity_private.guard_mobile_orphan_reference('actor_id');

-- Private, invoker-only predicate for later issue/accept/release. Never substitutes for caller authority.
create function commerce_private.product_evidence_current(target uuid) returns boolean
language sql volatile set search_path='' as $$
 select exists(select 1 from commerce_private.product_quote_evidence e
 join commerce_private.product_quote_drafts d on d.id=e.draft_id and d.tenant_id=e.tenant_id and d.case_id=e.case_id and d.subject_id=e.subject_id
 join public.operations_cases c on c.id=d.case_id and c.version=d.case_version
 join public.subjects client on client.id=c.subject_id and client.status='active'
 join public.subjects reviewer on reviewer.id=e.actor_id and reviewer.status='active'
 join public.client_profiles p on p.tenant_id=c.tenant_id and p.subject_id=c.subject_id and p.status='active'
 join commerce_private.catalogue_versions b on b.id=d.catalogue_id and b.status='approved' and b.effective_at<=clock_timestamp() and b.expires_at>clock_timestamp()
 join commerce_private.delivery_quotes q on q.id=d.delivery_quote_id and q.status='approved' and q.effective_at<=clock_timestamp() and q.expires_at>clock_timestamp()
 join commerce_private.shipping_address_snapshots a on a.id=d.address_snapshot_id and a.status='approved'
 join intake_private.intakes i on i.id=e.intake_id and i.case_id=c.id and i.snapshot_id=e.snapshot_id
 join intake_private.publications pub on pub.id=i.publication_id and pub.status='published' and pub.effective_at<=clock_timestamp() and pub.expires_at>clock_timestamp()
 where e.id=target and e.expires_at>clock_timestamp() and c.state not in('cancelled','handoff_exception')
 and not exists(select 1 from commerce_private.product_quote_drafts newer where newer.case_id=c.id and newer.version>d.version)
 and not exists(select 1 from commerce_private.product_evidence_revocations r where r.evidence_id=e.id)
 and not exists(select 1 from commerce_private.product_quote_evidence newer where newer.draft_id=e.draft_id and newer.kind=e.kind
  and (newer.recorded_at,newer.id)>(e.recorded_at,e.id))
 and i.state='submitted' and not i.safety_hold and not i.restore_quarantined
 and (i.restore_authority_cutoff is null or e.recorded_at>i.restore_authority_cutoff)
 and exists(select 1 from public.tenant_memberships m where m.tenant_id=c.tenant_id and m.subject_id=c.subject_id and m.role='patient'
  and m.status='active' and m.valid_from<=clock_timestamp() and (m.expires_at is null or m.expires_at>clock_timestamp()))
 and exists(select 1 from public.tenant_memberships m where m.tenant_id=c.tenant_id and m.subject_id=e.actor_id
  and m.role=case e.kind when 'clinical' then 'clinician' else 'operations' end and m.status='active'
  and m.valid_from<=clock_timestamp() and m.expires_at>clock_timestamp())
 and case when e.kind='clinical' then exists(select 1 from intake_private.access_grants g
  join intake_private.grant_approvals ga on ga.id=g.approval_id
  where g.id=e.grant_id and g.intake_id=i.id and g.snapshot_id=i.snapshot_id and g.actor_subject_id=e.actor_id
  and g.purpose='medical_review' and g.starts_at<=clock_timestamp() and g.expires_at>clock_timestamp() and g.revoked_at is null
  and (i.restore_authority_cutoff is null or ga.recorded_at>i.restore_authority_cutoff)
  and exists(select 1 from public.tenant_memberships m where m.tenant_id=c.tenant_id and m.subject_id=g.clinical_approver and m.role='clinician' and m.status='active' and m.valid_from<=clock_timestamp() and m.expires_at>clock_timestamp())
  and exists(select 1 from public.tenant_memberships m where m.tenant_id=c.tenant_id and m.subject_id=g.security_approver and m.role='admin' and m.status='active' and m.valid_from<=clock_timestamp() and m.expires_at>clock_timestamp()))
 else exists(select 1 from public.operations_assignments assign where assign.case_id=c.id and assign.workforce_subject_id=e.actor_id
  and assign.role='operations' and assign.purpose='operations' and assign.revoked_at is null and assign.starts_at<=clock_timestamp() and assign.expires_at>clock_timestamp()) end);
$$;
revoke all on function commerce_private.product_evidence_current(uuid) from public,anon,authenticated,service_role;

create function public.staff_product_evidence(p_context jsonb,p_command jsonb,p_provenance text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare ctx jsonb; c public.operations_cases; d commerce_private.product_quote_drafts; i intake_private.intakes;
 g intake_private.access_grants; prior commerce_private.product_quote_evidence; revoked commerce_private.product_evidence_revocations;
 actor uuid; tenant uuid; case_ref uuid; fp text; ref uuid; deadline timestamptz; expiry timestamptz; result jsonb;
begin
 ctx:=intake_private.workforce(p_context);actor:=(ctx->>'subjectId')::uuid;tenant:=(ctx->>'tenantId')::uuid;
 if ctx->>'role' not in('clinician','operations') or
 (ctx->>'role'='clinician' and ctx->>'purpose'<>'care_delivery') or
 (ctx->>'role'='operations' and ctx->>'purpose'<>'operations') or not exists(select 1 from auth.mfa_amr_claims
 where session_id=(p_context->>'providerSessionId')::uuid and authentication_method='totp'
 and updated_at<=clock_timestamp() and updated_at>clock_timestamp()-interval '5 minutes') then
 raise exception using errcode='42501',message='PRODUCT_EVIDENCE_REJECTED';end if;
 if p_provenance is null or p_provenance not in('local-synthetic','precise-wellness-rrp') or p_command is null or jsonb_typeof(p_command)<>'object'
 or p_command->>'action' is null or p_command->>'action' not in('read','record','revoke')
 or jsonb_typeof(p_command->'target')<>'object' or (select count(*) from jsonb_object_keys(p_command->'target'))<>1
 or not(p_command->'target' ?| array['caseId','intakeId']) then raise exception using errcode='22023',message='PRODUCT_EVIDENCE_INPUT_INVALID';end if;
 if p_command->>'action'='read' then
  if p_command-array['action','target']<>'{}'::jsonb then raise exception using errcode='22023',message='PRODUCT_EVIDENCE_INPUT_INVALID';end if;
 elsif p_command->>'action'='record' then
  if not(p_command ?& array['action','target','draftId','kind','evidenceReference','expiresAt','requestKey']) or
   p_command-array['action','target','draftId','kind','evidenceReference','expiresAt','requestKey']<>'{}'::jsonb or
   p_command->>'kind' is null or p_command->>'kind' not in('clinical','provider_stock','pharmacy_authority','address_custody') then
   raise exception using errcode='22023',message='PRODUCT_EVIDENCE_INPUT_INVALID';end if;
 else
  if not(p_command ?& array['action','target','draftId','evidenceId','evidenceReference','requestKey']) or
   p_command-array['action','target','draftId','evidenceId','evidenceReference','requestKey']<>'{}'::jsonb then
   raise exception using errcode='22023',message='PRODUCT_EVIDENCE_INPUT_INVALID';end if;
 end if;
 if exists(select 1 from jsonb_each(p_command) e where e.value='null'::jsonb) then raise exception using errcode='22023',message='PRODUCT_EVIDENCE_INPUT_INVALID';end if;
 if ctx->>'role'='clinician' then
  if not(p_command->'target' ? 'intakeId') then raise exception using errcode='42501',message='PRODUCT_EVIDENCE_REJECTED';end if;
  g:=intake_private.medical_grant(p_context,(p_command->'target'->>'intakeId')::uuid,'medical_review');
  select case_id into case_ref from intake_private.intakes where id=g.intake_id;
 else
  if not(p_command->'target' ? 'caseId') then raise exception using errcode='42501',message='PRODUCT_EVIDENCE_REJECTED';end if;
  case_ref:=(p_command->'target'->>'caseId')::uuid;
  perform public.read_operations_queue((p_context->>'providerSubject')::uuid,(p_context->>'providerSessionId')::uuid,p_context->>'verifiedEmail',
   (p_context->>'sessionId')::uuid,actor,tenant,case_ref);
 end if;
 select * into c from public.operations_cases where id=case_ref and tenant_id=tenant for update;
 perform 1 from public.subjects where id=c.subject_id and status='active' for share;
 if not found then raise exception using errcode='42501',message='PRODUCT_EVIDENCE_REJECTED';end if;
 perform 1 from public.client_profiles where subject_id=c.subject_id and tenant_id=tenant and status='active' for share;
 if not found then raise exception using errcode='42501',message='PRODUCT_EVIDENCE_REJECTED';end if;
 perform 1 from public.tenant_memberships where subject_id=c.subject_id and tenant_id=tenant and role='patient'
  and status='active' and valid_from<=clock_timestamp() and (expires_at is null or expires_at>clock_timestamp()) for share;
 if not found then raise exception using errcode='42501',message='PRODUCT_EVIDENCE_REJECTED';end if;
 select * into i from intake_private.intakes where case_id=c.id and tenant_id=tenant for share;
 if i.id is null or i.state<>'submitted' or i.safety_hold or i.restore_quarantined or c.state in('cancelled','handoff_exception') then
  raise exception using errcode='42501',message='PRODUCT_EVIDENCE_REJECTED';end if;
 if ctx->>'role'='clinician' then g:=intake_private.medical_grant(p_context,i.id,'medical_review');
 else
  perform public.read_operations_queue((p_context->>'providerSubject')::uuid,(p_context->>'providerSessionId')::uuid,p_context->>'verifiedEmail',
   (p_context->>'sessionId')::uuid,actor,tenant,c.id);
 end if;
 select * into d from commerce_private.product_quote_drafts where case_id=c.id order by version desc limit 1;
 perform 1 from commerce_private.catalogue_versions where id=d.catalogue_id for share;
 perform 1 from commerce_private.delivery_quotes where id=d.delivery_quote_id for share;
 perform 1 from commerce_private.shipping_address_snapshots where id=d.address_snapshot_id for share;
 perform 1 from public.operations_assignments where case_id=c.id and workforce_subject_id=actor for share;
 if g.id is not null then perform 1 from intake_private.access_grants where id=g.id for share;end if;
 if d.id is null or d.case_version<>c.version or not exists(select 1 from commerce_private.catalogue_versions b
 where b.id=d.catalogue_id and b.status='approved' and b.provenance=p_provenance and b.effective_at<=clock_timestamp() and b.expires_at>clock_timestamp())
 or not exists(select 1 from commerce_private.delivery_quotes q where q.id=d.delivery_quote_id and q.status='approved' and q.effective_at<=clock_timestamp() and q.expires_at>clock_timestamp())
 or not exists(select 1 from commerce_private.shipping_address_snapshots a where a.id=d.address_snapshot_id and a.status='approved')
 then raise exception using errcode='PT409',message='PRODUCT_EVIDENCE_CONFLICT';end if;
 if p_command->>'action'<>'read' then
  if (p_command->>'draftId')::uuid<>d.id then raise exception using errcode='PT409',message='PRODUCT_EVIDENCE_CONFLICT';end if;
  if p_command->>'action'='record' then
   if (ctx->>'role'='clinician') is distinct from (p_command->>'kind'='clinical') or actor=d.actor_id then
    raise exception using errcode='42501',message='PRODUCT_EVIDENCE_REJECTED';end if;
   expiry:=(p_command->>'expiresAt')::timestamptz;
   if expiry is null or expiry<=clock_timestamp() or expiry>clock_timestamp()+interval '24 hours' or (g.id is not null and expiry>g.expires_at) then
    raise exception using errcode='22023',message='PRODUCT_EVIDENCE_INPUT_INVALID';end if;
   fp:=encode(extensions.digest(p_command::text,'sha256'),'hex');
   select * into prior from commerce_private.product_quote_evidence where tenant_id=tenant and actor_id=actor and request_key=(p_command->>'requestKey')::uuid;
   if prior.id is not null then
    if prior.fingerprint<>fp or prior.snapshot_id<>i.snapshot_id or not commerce_private.product_evidence_current(prior.id) then
     raise exception using errcode='PT409',message='PRODUCT_EVIDENCE_CONFLICT';end if;
    ref:=prior.id;
   else
    ref:=gen_random_uuid();
    insert into commerce_private.product_quote_evidence(id,draft_id,tenant_id,case_id,subject_id,actor_id,kind,intake_id,snapshot_id,grant_id,evidence_reference,expires_at,request_key,fingerprint)
    values(ref,d.id,tenant,c.id,c.subject_id,actor,p_command->>'kind',i.id,i.snapshot_id,g.id,(p_command->>'evidenceReference')::uuid,expiry,(p_command->>'requestKey')::uuid,fp);
    perform audit_private.append_audit_fact(tenant,'workforce',actor,ctx->>'role','aal2','product.evidence.recorded',c.subject_id,'product_quote',d.id::text,ctx->>'purpose',
     'sprint-15.5-v1','succeeded','PRODUCT_EVIDENCE_RECORDED',ref::text,ref::text,clock_timestamp(),'{}');
   end if;
   if not commerce_private.product_evidence_current(ref) then raise exception using errcode='42501',message='PRODUCT_EVIDENCE_REJECTED';end if;
  else
   select * into prior from commerce_private.product_quote_evidence where id=(p_command->>'evidenceId')::uuid and draft_id=d.id and actor_id=actor;
   if prior.id is null or ((ctx->>'role'='clinician') is distinct from (prior.kind='clinical')) then raise exception using errcode='42501',message='PRODUCT_EVIDENCE_REJECTED';end if;
   select * into revoked from commerce_private.product_evidence_revocations where evidence_id=prior.id;
   if revoked.evidence_id is not null then
    if revoked.request_key<>(p_command->>'requestKey')::uuid or revoked.evidence_reference<>(p_command->>'evidenceReference')::uuid then
     raise exception using errcode='PT409',message='PRODUCT_EVIDENCE_CONFLICT';end if;
   else
    insert into commerce_private.product_evidence_revocations(evidence_id,actor_id,evidence_reference,request_key)
     values(prior.id,actor,(p_command->>'evidenceReference')::uuid,(p_command->>'requestKey')::uuid);
    perform audit_private.append_audit_fact(tenant,'workforce',actor,ctx->>'role','aal2','product.evidence.revoked',c.subject_id,'product_quote',d.id::text,ctx->>'purpose',
     'sprint-15.5-v1','succeeded','PRODUCT_EVIDENCE_REVOKED',prior.id::text,prior.id::text,clock_timestamp(),'{}');
   end if;
  end if;
 end if;
 select least(s.idle_expires_at,s.absolute_expires_at,clock_timestamp()+interval '5 minutes',coalesce(g.expires_at,'infinity'),
  (select max(updated_at)+interval '5 minutes' from auth.mfa_amr_claims where session_id=s.provider_session_id and authentication_method='totp'))
 into deadline from public.identity_sessions s where s.id=(p_context->>'sessionId')::uuid;
 result:=jsonb_build_object('draftId',d.id,'version',d.version,'tenantName',left((select display_name from public.tenants where id=tenant),160),
  'synthetic',p_provenance='local-synthetic','role',ctx->>'role','canRecord',actor<>d.actor_id,'expiresAt',deadline,
  'recordUntil',least(clock_timestamp()+interval '24 hours',coalesce(g.expires_at,'infinity'),
   (select expires_at from commerce_private.catalogue_versions where id=d.catalogue_id),(select expires_at from commerce_private.delivery_quotes where id=d.delivery_quote_id),
   (select expires_at from intake_private.publications where id=i.publication_id)),
  'items',(select jsonb_agg(jsonb_build_object('description',v->>'description','quantity',(v->>'quantity')::integer)) from jsonb_array_elements(d.snapshot->'items') v),
  'evidence',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'kind',v.kind,'expiresAt',v.expires_at,'current',commerce_private.product_evidence_current(v.id),
   'canRevoke',v.actor_id=actor) order by v.kind) from (select distinct on(e.kind) e.* from commerce_private.product_quote_evidence e where e.draft_id=d.id order by e.kind,e.recorded_at desc,e.id desc)v),'[]'::jsonb));
 perform intake_private.workforce(p_context);
 if ctx->>'role'='clinician' then perform intake_private.medical_grant(p_context,i.id,'medical_review');
 else perform public.read_operations_queue((p_context->>'providerSubject')::uuid,(p_context->>'providerSessionId')::uuid,p_context->>'verifiedEmail',(p_context->>'sessionId')::uuid,actor,tenant,c.id);end if;
 if deadline<=clock_timestamp() then raise exception using errcode='42501',message='PRODUCT_EVIDENCE_REJECTED';end if;
 return result;
end $$;
revoke all on function public.staff_product_evidence(jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.staff_product_evidence(jsonb,jsonb,text) to service_role;
select identity_private.assert_mobile_orphan_guard_coverage();
commit;
