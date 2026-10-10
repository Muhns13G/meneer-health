begin;
-- Labels are presentation metadata only. Preserve the reviewed resolver's authority checks.
alter function public.list_workforce_contexts(uuid,uuid,text) rename to list_workforce_contexts_before_labels;
revoke all on function public.list_workforce_contexts_before_labels(uuid,uuid,text) from public,anon,authenticated,service_role;
create function public.list_workforce_contexts(p_provider_subject uuid,p_provider_session_id uuid,p_verified_email text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare choices jsonb; result jsonb;
begin
 choices:=public.list_workforce_contexts_before_labels(p_provider_subject,p_provider_session_id,p_verified_email);
 select jsonb_agg(c.value || jsonb_build_object('tenantName',left(t.display_name,160)) order by c.ordinality)
 into result from jsonb_array_elements(choices) with ordinality c(value,ordinality)
 join public.tenants t on t.id=(c.value->>'tenantId')::uuid;
 return result;
end $$;
revoke all on function public.list_workforce_contexts(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.list_workforce_contexts(uuid,uuid,text) to service_role;

create table commerce_private.product_quote_drafts (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null,
 case_id uuid not null, subject_id uuid not null references public.subjects(id),
 actor_id uuid not null references public.subjects(id), version integer not null check(version>0),
 case_version integer not null check(case_version>0), catalogue_id uuid not null,
 delivery_quote_id uuid not null references commerce_private.product_delivery_bindings(quote_id),
 address_snapshot_id uuid not null, request_key uuid not null,
 fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
 created_at timestamptz not null default clock_timestamp(),
 unique(case_id,version), unique(tenant_id,actor_id,request_key),
 foreign key(case_id,tenant_id,subject_id) references public.operations_cases(id,tenant_id,subject_id),
 foreign key(catalogue_id,tenant_id) references commerce_private.catalogue_versions(id,tenant_id),
 foreign key(address_snapshot_id,tenant_id,case_id,subject_id) references commerce_private.shipping_address_snapshots(id,tenant_id,case_id,subject_id)
);
create index product_quote_actor_idx on commerce_private.product_quote_drafts(actor_id);
create index product_quote_subject_idx on commerce_private.product_quote_drafts(subject_id);
create index product_quote_catalogue_idx on commerce_private.product_quote_drafts(catalogue_id,tenant_id);
create index product_quote_delivery_idx on commerce_private.product_quote_drafts(delivery_quote_id);
create index product_quote_address_idx on commerce_private.product_quote_drafts(address_snapshot_id,tenant_id,case_id,subject_id);
alter table commerce_private.product_quote_drafts enable row level security;
alter table commerce_private.product_quote_drafts force row level security;
revoke all on commerce_private.product_quote_drafts from public,anon,authenticated,service_role;
create trigger product_quote_drafts_immutable before update or delete on commerce_private.product_quote_drafts
 for each row execute function audit_private.reject_append_only_mutation();
create trigger mobile_orphan_reference_guard before insert or update on commerce_private.product_quote_drafts
 for each row execute function identity_private.guard_mobile_orphan_reference('subject_id','actor_id');

create function public.staff_product_quote(p_authority jsonb,p_command jsonb,p_provenance text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare ctx jsonb; detail jsonb; c public.operations_cases; batch commerce_private.catalogue_versions;
 delivery commerce_private.delivery_quotes; binding commerce_private.product_delivery_bindings;
 prior commerce_private.product_quote_drafts; latest commerce_private.product_quote_drafts;
 item jsonb; row_item commerce_private.catalogue_items; lines jsonb:='[]';
 subtotal bigint:=0; quantity integer; current_version integer; fp text; ref uuid; result jsonb;
 actor uuid; tenant uuid; case_ref uuid; deadline timestamptz;
begin
 if p_authority is null or jsonb_typeof(p_authority)<>'object' or
  not(p_authority ?& array['p_provider_subject','p_provider_session_id','p_verified_email','p_session_id','p_subject_id','p_tenant_id'])
  or p_authority-array['p_provider_subject','p_provider_session_id','p_verified_email','p_session_id','p_subject_id','p_tenant_id']<>'{}'::jsonb
  or exists(select 1 from jsonb_each(p_authority) e where jsonb_typeof(e.value)<>'string') then
  raise exception using errcode='42501',message='QUOTE_REJECTED';end if;
 if p_provenance is null or p_provenance not in('local-synthetic','precise-wellness-rrp') or
  p_command is null or jsonb_typeof(p_command)<>'object' or p_command->>'action' is null or
  p_command->>'action' not in('read','prepare_draft') or not(p_command ? 'caseId') then
  raise exception using errcode='22023',message='QUOTE_INPUT_INVALID';end if;
 if p_command->>'action'='read' then
  if p_command-array['action','caseId']<>'{}'::jsonb then raise exception using errcode='22023',message='QUOTE_INPUT_INVALID';end if;
 else
  if not(p_command ?& array['action','caseId','catalogueId','deliveryQuoteId','expectedCaseVersion','expectedDraftVersion','requestKey','items'])
   or p_command-array['action','caseId','catalogueId','deliveryQuoteId','expectedCaseVersion','expectedDraftVersion','requestKey','items']<>'{}'::jsonb
   or jsonb_typeof(p_command->'items')<>'array' or jsonb_array_length(p_command->'items') not between 1 and 20
   or jsonb_typeof(p_command->'expectedCaseVersion')<>'number' or (p_command->>'expectedCaseVersion') !~ '^[1-9][0-9]{0,8}$'
   or jsonb_typeof(p_command->'expectedDraftVersion')<>'number' or (p_command->>'expectedDraftVersion') !~ '^(0|[1-9][0-9]{0,8})$'
   or exists(select 1 from jsonb_each(p_command) e where e.value='null'::jsonb) then
   raise exception using errcode='22023',message='QUOTE_INPUT_INVALID';end if;
  for item in select value from jsonb_array_elements(p_command->'items') loop
   if jsonb_typeof(item)<>'object' or not(item ?& array['productId','quantity']) or
    item-array['productId','quantity']<>'{}'::jsonb or jsonb_typeof(item->'productId')<>'string' or
    jsonb_typeof(item->'quantity')<>'number' or (item->>'quantity') !~ '^([1-9]|10)$' then
    raise exception using errcode='22023',message='QUOTE_INPUT_INVALID';end if;
  end loop;
  if (select count(distinct value->>'productId') from jsonb_array_elements(p_command->'items'))<>jsonb_array_length(p_command->'items') then
   raise exception using errcode='22023',message='QUOTE_INPUT_INVALID';end if;
 end if;
 actor:=(p_authority->>'p_subject_id')::uuid;tenant:=(p_authority->>'p_tenant_id')::uuid;case_ref:=(p_command->>'caseId')::uuid;
 ctx:=public.resolve_workforce_context((p_authority->>'p_provider_subject')::uuid,(p_authority->>'p_provider_session_id')::uuid,
  p_authority->>'p_verified_email',(p_authority->>'p_session_id')::uuid,actor,tenant);
 if ctx->>'role'<>'operations' or ctx->>'purpose'<>'operations' or not exists(
  select 1 from auth.mfa_amr_claims where session_id=(p_authority->>'p_provider_session_id')::uuid
  and authentication_method='totp' and updated_at<=clock_timestamp() and updated_at>clock_timestamp()-interval '5 minutes') then
  raise exception using errcode='42501',message='QUOTE_REJECTED';end if;
 -- Authorise before touching a case, then serialize writers and recheck locked authority.
 detail:=public.read_operations_queue((p_authority->>'p_provider_subject')::uuid,(p_authority->>'p_provider_session_id')::uuid,
  p_authority->>'p_verified_email',(p_authority->>'p_session_id')::uuid,actor,tenant,case_ref);
 if p_command->>'action'='prepare_draft' then
  perform pg_advisory_xact_lock(hashtextextended(tenant::text||actor::text||(p_command->>'requestKey'),15104));
 end if;
 select * into c from public.operations_cases where id=case_ref and tenant_id=tenant for update;
 perform 1 from public.subjects where id=c.subject_id and status='active' for share;
 if not found then raise exception using errcode='42501',message='QUOTE_REJECTED';end if;
 perform 1 from public.client_profiles where tenant_id=tenant and subject_id=c.subject_id for share;
 perform 1 from public.tenant_memberships where tenant_id=tenant and subject_id=c.subject_id and role='patient'
  and status='active' and valid_from<=clock_timestamp() and expires_at>clock_timestamp() for share;
 if not found then raise exception using errcode='42501',message='QUOTE_REJECTED';end if;
 perform 1 from intake_private.intakes where case_id=c.id for share;
 perform 1 from public.operations_assignments where case_id=c.id and workforce_subject_id=actor
  and role='operations' and purpose='operations' and revoked_at is null
  and starts_at<=clock_timestamp() and expires_at>clock_timestamp() for share;
 if not found then raise exception using errcode='42501',message='QUOTE_REJECTED';end if;
 detail:=public.read_operations_queue((p_authority->>'p_provider_subject')::uuid,(p_authority->>'p_provider_session_id')::uuid,
  p_authority->>'p_verified_email',(p_authority->>'p_session_id')::uuid,actor,tenant,case_ref);
 if c.state in('cancelled','handoff_exception') or not (detail->>'profileActive')::boolean or
  not (detail->>'emailVerified')::boolean or exists(select 1 from intake_private.intakes i where i.case_id=c.id
  and (i.state in('restricted','deleted') or i.safety_hold)) then
  raise exception using errcode='42501',message='QUOTE_REJECTED';end if;
 select * into batch from commerce_private.catalogue_versions where tenant_id=tenant and provenance=p_provenance
  and status='approved' and effective_at<=clock_timestamp() and expires_at>clock_timestamp()
  order by effective_at desc,created_at desc,id desc limit 1 for share;
 select * into latest from commerce_private.product_quote_drafts where case_id=c.id order by version desc limit 1;
 current_version:=coalesce(latest.version,0);
 if p_command->>'action'='prepare_draft' then
  if batch.id is null or batch.id<>(p_command->>'catalogueId')::uuid then raise exception using errcode='PT409',message='QUOTE_CONFLICT';end if;
  select * into binding from commerce_private.product_delivery_bindings where quote_id=(p_command->>'deliveryQuoteId')::uuid
   and tenant_id=tenant and case_id=c.id and subject_id=c.subject_id and catalogue_id=batch.id for share;
  select * into delivery from commerce_private.delivery_quotes where id=binding.quote_id and status='approved'
   and effective_at<=clock_timestamp() and expires_at>clock_timestamp() for share;
  perform 1 from commerce_private.shipping_address_snapshots where id=binding.address_snapshot_id
   and tenant_id=tenant and case_id=c.id and subject_id=c.subject_id and status='approved' for share;
  if not found or delivery.id is null then raise exception using errcode='PT409',message='QUOTE_CONFLICT';end if;
  for item in select value from jsonb_array_elements(p_command->'items') order by value->>'productId' loop
   quantity:=(item->>'quantity')::integer;
   select * into row_item from commerce_private.catalogue_items where catalogue_id=batch.id and product_id=(item->>'productId')::uuid;
   if row_item.product_id is null or quantity>row_item.max_quantity then raise exception using errcode='PT409',message='QUOTE_CONFLICT';end if;
   subtotal:=subtotal+row_item.unit_amount_minor::bigint*quantity;
   lines:=lines||jsonb_build_array(jsonb_build_object('productId',row_item.product_id,'quantity',quantity,
    'description',row_item.description,'unitAmountMinor',row_item.unit_amount_minor));
  end loop;
  if subtotal+delivery.amount_minor>100000000 then raise exception using errcode='22023',message='QUOTE_INPUT_INVALID';end if;
  fp:=encode(extensions.digest(p_command::text,'sha256'),'hex');
  select * into prior from commerce_private.product_quote_drafts where tenant_id=tenant and actor_id=actor and request_key=(p_command->>'requestKey')::uuid;
  if prior.id is not null then
   if prior.fingerprint<>fp or prior.case_id<>c.id then raise exception using errcode='PT409',message='QUOTE_CONFLICT';end if;
  else
   if c.version<>(p_command->>'expectedCaseVersion')::integer or current_version<>(p_command->>'expectedDraftVersion')::integer then
    raise exception using errcode='PT409',message='QUOTE_CONFLICT';end if;
   ref:=gen_random_uuid();
   insert into commerce_private.product_quote_drafts(id,tenant_id,case_id,subject_id,actor_id,version,case_version,catalogue_id,
    delivery_quote_id,address_snapshot_id,request_key,fingerprint,snapshot)
   values(ref,tenant,c.id,c.subject_id,actor,current_version+1,c.version,batch.id,delivery.id,binding.address_snapshot_id,
    (p_command->>'requestKey')::uuid,fp,jsonb_build_object('draftId',ref,'version',current_version+1,
    'items',lines,'productSubtotalMinor',subtotal,'deliveryMinor',delivery.amount_minor,'totalBeforeCreditMinor',subtotal+delivery.amount_minor));
   perform audit_private.append_audit_fact(tenant,'workforce',actor,'operations','aal2','product.quote.drafted',c.subject_id,
    'product_quote',ref::text,'operations','sprint-15.4-v1','succeeded','QUOTE_DRAFT_RECORDED',ref::text,ref::text,clock_timestamp(),'{}');
   select * into latest from commerce_private.product_quote_drafts where id=ref;
  end if;
 end if;
 select least(s.idle_expires_at,s.absolute_expires_at,clock_timestamp()+interval '5 minutes',coalesce(batch.expires_at,'infinity'),
  (select max(updated_at)+interval '5 minutes' from auth.mfa_amr_claims where session_id=s.provider_session_id and authentication_method='totp'))
  into deadline from public.identity_sessions s where s.id=(p_authority->>'p_session_id')::uuid;
 result:=jsonb_build_object('caseId',c.id,'caseVersion',c.version,'tenantName',left((select display_name from public.tenants where id=tenant),160),
  'catalogueId',batch.id,'synthetic',p_provenance='local-synthetic','expiresAt',deadline,
  'items',coalesce((select jsonb_agg(jsonb_build_object('productId',i.product_id,'description',i.description,
   'unitAmountMinor',i.unit_amount_minor,'maxQuantity',i.max_quantity,'interested',exists(select 1 from commerce_private.product_interests pi
   where pi.tenant_id=tenant and pi.subject_id=c.subject_id and pi.catalogue_id=batch.id and pi.product_id=i.product_id)) order by i.sku)
   from commerce_private.catalogue_items i where i.catalogue_id=batch.id),'[]'::jsonb),
  'deliveries',coalesce((select jsonb_agg(v.payload order by v.id) from (select d.id,jsonb_build_object('deliveryQuoteId',d.id,
   'addressSnapshotId',b.address_snapshot_id,'amountMinor',d.amount_minor) payload from commerce_private.product_delivery_bindings b
   join commerce_private.delivery_quotes d on d.id=b.quote_id join commerce_private.shipping_address_snapshots a on a.id=b.address_snapshot_id
   where b.tenant_id=tenant and b.case_id=c.id and b.subject_id=c.subject_id and b.catalogue_id=batch.id and a.status='approved'
   and d.status='approved' and d.effective_at<=clock_timestamp() and d.expires_at>clock_timestamp() order by d.id limit 25) v),'[]'::jsonb),
  'draft',latest.snapshot);
 -- Native session deadline/assignment recheck also aborts draft and audit together.
 perform public.read_operations_queue((p_authority->>'p_provider_subject')::uuid,(p_authority->>'p_provider_session_id')::uuid,
  p_authority->>'p_verified_email',(p_authority->>'p_session_id')::uuid,actor,tenant,c.id);
 if deadline<=clock_timestamp() or not exists(select 1 from auth.mfa_amr_claims
  where session_id=(p_authority->>'p_provider_session_id')::uuid and authentication_method='totp'
  and updated_at<=clock_timestamp() and updated_at>clock_timestamp()-interval '5 minutes') then
  raise exception using errcode='42501',message='QUOTE_REJECTED';end if;
 return result;
end $$;
revoke all on function public.staff_product_quote(jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.staff_product_quote(jsonb,jsonb,text) to service_role;
select identity_private.assert_mobile_orphan_guard_coverage();
commit;
