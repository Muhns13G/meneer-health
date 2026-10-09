-- TD-066 prerequisite: capture creation in the Auth INSERT transaction, not from an email lookup.
begin;
create table identity_private.mobile_identity_creation_leases (
 email_invitation_id uuid primary key references public.identity_invitations(id),
 proof_digest text not null unique check(proof_digest ~ '^[a-f0-9]{64}$'),
 reserved_at timestamptz not null default clock_timestamp()
);
create table identity_private.mobile_identity_creation_receipts (
 email_invitation_id uuid primary key references public.identity_invitations(id),
 provider_subject_id uuid not null unique,
 subject_id uuid not null references public.subjects(id),
 recorded_at timestamptz not null default clock_timestamp()
);
alter table identity_private.mobile_identity_creation_leases enable row level security;
alter table identity_private.mobile_identity_creation_leases force row level security;
alter table identity_private.mobile_identity_creation_receipts enable row level security;
alter table identity_private.mobile_identity_creation_receipts force row level security;
revoke all on identity_private.mobile_identity_creation_leases,
 identity_private.mobile_identity_creation_receipts from public,anon,authenticated,service_role;
create trigger mobile_creation_lease_immutable before update or delete
 on identity_private.mobile_identity_creation_leases for each row
 execute function audit_private.reject_append_only_mutation();
create trigger mobile_creation_receipt_immutable before update or delete
 on identity_private.mobile_identity_creation_receipts for each row
 execute function audit_private.reject_append_only_mutation();

alter function public.prepare_mobile_email_exchange(uuid,text,text,uuid)
 rename to prepare_mobile_email_exchange_before_provenance;
revoke all on function public.prepare_mobile_email_exchange_before_provenance(uuid,text,text,uuid)
 from public,anon,authenticated,service_role;
create function public.prepare_mobile_email_exchange(p_tenant_id uuid,p_token_digest text,
 p_claim_digest text,p_request_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; proof text;
begin
 result:=public.prepare_mobile_email_exchange_before_provenance(p_tenant_id,p_token_digest,p_claim_digest,p_request_key);
 if result->>'dispatch'='true' then
  proof:=encode(extensions.gen_random_bytes(32),'hex');
  insert into identity_private.mobile_identity_creation_leases(email_invitation_id,proof_digest)
   values((result->>'invitationId')::uuid,encode(sha256(convert_to(proof,'UTF8')),'hex'));
  return result||jsonb_build_object('creationProof',proof);
 end if;
 return result;
end $$;
revoke all on function public.prepare_mobile_email_exchange(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.prepare_mobile_email_exchange(uuid,text,text,uuid) to service_role;

-- The nonce is a one-shot private capability checked against a server-created lease. Ordinary
-- editable metadata without the secret cannot create a receipt and is never JWT authorisation.
-- Run after the existing sync trigger; UPDATE of an existing Auth user must never create proof.
create function identity_private.capture_mobile_identity_creation() returns trigger
language plpgsql security definer set search_path='' as $$
declare proof text:=new.raw_user_meta_data->>'mobile_creation_proof';
 lease identity_private.mobile_identity_creation_leases; exchange identity_private.mobile_email_exchanges;
 invite public.identity_invitations; internal_id uuid; tenant uuid;
begin
 if proof is null or proof !~ '^[a-f0-9]{64}$' or new.email is null
  or new.email_confirmed_at is not null or coalesce(new.is_anonymous,false) then return new;end if;
 select * into lease from identity_private.mobile_identity_creation_leases
  where proof_digest=encode(sha256(convert_to(proof,'UTF8')),'hex');
 if lease.email_invitation_id is null then return new;end if;
 select tenant_id into tenant from public.identity_invitations where id=lease.email_invitation_id;
 perform pg_advisory_xact_lock(hashtextextended(tenant::text,14103));
 select * into exchange from identity_private.mobile_email_exchanges where email_invitation_id=lease.email_invitation_id;
 select * into invite from public.identity_invitations where id=lease.email_invitation_id;
 if exchange.state<>'reserved' or invite.status<>'pending' or invite.expires_at<=clock_timestamp()
  or invite.contact_digest<>encode(sha256(convert_to(lower(btrim(new.email)),'UTF8')),'hex')
  or not exists(select 1 from identity_private.mobile_invitations i
   join identity_private.mobile_invitation_claims c on c.id=exchange.claim_id
   where i.id=exchange.mobile_invitation_id and i.tenant_id=tenant
    and i.status='claimed' and i.version=exchange.invitation_version and i.expires_at>clock_timestamp()
    and c.state='active' and c.expires_at>clock_timestamp()) then return new;end if;
 select e.subject_id into internal_id from public.external_identities e
  join public.subjects s on s.id=e.subject_id
  where e.provider='supabase' and e.provider_subject=new.id::text
   and s.created_at>=transaction_timestamp()
   and not exists(select 1 from public.subject_contacts contact where contact.subject_id=s.id)
   and not exists(select 1 from public.external_identities other
    where other.subject_id=s.id and other.provider_subject<>new.id::text);
 if internal_id is null then return new;end if;
 insert into identity_private.mobile_identity_creation_receipts(email_invitation_id,provider_subject_id,subject_id)
  values(invite.id,new.id,internal_id) on conflict do nothing;
 return new;
end $$;
revoke all on function identity_private.capture_mobile_identity_creation() from public,anon,authenticated,service_role;
create trigger zz_capture_mobile_identity_creation after insert on auth.users
 for each row execute function identity_private.capture_mobile_identity_creation();

alter function public.finish_mobile_email_exchange(uuid,text,text,uuid,uuid)
 rename to finish_mobile_email_exchange_before_provenance;
revoke all on function public.finish_mobile_email_exchange_before_provenance(uuid,text,text,uuid,uuid)
 from public,anon,authenticated,service_role;
create function public.finish_mobile_email_exchange(p_tenant_id uuid,p_token_digest text,
 p_claim_digest text,p_request_key uuid,p_provider_subject uuid default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare claim uuid;
begin
 claim:=identity_private.live_mobile_email_claim(p_tenant_id,p_token_digest,p_claim_digest,p_request_key);
 if claim is null then return false;end if;
 if p_provider_subject is not null and not exists(
  select 1 from identity_private.mobile_identity_creation_receipts r
  join identity_private.mobile_email_exchanges x on x.email_invitation_id=r.email_invitation_id
  where x.claim_id=claim and r.provider_subject_id=p_provider_subject) then
  return false;
 end if;
 return public.finish_mobile_email_exchange_before_provenance(p_tenant_id,p_token_digest,p_claim_digest,p_request_key,p_provider_subject);
end $$;
revoke all on function public.finish_mobile_email_exchange(uuid,text,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.finish_mobile_email_exchange(uuid,text,text,uuid,uuid) to service_role;
commit;
