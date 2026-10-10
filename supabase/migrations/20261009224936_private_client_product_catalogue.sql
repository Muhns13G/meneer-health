-- Task 15.3: own-onboarded client catalogue/interest only, not payable offers or clinical approval.
begin;
create table commerce_private.product_interests (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null,
 subject_id uuid not null references public.subjects(id),
 catalogue_id uuid not null,
 product_id uuid not null,
 request_key uuid not null,
 recorded_at timestamptz not null default clock_timestamp(),
 unique(tenant_id,subject_id,request_key),
 foreign key(catalogue_id,tenant_id) references commerce_private.catalogue_versions(id,tenant_id),
 foreign key(catalogue_id,product_id) references commerce_private.catalogue_items(catalogue_id,product_id)
);
create index product_interest_subject_idx on commerce_private.product_interests(subject_id);
create index product_interest_product_idx on commerce_private.product_interests(catalogue_id,product_id,subject_id);
alter table commerce_private.product_interests enable row level security;
alter table commerce_private.product_interests force row level security;
revoke all on commerce_private.product_interests from public,anon,authenticated,service_role;
create trigger product_interest_immutable before update or delete on commerce_private.product_interests
 for each row execute function audit_private.reject_append_only_mutation();
create trigger mobile_orphan_reference_guard before insert or update on commerce_private.product_interests
 for each row execute function identity_private.guard_mobile_orphan_reference('subject_id');
select identity_private.assert_mobile_orphan_guard_coverage();

create function public.patient_product_catalogue(p_context jsonb,p_command jsonb,p_provenance text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare t uuid;s uuid;batch commerce_private.catalogue_versions;prior commerce_private.product_interests;
 key uuid; product uuid; view jsonb; deadline timestamptz:=clock_timestamp()+interval '5 minutes';
begin
 perform intake_private.patient_authority(p_context);
 t:=(p_context->>'tenantId')::uuid;s:=(p_context->>'subjectId')::uuid;
 if p_provenance is null or p_provenance not in('local-synthetic','precise-wellness-rrp') then
 raise exception using errcode='42501',message='CATALOGUE_REJECTED';end if;
 if p_command is null or jsonb_typeof(p_command)<>'object' or p_command->>'action' is null or
 p_command->>'action' not in('read','register_interest') then
 raise exception using errcode='22023',message='CATALOGUE_COMMAND_INVALID';end if;
 if p_command->>'action'='read' and p_command<>'{"action":"read"}'::jsonb then
 raise exception using errcode='22023',message='CATALOGUE_COMMAND_INVALID';end if;
 if p_command->>'action'='register_interest' then
  if not(p_command ?& array['action','catalogueId','productId','requestKey']) or
   p_command-array['action','catalogueId','productId','requestKey']<>'{}'::jsonb or
   exists(select 1 from jsonb_each(p_command) e where e.value='null'::jsonb) then
   raise exception using errcode='22023',message='CATALOGUE_COMMAND_INVALID';end if;
  key:=(p_command->>'requestKey')::uuid;product:=(p_command->>'productId')::uuid;
  -- Serialize same-client retries/concurrent submissions; never reserve money or stock.
  perform 1 from public.subjects where id=s for update;
 end if;
 select * into batch from commerce_private.catalogue_versions v where v.tenant_id=t
 and v.provenance=p_provenance and v.status='approved' and v.effective_at<=clock_timestamp()
 and v.expires_at>clock_timestamp() order by v.effective_at desc,v.created_at desc,v.id desc limit 1 for share;
 if p_command->>'action'='register_interest' then
  if batch.id is null or batch.id<>(p_command->>'catalogueId')::uuid or not exists(select 1
    from commerce_private.catalogue_items i where i.catalogue_id=batch.id and i.product_id=product) then
   raise exception using errcode='PT409',message='CATALOGUE_CHANGED';end if;
  select * into prior from commerce_private.product_interests i where i.tenant_id=t and i.subject_id=s and i.request_key=key;
  if prior.id is not null then
   if prior.catalogue_id<>batch.id or prior.product_id<>product then
    raise exception using errcode='PT409',message='CATALOGUE_INTEREST_CONFLICT';end if;
  else
   insert into commerce_private.product_interests(tenant_id,subject_id,catalogue_id,product_id,request_key)
    values(t,s,batch.id,product,key) returning * into prior;
   perform audit_private.append_audit_fact(t,'patient',s,'patient','aal1','catalogue.interest.recorded',
    s,'catalogue_interest',prior.id::text,'account','sprint-15.3-v1','succeeded','INTEREST_RECORDED',
    key::text,key::text,clock_timestamp(),'{}'::jsonb);
  end if;
 end if;
 if batch.id is null then
  view:=jsonb_build_object('catalogueId',null,'version',null,'synthetic',p_provenance='local-synthetic','items','[]'::jsonb);
 else
  deadline:=least(deadline,batch.expires_at);
  select jsonb_build_object('catalogueId',batch.id,'version',batch.version,'synthetic',batch.provenance='local-synthetic',
   'items',coalesce(jsonb_agg(jsonb_build_object('productId',i.product_id,'description',i.description,
   'unitAmountMinor',i.unit_amount_minor,'currency',batch.currency,'interested',exists(select 1
    from commerce_private.product_interests r where r.tenant_id=t and r.subject_id=s and r.catalogue_id=batch.id and r.product_id=i.product_id))
   order by i.description,i.product_id),'[]'::jsonb)) into view from commerce_private.catalogue_items i where i.catalogue_id=batch.id;
 end if;
 perform intake_private.patient_authority(p_context);
 return view||jsonb_build_object('expiresAt',deadline);
end $$;
revoke all on function public.patient_product_catalogue(jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.patient_product_catalogue(jsonb,jsonb,text) to service_role;
commit;
