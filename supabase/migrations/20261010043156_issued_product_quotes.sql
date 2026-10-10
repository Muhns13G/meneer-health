begin;
alter table commerce_private.prices drop constraint prices_environment_check;
alter table commerce_private.prices add constraint prices_environment_check
 check(environment='local-synthetic' or (kind='product' and environment='precise-wellness-rrp'));

create table commerce_private.catalogue_price_bindings (
 catalogue_id uuid not null, product_id uuid not null, price_id uuid not null unique references commerce_private.prices(id),
 primary key(catalogue_id,product_id),
 foreign key(catalogue_id,product_id) references commerce_private.catalogue_items(catalogue_id,product_id)
);
create table commerce_private.product_quote_releases (
 tenant_id uuid primary key references public.tenants(id),
 provenance text not null check(provenance in('local-synthetic','precise-wellness-rrp')),
 approval_reference uuid not null, expires_at timestamptz not null, enabled boolean not null default false
);
create table commerce_private.issued_product_quotes (
 offer_id uuid primary key references commerce_private.offers(id), draft_id uuid not null unique references commerce_private.product_quote_drafts(id),
 tenant_id uuid not null, subject_id uuid not null references public.subjects(id), case_id uuid not null,
 actor_id uuid not null references public.subjects(id), publication_id uuid not null references commerce_private.order_publications(id),
 clinical_id uuid not null references commerce_private.product_quote_evidence(id),
 stock_id uuid not null references commerce_private.product_quote_evidence(id),
 pharmacy_id uuid not null references commerce_private.product_quote_evidence(id),
 custody_id uuid not null references commerce_private.product_quote_evidence(id),
 request_key uuid not null, fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
 recorded_at timestamptz not null default clock_timestamp(), unique(tenant_id,actor_id,request_key),
 foreign key(case_id,tenant_id,subject_id) references public.operations_cases(id,tenant_id,subject_id)
);
create index issued_quote_subject_idx on commerce_private.issued_product_quotes(subject_id);
create index issued_quote_actor_idx on commerce_private.issued_product_quotes(actor_id);
create index issued_quote_case_idx on commerce_private.issued_product_quotes(case_id,tenant_id,subject_id);
create index issued_quote_publication_idx on commerce_private.issued_product_quotes(publication_id);
create index issued_quote_clinical_idx on commerce_private.issued_product_quotes(clinical_id);
create index issued_quote_stock_idx on commerce_private.issued_product_quotes(stock_id);
create index issued_quote_pharmacy_idx on commerce_private.issued_product_quotes(pharmacy_id);
create index issued_quote_custody_idx on commerce_private.issued_product_quotes(custody_id);
create table commerce_private.product_quote_dispositions (
 offer_id uuid primary key references commerce_private.issued_product_quotes(offer_id),
 tenant_id uuid not null references public.tenants(id), actor_id uuid not null references public.subjects(id),
 event text not null check(event in('declined','superseded')),
 request_key uuid not null, recorded_at timestamptz not null default clock_timestamp(), unique(tenant_id,actor_id,request_key)
);
create index quote_disposition_actor_idx on commerce_private.product_quote_dispositions(actor_id);
do $$declare n text;begin
 foreach n in array array['catalogue_price_bindings','product_quote_releases','issued_product_quotes','product_quote_dispositions'] loop
  execute format('alter table commerce_private.%I enable row level security',n);
  execute format('alter table commerce_private.%I force row level security',n);
  execute format('revoke all on commerce_private.%I from public,anon,authenticated,service_role',n);
  if n<>'product_quote_releases' then execute format('create trigger product_quote_immutable before update or delete on commerce_private.%I for each row execute function audit_private.reject_append_only_mutation()',n);end if;
 end loop;
end $$;
create trigger mobile_orphan_reference_guard before insert or update on commerce_private.issued_product_quotes
 for each row execute function identity_private.guard_mobile_orphan_reference('subject_id','actor_id');
create trigger mobile_orphan_reference_guard before insert or update on commerce_private.product_quote_dispositions
 for each row execute function identity_private.guard_mobile_orphan_reference('actor_id');

create function commerce_private.product_offer_current(target uuid) returns boolean
language plpgsql volatile set search_path='' as $$
declare q commerce_private.issued_product_quotes;begin
 select * into q from commerce_private.issued_product_quotes where offer_id=target;
 if q.offer_id is null then
  -- Retain only the old unmapped synthetic rehearsal boundary, never unlinked real/mapped prices.
  return exists(select 1 from commerce_private.offers o where o.id=target) and not exists(
   select 1 from commerce_private.offers o cross join lateral jsonb_array_elements(o.snapshot->'lines') line
   where o.id=target and (line->>'environment'='precise-wellness-rrp' or
    exists(select 1 from commerce_private.prices p where p.id=(line->>'id')::uuid and p.environment<>'local-synthetic') or
    exists(select 1 from commerce_private.catalogue_price_bindings m where m.price_id=(line->>'id')::uuid)));
 end if;
 return not exists(select 1 from commerce_private.product_quote_dispositions where offer_id=target)
 and exists(select 1 from commerce_private.product_quote_drafts d join commerce_private.catalogue_versions b on b.id=d.catalogue_id
  join commerce_private.product_quote_releases r on r.tenant_id=d.tenant_id and r.provenance=b.provenance and r.enabled and r.expires_at>clock_timestamp()
  join public.tenants t on t.id=d.tenant_id and t.status='active'
  where d.id=q.draft_id and d.case_id=q.case_id and d.tenant_id=q.tenant_id and d.subject_id=q.subject_id
  and not exists(select 1 from commerce_private.checkout_releases pay where pay.tenant_id=d.tenant_id and pay.payment_environment='live' and b.provenance<>'precise-wellness-rrp')
  and not exists(select 1 from commerce_private.catalogue_versions newer where newer.tenant_id=b.tenant_id and newer.provenance=b.provenance
   and newer.status='approved' and newer.effective_at<=clock_timestamp() and newer.expires_at>clock_timestamp()
   and (newer.effective_at,newer.created_at,newer.id)>(b.effective_at,b.created_at,b.id)))
 and exists(select 1 from commerce_private.order_publications p where p.id=q.publication_id and p.tenant_id=q.tenant_id
  and p.scenario='approved_product_order' and p.status='published' and p.effective_at<=clock_timestamp() and p.expires_at>clock_timestamp()
  and not exists(select 1 from commerce_private.order_publications newer where newer.tenant_id=p.tenant_id and newer.scenario=p.scenario
   and newer.status='published' and newer.effective_at<=clock_timestamp() and newer.expires_at>clock_timestamp()
   and (newer.effective_at,newer.id)>(p.effective_at,p.id)))
 and exists(select 1 from commerce_private.product_quote_evidence e where e.id=q.clinical_id and e.draft_id=q.draft_id and e.kind='clinical' and commerce_private.product_evidence_current(e.id))
 and exists(select 1 from commerce_private.product_quote_evidence e where e.id=q.stock_id and e.draft_id=q.draft_id and e.kind='provider_stock' and commerce_private.product_evidence_current(e.id))
 and exists(select 1 from commerce_private.product_quote_evidence e where e.id=q.pharmacy_id and e.draft_id=q.draft_id and e.kind='pharmacy_authority' and commerce_private.product_evidence_current(e.id))
 and exists(select 1 from commerce_private.product_quote_evidence e where e.id=q.custody_id and e.draft_id=q.draft_id and e.kind='address_custody' and commerce_private.product_evidence_current(e.id));
end $$;
revoke all on function commerce_private.product_offer_current(uuid) from public,anon,authenticated,service_role;

create function commerce_private.product_quote_hash(target uuid) returns text
language sql volatile set search_path='' as $$select encode(extensions.digest(jsonb_build_object(
 'offer',o.snapshot,'draft',d.snapshot,'addressSnapshotId',d.address_snapshot_id,'catalogueId',d.catalogue_id,
 'clinicalId',q.clinical_id,'stockId',q.stock_id,'pharmacyId',q.pharmacy_id,'custodyId',q.custody_id,'publicationId',q.publication_id)::text,'sha256'),'hex')
 from commerce_private.issued_product_quotes q join commerce_private.offers o on o.id=q.offer_id
 join commerce_private.product_quote_drafts d on d.id=q.draft_id where q.offer_id=target$$;
revoke all on function commerce_private.product_quote_hash(uuid) from public,anon,authenticated,service_role;

alter function commerce_private.prepare_offer(uuid,uuid,uuid,jsonb) rename to prepare_offer_before_product_quotes;
revoke all on function commerce_private.prepare_offer_before_product_quotes(uuid,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
create function commerce_private.prepare_offer(t uuid,s uuid,c uuid,command jsonb) returns jsonb
language plpgsql volatile set search_path='' as $$declare target uuid;begin
 perform 1 from public.operations_cases where id=c and tenant_id=t and subject_id=s for update;
 select id into target from commerce_private.offers where case_id=c and request_key=(command->>'requestKey')::uuid;
 if command->>'scenario'='approved_product_order' then
  if target is not null and not commerce_private.product_offer_current(target) then raise exception using errcode='42501',message='COMMERCE_NOT_READY';end if;
  if target is null and exists(select 1 from jsonb_array_elements(command->'items') item join commerce_private.prices p on p.id=(item->>'priceId')::uuid
   where p.environment<>'local-synthetic' or exists(select 1 from commerce_private.catalogue_price_bindings b where b.price_id=p.id)) then
   raise exception using errcode='42501',message='COMMERCE_NOT_READY';end if;
 end if;
 return commerce_private.prepare_offer_before_product_quotes(t,s,c,command);
end $$;
revoke all on function commerce_private.prepare_offer(uuid,uuid,uuid,jsonb) from public,anon,authenticated,service_role;

-- Keep signed money facts and original-funding refunds; changed product authority creates a hold.
do $$declare definition text; needle text:='and g.custody_ready and g.expires_at>clock_timestamp()';begin
 definition:=pg_get_functiondef('commerce_private.reconcile_receipt(text,text)'::regprocedure);
 if array_length(string_to_array(definition,needle),1)<>2 then raise exception 'PRODUCT_SETTLEMENT_GUARD_DRIFT';end if;
 execute replace(definition,needle,needle||' and commerce_private.product_offer_current(o.id)');
end $$;

create function commerce_private.dispose_unstarted_quote(target uuid,actor uuid,event text,key uuid) returns void
language plpgsql volatile set search_path='' as $$declare q commerce_private.issued_product_quotes; prior commerce_private.product_quote_dispositions;begin
 select * into q from commerce_private.issued_product_quotes where offer_id=target;
 if q.offer_id is null or event not in('declined','superseded') or key is null then raise exception using errcode='22023',message='COMMERCE_INVALID';end if;
 perform 1 from public.operations_cases where id=q.case_id for update;
 select * into prior from commerce_private.product_quote_dispositions where offer_id=target;
 if prior.offer_id is not null then
  if prior.actor_id<>actor or prior.event<>event or prior.request_key<>key then raise exception using errcode='PT409',message='COMMERCE_CONFLICT';end if;return;
 end if;
 if exists(select 1 from commerce_private.checkout_intents where offer_id=target) then raise exception using errcode='PT409',message='COMMERCE_RECONCILIATION_REQUIRED';end if;
 insert into commerce_private.product_quote_dispositions values(target,q.tenant_id,actor,event,key,clock_timestamp());
 update commerce_private.credit_reservations set state='released' where offer_id=target and case_id=q.case_id and state='reserved';
 if found then update commerce_private.deposit_funding set state='available' where case_id=q.case_id and state='reserved';end if;
end $$;
revoke all on function commerce_private.dispose_unstarted_quote(uuid,uuid,text,uuid) from public,anon,authenticated,service_role;

create function public.staff_issue_product_quote(p_context jsonb,p_command jsonb,p_provenance text) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare ctx jsonb; view jsonb; d commerce_private.product_quote_drafts; b commerce_private.catalogue_versions;
 p commerce_private.order_publications; q commerce_private.issued_product_quotes; e commerce_private.product_quote_evidence;
 clinical uuid; stock uuid; pharmacy uuid; custody uuid; actor uuid; tenant uuid; price uuid; offer uuid;
 item jsonb; selection jsonb:='[]'; result jsonb; fp text; ready boolean:=false; deadline timestamptz; expiry timestamptz; previous record;
begin
 ctx:=intake_private.workforce(p_context);actor:=(ctx->>'subjectId')::uuid;tenant:=(ctx->>'tenantId')::uuid;
 if ctx->>'role'<>'operations' or ctx->>'purpose'<>'operations' or p_provenance is null or p_provenance not in('local-synthetic','precise-wellness-rrp') then
  raise exception using errcode='42501',message='QUOTE_REJECTED';end if;
 if p_command is null or jsonb_typeof(p_command)<>'object' or p_command->>'action' is null or p_command->>'action' not in('read','issue')
  or not(p_command ? 'caseId') then raise exception using errcode='22023',message='QUOTE_INPUT_INVALID';end if;
 if p_command->>'action'='read' then
  if p_command-array['action','caseId']<>'{}'::jsonb then raise exception using errcode='22023',message='QUOTE_INPUT_INVALID';end if;
 else
  if not(p_command ?& array['action','caseId','draftId','requestKey']) or p_command-array['action','caseId','draftId','requestKey']<>'{}'::jsonb
   or exists(select 1 from jsonb_each(p_command) v where jsonb_typeof(v.value)<>'string') then raise exception using errcode='22023',message='QUOTE_INPUT_INVALID';end if;
 end if;
 -- Reuse reviewed fresh-TOTP/assignment, client, reference and case-first locking boundary.
 view:=public.staff_product_quote(jsonb_build_object('p_provider_subject',p_context->>'providerSubject','p_provider_session_id',p_context->>'providerSessionId',
  'p_verified_email',p_context->>'verifiedEmail','p_session_id',p_context->>'sessionId','p_subject_id',actor,'p_tenant_id',tenant),
  jsonb_build_object('action','read','caseId',p_command->>'caseId'),p_provenance);
 deadline:=(view->>'expiresAt')::timestamptz;
 select * into d from commerce_private.product_quote_drafts where case_id=(p_command->>'caseId')::uuid order by version desc limit 1;
 select * into b from commerce_private.catalogue_versions where id=d.catalogue_id for share;
 select * into p from commerce_private.order_publications where tenant_id=tenant and scenario='approved_product_order'
  and status='published' and effective_at<=clock_timestamp() and expires_at>clock_timestamp() order by effective_at desc,id desc limit 1 for share;
 for e in select x.* from commerce_private.product_quote_evidence x where x.draft_id=d.id and commerce_private.product_evidence_current(x.id)
  order by x.id for share loop
  case e.kind when 'clinical' then clinical:=e.id;when 'provider_stock' then stock:=e.id;when 'pharmacy_authority' then pharmacy:=e.id;when 'address_custody' then custody:=e.id;end case;
 end loop;
 ready:=d.id is not null and (view->>'catalogueId')::uuid=d.catalogue_id and p.id is not null and clinical is not null and stock is not null and pharmacy is not null and custody is not null
  and commerce_private.funding_current(d.case_id,tenant,d.subject_id)
  and exists(select 1 from commerce_private.product_quote_releases r where r.tenant_id=tenant and r.provenance=p_provenance and r.enabled and r.expires_at>clock_timestamp())
  and not exists(select 1 from commerce_private.checkout_releases pay where pay.tenant_id=tenant and pay.payment_environment='live' and p_provenance<>'precise-wellness-rrp')
  and not exists(select 1 from commerce_private.issued_product_quotes old join commerce_private.checkout_intents ci on ci.offer_id=old.offer_id
   where old.case_id=d.case_id and old.draft_id<>d.id and not exists(select 1 from commerce_private.product_quote_dispositions x where x.offer_id=old.offer_id));
 select * into q from commerce_private.issued_product_quotes where draft_id=d.id;
 if p_command->>'action'='issue' then
  if not coalesce(ready,false) or d.id<>(p_command->>'draftId')::uuid then raise exception using errcode='42501',message='COMMERCE_NOT_READY';end if;
  fp:=encode(extensions.digest(p_command::text,'sha256'),'hex');
  if exists(select 1 from commerce_private.issued_product_quotes prior where prior.tenant_id=tenant and prior.actor_id=actor
   and prior.request_key=(p_command->>'requestKey')::uuid and (prior.draft_id<>d.id or prior.fingerprint<>fp)) then raise exception using errcode='PT409',message='COMMERCE_CONFLICT';end if;
  if q.offer_id is not null then
   if q.actor_id<>actor or q.request_key<>(p_command->>'requestKey')::uuid or q.fingerprint<>fp or not commerce_private.product_offer_current(q.offer_id) then
    raise exception using errcode='PT409',message='COMMERCE_CONFLICT';end if;
   perform commerce_private.prepare_offer(tenant,d.subject_id,d.case_id,(select o.selection from commerce_private.offers o where id=q.offer_id));
  else
   -- Replacement cannot discard an in-flight/uncertain provider attempt or double reserve credit.
   for previous in select old.offer_id from commerce_private.issued_product_quotes old where old.case_id=d.case_id
    and not exists(select 1 from commerce_private.product_quote_dispositions x where x.offer_id=old.offer_id) order by old.recorded_at,old.offer_id loop
    perform commerce_private.dispose_unstarted_quote(previous.offer_id,actor,'superseded',(p_command->>'requestKey')::uuid);
   end loop;
   perform pg_advisory_xact_lock(hashtextextended('product-price-map:'||b.id::text,15106));
   for item in select value from jsonb_array_elements(d.snapshot->'items') order by value->>'productId' loop
    select price_id into price from commerce_private.catalogue_price_bindings where catalogue_id=b.id and product_id=(item->>'productId')::uuid;
    if price is null then
     price:=gen_random_uuid();
     insert into commerce_private.prices(id,kind,version,description,unit_amount_minor,currency,tax_treatment,source_fingerprint,approval_reference,environment,effective_at,expires_at,status)
      values(price,'product','catalogue-'||b.id::text,item->>'description',(item->>'unitAmountMinor')::integer,b.currency,b.tax_treatment,b.source_fingerprint,b.approval_reference,b.provenance,b.effective_at,b.expires_at,'approved');
     insert into commerce_private.catalogue_price_bindings values(b.id,(item->>'productId')::uuid,price);
    end if;
    selection:=selection||jsonb_build_array(jsonb_build_object('priceId',price,'quantity',(item->>'quantity')::integer));
   end loop;
   select least(p.expires_at,b.expires_at,(select min(expires_at) from commerce_private.product_quote_evidence where id in(clinical,stock,pharmacy,custody)),
    (select expires_at from commerce_private.delivery_quotes where id=d.delivery_quote_id)) into expiry;
   insert into commerce_private.product_release_gates(case_id,tenant_id,subject_id,custody_ready,clinical_approved,stock_confirmed,pharmacy_authorised,address_confirmed,evidence_reference,expires_at)
    values(d.case_id,tenant,d.subject_id,true,true,true,true,true,clinical,expiry)
    on conflict(case_id) do update set custody_ready=true,clinical_approved=true,stock_confirmed=true,pharmacy_authorised=true,address_confirmed=true,evidence_reference=clinical,expires_at=excluded.expires_at;
   result:=commerce_private.prepare_offer_before_product_quotes(tenant,d.subject_id,d.case_id,jsonb_build_object('scenario','approved_product_order','items',selection,'deliveryQuoteId',d.delivery_quote_id,'requestKey',p_command->>'requestKey'));
   offer:=(result->>'offerId')::uuid;
   insert into commerce_private.issued_product_quotes values(offer,d.id,tenant,d.subject_id,d.case_id,actor,p.id,clinical,stock,pharmacy,custody,(p_command->>'requestKey')::uuid,fp,clock_timestamp());
   if not commerce_private.product_offer_current(offer) then raise exception using errcode='42501',message='COMMERCE_NOT_READY';end if;
   perform audit_private.append_audit_fact(tenant,'workforce',actor,'operations','aal2','product.quote.issued',d.subject_id,'payment',offer::text,'operations','sprint-15.6-v1','succeeded','PRODUCT_QUOTE_ISSUED',offer::text,offer::text,clock_timestamp(),'{}');
   select * into q from commerce_private.issued_product_quotes where offer_id=offer;
  end if;
 end if;
 perform intake_private.workforce(p_context);
 if deadline<=clock_timestamp() then raise exception using errcode='42501',message='QUOTE_REJECTED';end if;
 return jsonb_build_object('caseId',p_command->>'caseId','draftId',d.id,'version',coalesce(d.version,0),'tenantName',view->>'tenantName','synthetic',p_provenance='local-synthetic',
  'offerId',q.offer_id,'canIssue',coalesce(ready,false) and q.offer_id is null,'status',case when d.id is null then 'draft_missing' when q.offer_id is null then 'not_issued'
   when exists(select 1 from commerce_private.product_quote_dispositions x where x.offer_id=q.offer_id) then 'declined'
   when commerce_private.product_offer_current(q.offer_id) then 'issued' else 'needs_review' end,'termsVersion',p.instrument_version,'expiresAt',deadline);
end $$;
revoke all on function public.staff_issue_product_quote(jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.staff_issue_product_quote(jsonb,jsonb,text) to service_role;

alter function public.patient_order_review(jsonb,jsonb) rename to patient_order_review_before_product_quotes;
revoke all on function public.patient_order_review_before_product_quotes(jsonb,jsonb) from public,anon,authenticated,service_role;
create function public.patient_order_review(p_context jsonb,p_command jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare o commerce_private.offers;q commerce_private.issued_product_quotes;p commerce_private.order_publications;
 receipt commerce_private.order_acceptances;digest text;view jsonb;expiry timestamptz;current boolean;correlation uuid:=gen_random_uuid();
begin
 perform intake_private.patient_authority(p_context);
 if p_command is null or jsonb_typeof(p_command)<>'object' or p_command->>'action' is null or p_command->>'action' not in('read','accept','decline') then
  raise exception using errcode='22023',message='COMMERCE_INVALID';end if;
 if p_command->>'action'='read' then
  if p_command-array['action']<>'{}'::jsonb then raise exception using errcode='22023',message='COMMERCE_INVALID';end if;
  select * into o from commerce_private.offers where tenant_id=(p_context->>'tenantId')::uuid and subject_id=(p_context->>'subjectId')::uuid order by created_at desc,id desc limit 1;
 else
  select * into o from commerce_private.offers where id=(p_command->>'offerId')::uuid and tenant_id=(p_context->>'tenantId')::uuid and subject_id=(p_context->>'subjectId')::uuid;
  if o.id is null then raise exception using errcode='42501',message='COMMERCE_REJECTED';end if;
 end if;
 select * into q from commerce_private.issued_product_quotes where offer_id=o.id;
 if q.offer_id is null then return public.patient_order_review_before_product_quotes(p_context,p_command);end if;
 perform 1 from public.operations_cases where id=q.case_id for update;
 perform 1 from commerce_private.offers where id=o.id for update;
 select * into p from commerce_private.order_publications where id=q.publication_id for share;
 digest:=commerce_private.product_quote_hash(o.id);
 current:=commerce_private.product_offer_current(o.id) and o.expires_at>clock_timestamp();
 if p_command->>'action'='decline' then
  if not(p_command ?& array['action','offerId','snapshotHash','requestKey']) or p_command-array['action','offerId','snapshotHash','requestKey']<>'{}'::jsonb or
   p_command->>'snapshotHash' is distinct from digest or p_command->>'requestKey' is null then raise exception using errcode='PT409',message='COMMERCE_CONFLICT';end if;
  perform commerce_private.dispose_unstarted_quote(o.id,o.subject_id,'declined',(p_command->>'requestKey')::uuid);
  perform audit_private.append_audit_fact(o.tenant_id,'patient',o.subject_id,'patient','aal1','product.quote.declined',o.subject_id,'payment',o.id::text,'account','sprint-15.6-v1','succeeded','PRODUCT_QUOTE_DECLINED',correlation::text,correlation::text,clock_timestamp(),'{}');
 elsif p_command->>'action'='accept' then
  if not(p_command ?& array['action','offerId','publicationId','snapshotHash','contentHash','requestKey','accepted']) or p_command-array['action','offerId','publicationId','snapshotHash','contentHash','requestKey','accepted']<>'{}'::jsonb
   or p_command->'accepted' is distinct from 'true'::jsonb or p_command->>'requestKey' is null then raise exception using errcode='22023',message='COMMERCE_INVALID';end if;
  if not current then raise exception using errcode='42501',message='COMMERCE_NOT_READY';end if;
  perform commerce_private.prepare_offer(o.tenant_id,o.subject_id,o.case_id,o.selection);
  if (p_command->>'publicationId')::uuid<>p.id or p_command->>'contentHash' is distinct from p.content_hash or p_command->>'snapshotHash' is distinct from digest then
   raise exception using errcode='PT409',message='COMMERCE_CONFLICT';end if;
  select * into receipt from commerce_private.order_acceptances where offer_id=o.id;
  if receipt.id is not null then
   if receipt.request_key<>(p_command->>'requestKey')::uuid or receipt.snapshot_hash<>digest or receipt.publication_id<>p.id then raise exception using errcode='PT409',message='COMMERCE_CONFLICT';end if;
  else
   insert into commerce_private.order_acceptances(offer_id,publication_id,subject_id,tenant_id,session_id,content_hash,snapshot_hash,request_key,correlation_id,assurance)
    values(o.id,p.id,o.subject_id,o.tenant_id,(p_context->>'sessionId')::uuid,p.content_hash,digest,(p_command->>'requestKey')::uuid,correlation,'aal1') returning * into receipt;
  end if;
 end if;
 perform intake_private.patient_authority(p_context);
 if exists(select 1 from commerce_private.product_quote_dispositions where offer_id=o.id) then return jsonb_build_object('review',null,'quoteOutcome','declined');end if;
 select * into receipt from commerce_private.order_acceptances where offer_id=o.id;
 select least(idle_expires_at,absolute_expires_at,clock_timestamp()+interval '5 minutes') into expiry from public.identity_sessions where id=(p_context->>'sessionId')::uuid;
 if expiry<=clock_timestamp() then raise exception using errcode='42501',message='COMMERCE_REJECTED';end if;
 view:=jsonb_build_object('offerId',o.id,'scenario','approved_product_order','currency','zar',
  'lines',(select jsonb_agg(jsonb_build_object('description',line->>'description','quantity',(line->>'quantity')::integer,'unitAmountMinor',(line->>'unit_amount_minor')::integer,'priceVersion',line->>'version','taxTreatment',line->>'tax_treatment')) from jsonb_array_elements(o.snapshot->'lines')line),
  'productSubtotalMinor',(o.snapshot->>'productSubtotalMinor')::integer,'deliveryMinor',(o.snapshot->>'deliveryMinor')::integer,'creditMinor',(o.snapshot->>'creditMinor')::integer,
  'amountTotalMinor',(o.snapshot->>'amountTotalMinor')::integer,'unusedDepositRefundMinor',(o.snapshot->>'unusedDepositRefundMinor')::integer,
  'deliveryVersion',o.snapshot->'deliveryQuote'->>'version','snapshotHash',digest,'expiresAt',expiry,'quoteCurrent',current,
  'productProvenance',(select b.provenance from commerce_private.product_quote_drafts d join commerce_private.catalogue_versions b on b.id=d.catalogue_id where d.id=q.draft_id),
  'terms',jsonb_build_object('publicationId',p.id,'version',p.instrument_version,'effectiveAt',p.effective_at,'locale',p.locale,'supplier',p.supplier,'body',p.body,'contentHash',p.content_hash),
  'acceptance',case when receipt.id is null then null else jsonb_build_object('receiptId',receipt.id,'recordedAt',receipt.recorded_at) end,'checkoutEnabled',false);
 perform audit_private.append_audit_fact(o.tenant_id,'patient',o.subject_id,'patient','aal1','commerce.order.'||(p_command->>'action'),o.subject_id,'payment',o.id::text,'account','sprint-15.6-v1','succeeded','ORDER_REVIEW_FACT',correlation::text,correlation::text,clock_timestamp(),'{}');
 return jsonb_build_object('review',view);
end $$;
revoke all on function public.patient_order_review(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.patient_order_review(jsonb,jsonb) to service_role;
select identity_private.assert_mobile_orphan_guard_coverage();
commit;
