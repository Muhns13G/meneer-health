-- Genuine document actions only. No publication, compatibility approval or client is seeded.
create table identity_private.account_document_reacknowledgements (
 tenant_id uuid not null references public.tenants(id),
 subject_id uuid not null references public.subjects(id),
 request_key uuid not null,
 terms_receipt_id uuid not null references public.pilot_instrument_receipts(id),
 privacy_receipt_id uuid not null references public.pilot_instrument_receipts(id),
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(tenant_id,subject_id,request_key)
);
alter table identity_private.account_document_reacknowledgements enable row level security;
alter table identity_private.account_document_reacknowledgements force row level security;
revoke all on identity_private.account_document_reacknowledgements from public,anon,authenticated,service_role;
create trigger account_document_reacknowledgements_immutable before update or delete
 on identity_private.account_document_reacknowledgements for each row execute function audit_private.reject_append_only_mutation();
create trigger mobile_orphan_reference_guard before insert or update
 on identity_private.account_document_reacknowledgements for each row execute function identity_private.guard_mobile_orphan_reference('subject_id');
select identity_private.assert_mobile_orphan_guard_coverage();

create function public.account_document_review_eligible(p_tenant_id uuid,p_subject_id uuid)
returns boolean language sql security definer volatile set search_path='' as $$
 select exists(select 1 from public.client_profiles profile
 join public.subjects sub on sub.id=profile.subject_id and sub.status='active'
 join public.tenants tenant on tenant.id=profile.tenant_id and tenant.status='active'
 join public.tenant_memberships membership on membership.tenant_id=profile.tenant_id and membership.subject_id=profile.subject_id
   and membership.role='patient' and membership.status='active' and membership.valid_from<=clock_timestamp()
   and (membership.expires_at is null or membership.expires_at>clock_timestamp())
 where profile.tenant_id=p_tenant_id and profile.subject_id=p_subject_id and profile.status='active'
 and coalesce((select life.event_type from public.pilot_account_lifecycle_events life where life.tenant_id=p_tenant_id
   and life.subject_id=p_subject_id order by life.recorded_at desc,life.id desc limit 1)='activated',false)
 and (select count(*) from public.tenant_memberships mm join public.tenants tt on tt.id=mm.tenant_id and tt.status='active'
   where mm.subject_id=p_subject_id and mm.role='patient' and mm.status='active' and mm.valid_from<=clock_timestamp()
   and (mm.expires_at is null or mm.expires_at>clock_timestamp()))=1
 and not exists(select 1 from identity_private.mobile_orphan_retirements q where q.subject_id=p_subject_id and q.state in('reserved','uncertain','copies_pending','completed'))
 and not exists(select 1 from (values('pilot-account-terms','accepted'),('pilot-privacy-notice','acknowledged')) expected(instrument,action)
 where not exists(select 1 from public.pilot_instrument_receipts receipt
 join public.pilot_instrument_publications publication on publication.id=receipt.publication_id
 where receipt.subject_id=p_subject_id and receipt.tenant_id=p_tenant_id and receipt.instrument_id=expected.instrument
 and receipt.action=expected.action and publication.instrument_id=receipt.instrument_id and publication.instrument_version=receipt.instrument_version
 and publication.content_sha256=receipt.content_sha256 and publication.locale=receipt.locale and receipt.locale='en-ZA'
 and publication.published_at<=receipt.recorded_at and publication.effective_at<=receipt.recorded_at
 and not exists(select 1 from public.pilot_instrument_receipt_events ev where ev.receipt_id=receipt.id)
 and (exists(select 1 from identity_private.pilot_activation_commands activation
 join public.identity_invitations invitation on invitation.id=activation.invitation_id
 where activation.profile_id=profile.id and activation.request_key::text=receipt.correlation_id
 and invitation.accepted_by_subject_id=p_subject_id and invitation.tenant_id=p_tenant_id and invitation.status='accepted')
 or exists(select 1 from identity_private.account_document_reacknowledgements journal where journal.tenant_id=p_tenant_id
 and journal.subject_id=p_subject_id and receipt.id in(journal.terms_receipt_id,journal.privacy_receipt_id)))))
 );
$$;
revoke all on function public.account_document_review_eligible(uuid,uuid) from public,anon,authenticated;
grant execute on function public.account_document_review_eligible(uuid,uuid) to service_role;

create function identity_private.account_document_review_actor(p_tenant_id uuid,p_provider_subject uuid,p_provider_session_id uuid)
returns uuid language plpgsql volatile set search_path='' as $$
declare actor uuid;
begin
 perform 1 from auth.users where id=p_provider_subject for share;
 perform 1 from auth.sessions where id=p_provider_session_id and user_id=p_provider_subject for share;
 select external.subject_id into actor from auth.users usr
 join auth.sessions session on session.user_id=usr.id and session.id=p_provider_session_id
   and (session.not_after is null or session.not_after>clock_timestamp())
 join public.external_identities external on external.provider='supabase' and external.provider_subject=usr.id::text
 join public.subject_contacts contact on contact.subject_id=external.subject_id and contact.kind='email' and contact.status='verified'
   and contact.provider='supabase' and lower(contact.normalized_value)=lower(usr.email)
 where usr.id=p_provider_subject and usr.email_confirmed_at is not null and not coalesce(usr.is_anonymous,false)
 and (usr.banned_until is null or usr.banned_until<=clock_timestamp());
 if actor is null or not public.account_document_review_eligible(p_tenant_id,actor) then
 raise exception using errcode='42501',message='ACCOUNT_REVIEW_REJECTED';end if;
 perform 1 from public.subjects where id=actor for share;
 perform 1 from public.tenants where id=p_tenant_id and status='active' for share;
 perform 1 from public.tenant_memberships where tenant_id=p_tenant_id and subject_id=actor and role='patient' for share;
 perform 1 from public.client_profiles where tenant_id=p_tenant_id and subject_id=actor for share;
 if not public.account_document_review_eligible(p_tenant_id,actor) then
 raise exception using errcode='42501',message='ACCOUNT_REVIEW_REJECTED';end if;
 return actor;
end $$;
revoke all on function identity_private.account_document_review_actor(uuid,uuid,uuid) from public,anon,authenticated,service_role;

create function public.read_account_document_review(p_tenant_id uuid,p_provider_subject uuid,p_provider_session_id uuid)
returns jsonb language plpgsql security definer volatile set search_path='' as $$
declare actor uuid;docs jsonb;
begin
 actor:=identity_private.account_document_review_actor(p_tenant_id,p_provider_subject,p_provider_session_id);
 select jsonb_agg(jsonb_build_object('publicationId',id,'instrumentId',instrument_id,'version',instrument_version,
 'locale',locale,'contentHash',content_sha256,'body',document_body,'effectiveAt',effective_at) order by instrument_id) into docs
 from public.pilot_instrument_publications where instrument_id in('pilot-account-terms','pilot-privacy-notice') and locale='en-ZA'
 and status='published' and published_at<=clock_timestamp() and effective_at<=clock_timestamp()
 and (expires_at is null or expires_at>clock_timestamp());
 if jsonb_array_length(docs) is distinct from 2 then raise exception using errcode='42501',message='ACCOUNT_REVIEW_UNAVAILABLE';end if;
 return jsonb_build_object('verifiedEmail',(select email from auth.users where id=p_provider_subject),'documents',docs);
end $$;
revoke all on function public.read_account_document_review(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_account_document_review(uuid,uuid,uuid) to service_role;

create function public.acknowledge_account_documents(p_tenant_id uuid,p_provider_subject uuid,p_provider_session_id uuid,p_command jsonb)
returns boolean language plpgsql security definer volatile set search_path='' as $$
declare actor uuid; docs jsonb; terms public.pilot_instrument_publications; privacy public.pilot_instrument_publications;
 prior identity_private.account_document_reacknowledgements; key uuid; terms_receipt uuid;privacy_receipt uuid;
begin
 actor:=identity_private.account_document_review_actor(p_tenant_id,p_provider_subject,p_provider_session_id);
 if jsonb_typeof(p_command)<>'object' or (select count(*) from jsonb_object_keys(p_command))<>7
 or p_command->'termsAccepted'<>'true'::jsonb or p_command->'privacyAcknowledged'<>'true'::jsonb
 or not (p_command ?& array['requestKey','termsPublicationId','termsHash','privacyPublicationId','privacyHash','termsAccepted','privacyAcknowledged']) then
 raise exception using errcode='22023',message='ACCOUNT_REVIEW_COMMAND_INVALID';end if;
 key:=(p_command->>'requestKey')::uuid;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text||actor::text,91213));
 -- Lock publication rows against concurrent supersession. No client version is authoritative.
 select * into terms from public.pilot_instrument_publications where id=(p_command->>'termsPublicationId')::uuid for share;
 select * into privacy from public.pilot_instrument_publications where id=(p_command->>'privacyPublicationId')::uuid for share;
 docs:=public.read_account_document_review(p_tenant_id,p_provider_subject,p_provider_session_id);
 if terms.instrument_id is distinct from 'pilot-account-terms' or privacy.instrument_id is distinct from 'pilot-privacy-notice'
 or terms.content_sha256 is distinct from p_command->>'termsHash' or privacy.content_sha256 is distinct from p_command->>'privacyHash'
 or not exists(select 1 from jsonb_array_elements(docs->'documents') d where d->>'publicationId'=terms.id::text)
 or not exists(select 1 from jsonb_array_elements(docs->'documents') d where d->>'publicationId'=privacy.id::text) then
 raise exception using errcode='42501',message='ACCOUNT_REVIEW_STALE';end if;
 select * into prior from identity_private.account_document_reacknowledgements where tenant_id=p_tenant_id and subject_id=actor and request_key=key;
 if prior.request_key is not null then
 if not exists(select 1 from public.pilot_instrument_receipts where id=prior.terms_receipt_id and publication_id=terms.id)
 or not exists(select 1 from public.pilot_instrument_receipts where id=prior.privacy_receipt_id and publication_id=privacy.id) then
 raise exception using errcode='22023',message='ACCOUNT_REVIEW_REPLAY_CONFLICT';end if;
 return public.has_pilot_account_evidence(p_tenant_id,actor);end if;
 insert into public.pilot_instrument_receipts(tenant_id,subject_id,publication_id,instrument_id,instrument_version,locale,content_sha256,action,assurance,idempotency_key,correlation_id)
 values(p_tenant_id,actor,terms.id,terms.instrument_id,terms.instrument_version,terms.locale,terms.content_sha256,'accepted','aal1',key,'account-reack:'||key::text) returning id into terms_receipt;
 insert into public.pilot_instrument_receipts(tenant_id,subject_id,publication_id,instrument_id,instrument_version,locale,content_sha256,action,assurance,idempotency_key,correlation_id)
 values(p_tenant_id,actor,privacy.id,privacy.instrument_id,privacy.instrument_version,privacy.locale,privacy.content_sha256,'acknowledged','aal1',md5(key::text||':privacy')::uuid,'account-reack:'||key::text) returning id into privacy_receipt;
 insert into identity_private.account_document_reacknowledgements(tenant_id,subject_id,request_key,terms_receipt_id,privacy_receipt_id)
 values(p_tenant_id,actor,key,terms_receipt,privacy_receipt);
 return public.has_pilot_account_evidence(p_tenant_id,actor);
end $$;
revoke all on function public.acknowledge_account_documents(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.acknowledge_account_documents(uuid,uuid,uuid,jsonb) to service_role;
