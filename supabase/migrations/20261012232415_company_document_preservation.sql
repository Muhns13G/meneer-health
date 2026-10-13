-- Preserve original encrypted episodes and accepted financial evidence. Publish nothing.
create table intake_private.collection_notice_actions (
 tenant_id uuid not null references public.tenants(id), subject_id uuid not null references public.subjects(id),
 intake_id uuid not null references intake_private.intakes(id), publication_id uuid not null references intake_private.publications(id),
 request_key uuid not null, privacy_hash text not null, review_hash text not null,
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(intake_id,publication_id), unique(tenant_id,subject_id,request_key)
);
alter table intake_private.collection_notice_actions enable row level security;
alter table intake_private.collection_notice_actions force row level security;
revoke all on intake_private.collection_notice_actions from public,anon,authenticated,service_role;
create trigger collection_notice_actions_immutable before update or delete on intake_private.collection_notice_actions
 for each row execute function audit_private.reject_append_only_mutation();
create trigger mobile_orphan_reference_guard before insert or update on intake_private.collection_notice_actions
 for each row execute function identity_private.guard_mobile_orphan_reference('subject_id');
select identity_private.assert_mobile_orphan_guard_coverage();

create function intake_private.current_collection_notice(tenant uuid) returns intake_private.publications
language sql volatile set search_path='' as $$select p from intake_private.publications p where p.tenant_id=tenant
 and p.status='published' and p.effective_at<=clock_timestamp() and p.expires_at>clock_timestamp()
 order by p.effective_at desc,p.id desc limit 1$$;
create function intake_private.collection_notice_current(target uuid) returns boolean
language plpgsql volatile set search_path='' as $$declare i intake_private.intakes;p intake_private.publications;begin
 select * into i from intake_private.intakes where id=target;
 p:=intake_private.current_collection_notice(i.tenant_id);
 return p.id is not null and (p.id=i.publication_id or exists(select 1 from intake_private.collection_notice_actions a
 where a.intake_id=i.id and a.publication_id=p.id and a.subject_id=i.subject_id and a.tenant_id=i.tenant_id
 and a.privacy_hash=encode(extensions.digest(p.privacy_body,'sha256'),'hex')
 and a.review_hash=encode(extensions.digest(p.review_body,'sha256'),'hex')));end$$;
revoke all on function intake_private.current_collection_notice(uuid),intake_private.collection_notice_current(uuid)
 from public,anon,authenticated,service_role;

alter function public.patient_intake_read(jsonb,uuid) rename to patient_intake_read_before_company_notices;
revoke all on function public.patient_intake_read_before_company_notices(jsonb,uuid) from public,anon,authenticated,service_role;
create function public.patient_intake_read(p_context jsonb,p_intake_id uuid default null) returns jsonb
language plpgsql volatile security definer set search_path='' as $$declare target uuid;result jsonb;p intake_private.publications;old intake_private.publications;begin
 perform intake_private.patient_authority(p_context);
 target:=p_intake_id;
 if target is null then
 -- Existing restricted/deleted records must not silently become a blank new questionnaire.
 select id into target from intake_private.intakes where tenant_id=(p_context->>'tenantId')::uuid
 and subject_id=(p_context->>'subjectId')::uuid order by updated_at desc,id desc limit 1;
 end if;
 result:=public.patient_intake_read_before_company_notices(p_context,target);
 if result->'record' is distinct from 'null'::jsonb then
 p:=intake_private.current_collection_notice((p_context->>'tenantId')::uuid);
 select * into old from intake_private.publications where id=(result->'publication'->>'id')::uuid;
 if p.id is null then raise exception using errcode='42501',message='INTAKE_NOT_ACTIVE';end if;
 if p.id<>old.id then
 if p.catalogue_hash<>old.catalogue_hash or p.collection_version<>old.collection_version or p.control_version<>old.control_version
 or p.recipient_reference<>old.recipient_reference or p.transfer_notice is distinct from old.transfer_notice then
 raise exception using errcode='42501',message='INTAKE_NOTICE_TRANSITION_UNSUPPORTED';end if;
 result:=result||jsonb_build_object('noticeTransition',jsonb_build_object('publicationId',p.id,'privacy',p.privacy_body,
 'reviewDeclaration',p.review_body,'privacyHash',encode(extensions.digest(p.privacy_body,'sha256'),'hex'),
 'reviewHash',encode(extensions.digest(p.review_body,'sha256'),'hex'),'acknowledged',intake_private.collection_notice_current(target)));
 end if;end if;
 return result;end$$;
revoke all on function public.patient_intake_read(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.patient_intake_read(jsonb,uuid) to service_role;

create function public.patient_acknowledge_collection_notice(p_context jsonb,p_command jsonb) returns boolean
language plpgsql volatile security definer set search_path='' as $$declare i intake_private.intakes;p intake_private.publications;prior intake_private.collection_notice_actions;begin
 perform intake_private.patient_authority(p_context);
 if jsonb_typeof(p_command) is distinct from 'object' or p_command-array['intakeId','publicationId','privacyHash','reviewHash','requestKey','privacyAcknowledged','reviewConsent']<>'{}'::jsonb
 or not(p_command ?& array['intakeId','publicationId','privacyHash','reviewHash','requestKey','privacyAcknowledged','reviewConsent'])
 or p_command->'privacyAcknowledged' is distinct from 'true'::jsonb or p_command->'reviewConsent' is distinct from 'true'::jsonb then
 raise exception using errcode='22023',message='INTAKE_INVALID';end if;
 select * into i from intake_private.intakes where id=(p_command->>'intakeId')::uuid
 and tenant_id=(p_context->>'tenantId')::uuid and subject_id=(p_context->>'subjectId')::uuid for update;
 if i.id is null then raise exception using errcode='42501',message='INTAKE_REJECTED';end if;
 perform public.patient_intake_read(p_context,i.id);
 p:=intake_private.current_collection_notice(i.tenant_id);
 perform 1 from intake_private.publications where id=p.id for share;
 if p.id is distinct from (p_command->>'publicationId')::uuid or p.id=i.publication_id
 or p_command->>'privacyHash' is distinct from encode(extensions.digest(p.privacy_body,'sha256'),'hex')
 or p_command->>'reviewHash' is distinct from encode(extensions.digest(p.review_body,'sha256'),'hex') then
 raise exception using errcode='PT409',message='INTAKE_CONFLICT';end if;
 select * into prior from intake_private.collection_notice_actions where intake_id=i.id and publication_id=p.id;
 if prior.intake_id is not null then
 if prior.request_key is distinct from (p_command->>'requestKey')::uuid then raise exception using errcode='PT409',message='INTAKE_CONFLICT';end if;
 else
 insert into intake_private.collection_notice_actions(tenant_id,subject_id,intake_id,publication_id,request_key,privacy_hash,review_hash)
 values(i.tenant_id,i.subject_id,i.id,p.id,(p_command->>'requestKey')::uuid,p_command->>'privacyHash',p_command->>'reviewHash');
 perform intake_private.audit(i.tenant_id,i.subject_id,i.subject_id,'patient','intake.notice.acknowledged',i.id);
 end if;
 perform intake_private.patient_authority(p_context);
 return intake_private.collection_notice_current(i.id);end$$;
revoke all on function public.patient_acknowledge_collection_notice(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.patient_acknowledge_collection_notice(jsonb,jsonb) to service_role;

alter function public.patient_intake_write(jsonb,jsonb) rename to patient_intake_write_before_company_notices;
revoke all on function public.patient_intake_write_before_company_notices(jsonb,jsonb) from public,anon,authenticated,service_role;
create function public.patient_intake_write(p_context jsonb,p_command jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$declare i intake_private.intakes;p intake_private.publications;begin
 perform intake_private.patient_authority(p_context);
 select * into i from intake_private.intakes where id=(p_command->>'intakeId')::uuid for update;
 if i.id is not null then
 if i.tenant_id<>(p_context->>'tenantId')::uuid or i.subject_id<>(p_context->>'subjectId')::uuid then raise exception using errcode='42501',message='INTAKE_REJECTED';end if;
 if not intake_private.collection_notice_current(i.id) then raise exception using errcode='42501',message='INTAKE_NOTICE_REQUIRED';end if;
 else
 p:=intake_private.current_collection_notice((p_context->>'tenantId')::uuid);
 if p.id is distinct from (p_command->>'publicationId')::uuid then raise exception using errcode='42501',message='INTAKE_NOT_ACTIVE';end if;
 end if;
 return public.patient_intake_write_before_company_notices(p_context,p_command);end$$;
revoke all on function public.patient_intake_write(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.patient_intake_write(jsonb,jsonb) to service_role;

-- Guarded source edits preserve the original function identities/ACLs/security settings.
do $$declare definition text;needle text;begin
 definition:=pg_get_functiondef('intake_private.medical_grant(jsonb,uuid,text)'::regprocedure);
 needle:='return g;';
 if (length(definition)-length(replace(definition,needle,'')))/length(needle)<>1 then raise exception 'MEDICAL_NOTICE_GUARD_SOURCE_CHANGED';end if;
 execute replace(definition,needle,'if purpose in(''medical_review'',''medical_transfer'') and not intake_private.collection_notice_current(target) then raise exception using errcode=''42501'',message=''INTAKE_NOTICE_REQUIRED'';end if;'||needle);
 definition:=pg_get_functiondef('public.authorise_medical_transfer(jsonb,uuid,uuid,uuid,uuid)'::regprocedure);
 needle:='if i.id is null or';
 if (length(definition)-length(replace(definition,needle,'')))/length(needle)<>1 then raise exception 'MEDICAL_TRANSFER_SOURCE_CHANGED';end if;
 execute replace(definition,needle,'if i.id is not null and not intake_private.collection_notice_current(i.id) then raise exception using errcode=''42501'',message=''INTAKE_NOTICE_REQUIRED'';end if;'||needle);
 definition:=pg_get_functiondef('public.patient_order_review_before_product_quotes(jsonb,jsonb)'::regprocedure);
 needle:='select * into p from commerce_private.order_publications where tenant_id=o.tenant_id';
 if (length(definition)-length(replace(definition,needle,'')))/length(needle)<>1 then raise exception 'COMMERCE_REVIEW_SOURCE_CHANGED';end if;
 definition:=replace(definition,needle,'select * into receipt from commerce_private.order_acceptances where offer_id=o.id;'||needle);
 needle:='and scenario=o.snapshot->>''scenario'' and status=''published''';
 if (length(definition)-length(replace(definition,needle,'')))/length(needle)<>1 then raise exception 'COMMERCE_PUBLICATION_SOURCE_CHANGED';end if;
 execute replace(definition,needle,needle||' and (receipt.id is null or id=receipt.publication_id)');
end$$;
