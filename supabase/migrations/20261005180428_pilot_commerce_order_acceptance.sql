create table commerce_private.order_publications (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id),
 scenario text not null check(scenario in ('review_deposit','approved_product_order')),
 instrument_version text not null check(instrument_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
 locale text not null default 'en-ZA' check(locale='en-ZA'),
 supplier text not null check(length(supplier) between 1 and 1200),
 body text not null check(length(body) between 1 and 16000),
 content_hash text not null check(content_hash ~ '^[a-f0-9]{64}$'),
 approval_reference uuid not null,
 effective_at timestamptz not null,
 expires_at timestamptz not null check(expires_at>effective_at),
 status text not null check(status in ('published','withdrawn'))
);
create index commerce_publication_scope_idx on commerce_private.order_publications(tenant_id,scenario,effective_at);
create function commerce_private.order_publication_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' or (tg_op='UPDATE' and (old.status<>'published' or new.status<>'withdrawn'
  or (to_jsonb(new)-'status')<>(to_jsonb(old)-'status'))) then
  raise exception using errcode='42501',message='COMMERCE_PUBLICATION_IMMUTABLE';end if;
 if tg_op='INSERT' then new.content_hash:=encode(extensions.digest(convert_to(
  jsonb_build_object('version',new.instrument_version,'locale',new.locale,'supplier',new.supplier,'body',new.body)::text,'UTF8'),'sha256'),'hex');end if;
 return new;
end $$;
create trigger order_publications_immutable before insert or update or delete on commerce_private.order_publications
 for each row execute function commerce_private.order_publication_guard();

create table commerce_private.order_acceptances (
 id uuid primary key default gen_random_uuid(),
 offer_id uuid not null unique references commerce_private.offers(id),
 publication_id uuid not null references commerce_private.order_publications(id),
 subject_id uuid not null references public.subjects(id),
 tenant_id uuid not null references public.tenants(id),
 session_id uuid not null references public.identity_sessions(id),
 content_hash text not null,
 snapshot_hash text not null,
 request_key uuid not null,
 correlation_id uuid not null default gen_random_uuid(),
 recorded_at timestamptz not null default clock_timestamp(),
 assurance text not null check(assurance in ('aal1','aal2')),
 unique(tenant_id,subject_id,request_key)
);
create index commerce_accept_publication_idx on commerce_private.order_acceptances(publication_id);
create index commerce_accept_subject_idx on commerce_private.order_acceptances(subject_id);
create index commerce_accept_session_idx on commerce_private.order_acceptances(session_id);
create trigger order_acceptances_append_only before update or delete on commerce_private.order_acceptances
 for each row execute function audit_private.reject_append_only_mutation();
alter table commerce_private.order_publications enable row level security;
alter table commerce_private.order_publications force row level security;
alter table commerce_private.order_acceptances enable row level security;
alter table commerce_private.order_acceptances force row level security;
revoke all on all tables in schema commerce_private from public,anon,authenticated,service_role;
revoke all on all functions in schema commerce_private from public,anon,authenticated,service_role;

create function public.patient_order_review(p_context jsonb,p_command jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare account jsonb;o commerce_private.offers;p commerce_private.order_publications;
 receipt commerce_private.order_acceptances; view jsonb; snapshot_hash text; expiry timestamptz;
 correlation uuid:=gen_random_uuid(); action text; lines jsonb;
begin
 account:=intake_private.patient_authority(p_context);
 if p_command is null or jsonb_typeof(p_command)<>'object' then
  raise exception using errcode='22023',message='COMMERCE_INVALID';end if;
 action:=p_command->>'action';
 if action='read' then
  if (select count(*) from jsonb_object_keys(p_command))<>1 then raise exception using errcode='22023',message='COMMERCE_INVALID';end if;
  select * into o from commerce_private.offers where tenant_id=(p_context->>'tenantId')::uuid
   and subject_id=(p_context->>'subjectId')::uuid and expires_at>clock_timestamp() order by created_at desc,id desc limit 1;
  if o.id is null then return jsonb_build_object('review',null);end if;
 elsif action='accept' then
  if (select count(*) from jsonb_object_keys(p_command))<>7 or not(p_command ?& array[
   'action','offerId','publicationId','snapshotHash','contentHash','requestKey','accepted'])
   or p_command->'accepted' is distinct from 'true'::jsonb
   or p_command->>'offerId' is null or p_command->>'publicationId' is null
   or p_command->>'snapshotHash' is null or p_command->>'contentHash' is null
   or p_command->>'snapshotHash' !~ '^[a-f0-9]{64}$' or p_command->>'contentHash' !~ '^[a-f0-9]{64}$'
   or p_command->>'requestKey' is null then raise exception using errcode='22023',message='COMMERCE_INVALID';end if;
  select * into o from commerce_private.offers where id=(p_command->>'offerId')::uuid
   and tenant_id=(p_context->>'tenantId')::uuid and subject_id=(p_context->>'subjectId')::uuid;
  if o.id is null then raise exception using errcode='42501',message='COMMERCE_REJECTED';end if;
 else raise exception using errcode='22023',message='COMMERCE_INVALID';end if;
 -- Same case-first lock order as preparation. Recheck current catalogue, funding and clinical gates.
 perform commerce_private.prepare_offer(o.tenant_id,o.subject_id,o.case_id,o.selection);
 select * into o from commerce_private.offers where id=o.id for update;
 select * into p from commerce_private.order_publications where tenant_id=o.tenant_id
   and scenario=o.snapshot->>'scenario' and status='published' and effective_at<=clock_timestamp()
   and expires_at>clock_timestamp() order by effective_at desc,id desc limit 1 for share;
 if p.id is null then raise exception using errcode='42501',message='COMMERCE_TERMS_UNAVAILABLE';end if;
 snapshot_hash:=encode(extensions.digest(convert_to(o.snapshot::text,'UTF8'),'sha256'),'hex');
 if action='accept' then
  if p.id<>(p_command->>'publicationId')::uuid or p.content_hash<>p_command->>'contentHash'
   or snapshot_hash<>p_command->>'snapshotHash' then
    raise exception using errcode='40001',message='COMMERCE_CONFLICT';end if;
  select * into receipt from commerce_private.order_acceptances where offer_id=o.id;
  if receipt.id is not null then
   if receipt.request_key<>(p_command->>'requestKey')::uuid or receipt.publication_id<>p.id
     or receipt.snapshot_hash<>snapshot_hash or receipt.subject_id<>o.subject_id then
    raise exception using errcode='40001',message='COMMERCE_CONFLICT';end if;
  else
   insert into commerce_private.order_acceptances(offer_id,publication_id,subject_id,tenant_id,
    session_id,content_hash,snapshot_hash,request_key,correlation_id,assurance)
   values(o.id,p.id,o.subject_id,o.tenant_id,(p_context->>'sessionId')::uuid,p.content_hash,snapshot_hash,
    (p_command->>'requestKey')::uuid,correlation,(select assurance from public.identity_sessions where id=(p_context->>'sessionId')::uuid))
    returning * into receipt;
  end if;
 else select * into receipt from commerce_private.order_acceptances where offer_id=o.id;end if;
 if receipt.id is not null and (receipt.publication_id<>p.id or receipt.snapshot_hash<>snapshot_hash
  or receipt.content_hash<>p.content_hash) then raise exception using errcode='40001',message='COMMERCE_CONFLICT';end if;
 select jsonb_agg(jsonb_build_object('description',line->>'description','quantity',coalesce((line->>'quantity')::integer,1),
 'unitAmountMinor',(line->>'unit_amount_minor')::integer,'priceVersion',line->>'version',
 'taxTreatment',line->>'tax_treatment')) into lines
 from jsonb_array_elements(o.snapshot->'lines') line;
 expiry:=least(o.expires_at,p.expires_at,(select least(idle_expires_at,absolute_expires_at)
   from public.identity_sessions where id=(p_context->>'sessionId')::uuid));
 perform audit_private.append_audit_fact(o.tenant_id,'patient',o.subject_id,'patient','aal1',
  'commerce.order.'||action,o.subject_id,'payment',o.id::text,'account','sprint-11.3-v1','succeeded',
  'ORDER_REVIEW_FACT',correlation::text,correlation::text,clock_timestamp(),'{}');
 account:=intake_private.patient_authority(p_context);
 if expiry<=clock_timestamp() then raise exception using errcode='42501',message='COMMERCE_REJECTED';end if;
 view:=jsonb_build_object('offerId',o.id,'scenario',o.snapshot->>'scenario','currency','zar','lines',lines,
  'productSubtotalMinor',coalesce((o.snapshot->>'productSubtotalMinor')::integer,0),
  'deliveryMinor',coalesce((o.snapshot->>'deliveryMinor')::integer,0),
  'creditMinor',(o.snapshot->>'creditMinor')::integer,'amountTotalMinor',(o.snapshot->>'amountTotalMinor')::integer,
  'unusedDepositRefundMinor',(o.snapshot->>'unusedDepositRefundMinor')::integer,
  'deliveryVersion',o.snapshot->'deliveryQuote'->>'version',
  'snapshotHash',snapshot_hash,'expiresAt',expiry,'terms',jsonb_build_object('publicationId',p.id,
  'version',p.instrument_version,'effectiveAt',p.effective_at,'locale',p.locale,'supplier',p.supplier,'body',p.body,'contentHash',p.content_hash),
  'acceptance',case when receipt.id is null then null else jsonb_build_object('receiptId',receipt.id,
   'recordedAt',receipt.recorded_at) end,'checkoutEnabled',false);
 return jsonb_build_object('review',view);
end $$;
revoke all on function public.patient_order_review(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.patient_order_review(jsonb,jsonb) to service_role;
