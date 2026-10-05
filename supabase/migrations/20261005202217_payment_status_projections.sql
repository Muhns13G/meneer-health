-- Read-only financial facts; no funding, credit, clinical or delivery activation.
create index commerce_offer_payment_page_idx on commerce_private.offers(tenant_id,subject_id,created_at,id);
create index commerce_offer_case_payment_page_idx on commerce_private.offers(tenant_id,subject_id,case_id,created_at,id);
create function commerce_private.payment_status_page(t uuid,s uuid,c uuid,cursor jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare result jsonb;
begin
 if cursor is not null and (jsonb_typeof(cursor)<>'object'
  or (select count(*) from jsonb_object_keys(cursor))<>2
  or not(cursor ? 'createdAt' and cursor ? 'id')
  or jsonb_typeof(cursor->'createdAt') is distinct from 'string'
  or jsonb_typeof(cursor->'id') is distinct from 'string') then
  raise exception using errcode='22023',message='PAYMENT_CURSOR_INVALID';
 end if;
 with facts as (
  select o.id,o.created_at,jsonb_build_object(
   'reference',o.id,'scenario',o.snapshot->>'scenario','currency','zar',
   'amountTotalMinor',(o.snapshot->>'amountTotalMinor')::integer,
   'refundedMinor',coalesce(f.refunded_minor,0),
   'status',case
    when f.paid_confirmed then 'confirmed'
    when f.no_additional_payment then 'not_required'
    when f.failure_seen then 'failed'
    when f.expiry_seen then 'expired'
    when i.id is not null then 'pending' else 'not_started' end,
   'dispute',coalesce(f.dispute_seen,false),
   'requiresReview',coalesce(f.reconciliation_required,false),
   'createdAt',o.created_at) payload
  from commerce_private.offers o
  left join commerce_private.checkout_intents i on i.offer_id=o.id
  left join commerce_private.settlements f on f.intent_id=i.id
  where o.tenant_id=t and o.subject_id=s and (c is null or o.case_id=c)
   and (cursor is null or (o.created_at,o.id)>
    ((cursor->>'createdAt')::timestamptz,(cursor->>'id')::uuid))
  order by o.created_at,o.id limit 26
 ), page as (select * from facts order by created_at,id limit 25)
 select jsonb_build_object('payments',coalesce((select jsonb_agg(payload order by created_at,id)
  from page),'[]'::jsonb),'nextCursor',case when (select count(*) from facts)>25 then
  (select jsonb_build_object('createdAt',created_at,'id',id) from page order by created_at desc,id desc limit 1)
  else null end) into result;
 return result;
end $$;
revoke all on function commerce_private.payment_status_page(uuid,uuid,uuid,jsonb)
 from public,anon,authenticated,service_role;

create function public.read_patient_payment_status(p_context jsonb,p_cursor jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare account jsonb; result jsonb; correlation uuid:=extensions.gen_random_uuid(); deadline timestamptz;
begin
 account:=intake_private.patient_authority(p_context);
 result:=commerce_private.payment_status_page((p_context->>'tenantId')::uuid,
  (p_context->>'subjectId')::uuid,null,p_cursor);
 perform audit_private.append_audit_fact((p_context->>'tenantId')::uuid,'patient',
  (p_context->>'subjectId')::uuid,'patient','aal1','commerce.status.read',
  (p_context->>'subjectId')::uuid,'payment',(p_context->>'subjectId'),'account',
  'sprint-11.6-v1','succeeded','PAYMENT_STATUS_READ',correlation::text,correlation::text,clock_timestamp(),'{}');
 account:=intake_private.patient_authority(p_context);
 select least(i.idle_expires_at,i.absolute_expires_at,a.not_after,m.expires_at) into deadline
 from public.identity_sessions i join auth.sessions a on a.id=i.provider_session_id
 join public.tenant_memberships m on m.subject_id=i.subject_id and m.tenant_id=(p_context->>'tenantId')::uuid
 and m.role='patient' and m.status='active'
 where i.id=(p_context->>'sessionId')::uuid;
 if deadline is null or deadline<=clock_timestamp() then
  raise exception using errcode='42501',message='PORTAL_REJECTED';end if;
 return result||jsonb_build_object('expiresAt',deadline);
end $$;
revoke all on function public.read_patient_payment_status(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.read_patient_payment_status(jsonb,jsonb) to service_role;

create function public.read_staff_payment_status(p_provider_subject uuid,p_provider_session_id uuid,
 p_verified_email text,p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,p_case_id uuid,
 p_cursor jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; target uuid; deadline timestamptz; correlation uuid:=extensions.gen_random_uuid();
begin
 if p_case_id is null then raise exception using errcode='42501',message='QUEUE_REJECTED';end if;
 perform public.read_operations_queue(p_provider_subject,p_provider_session_id,p_verified_email,
  p_session_id,p_subject_id,p_tenant_id,p_case_id);
 select subject_id into target from public.operations_cases where id=p_case_id and tenant_id=p_tenant_id;
 result:=commerce_private.payment_status_page(p_tenant_id,target,p_case_id,p_cursor);
 perform audit_private.append_audit_fact(p_tenant_id,'workforce',p_subject_id,'operations','aal2',
  'commerce.status.read',target,'payment',p_case_id::text,'operations','sprint-11.6-v1',
  'succeeded','PAYMENT_STATUS_READ',correlation::text,correlation::text,clock_timestamp(),'{}');
 perform public.read_operations_queue(p_provider_subject,p_provider_session_id,p_verified_email,
  p_session_id,p_subject_id,p_tenant_id,p_case_id);
 select least(a.expires_at,i.idle_expires_at,i.absolute_expires_at,provider.not_after,m.expires_at) into deadline
 from public.operations_assignments a join public.identity_sessions i on i.id=p_session_id
 join auth.sessions provider on provider.id=p_provider_session_id
 join public.tenant_memberships m on m.tenant_id=p_tenant_id and m.subject_id=p_subject_id
  and m.role='operations' and m.status='active'
 where a.case_id=p_case_id and a.tenant_id=p_tenant_id and a.subject_id=target
  and a.workforce_subject_id=p_subject_id and a.role='operations' and a.purpose='operations'
  and a.revoked_at is null and a.starts_at<=clock_timestamp() and a.expires_at>clock_timestamp()
  and (provider.not_after is null or provider.not_after>clock_timestamp())
  and m.valid_from<=clock_timestamp() and m.expires_at>clock_timestamp()
 order by a.expires_at desc limit 1;
 if deadline is null or deadline<=clock_timestamp() then
  raise exception using errcode='42501',message='QUEUE_REJECTED';end if;
 return result||jsonb_build_object('expiresAt',deadline);
end $$;
revoke all on function public.read_staff_payment_status(uuid,uuid,text,uuid,uuid,uuid,uuid,jsonb)
 from public,anon,authenticated;
grant execute on function public.read_staff_payment_status(uuid,uuid,text,uuid,uuid,uuid,uuid,jsonb) to service_role;
