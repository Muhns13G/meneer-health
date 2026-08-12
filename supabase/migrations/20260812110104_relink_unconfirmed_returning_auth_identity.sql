-- Supabase may insert an Auth user before setting email_confirmed_at. Resolve an existing verified
-- provider contact during that first insert so a subsequent confirmation update cannot bind the
-- new provider identity to a duplicate internal subject.

create or replace function identity_private.sync_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  internal_subject_id uuid;
begin
  select external_identity.subject_id
  into internal_subject_id
  from public.external_identities as external_identity
  where external_identity.provider = 'supabase'
    and external_identity.provider_subject = new.id::text;

  if internal_subject_id is null and new.email is not null then
    select contact.subject_id
    into internal_subject_id
    from public.subject_contacts as contact
    where contact.provider = 'supabase'
      and contact.kind = 'email'
      and lower(contact.normalized_value) = lower(new.email)
    for update;
  end if;

  if internal_subject_id is null then
    insert into public.subjects default values
    returning id into internal_subject_id;
  end if;

  insert into public.external_identities (subject_id, provider, provider_subject)
  values (internal_subject_id, 'supabase', new.id::text)
  on conflict (provider, provider_subject) do nothing;

  if new.email is not null and new.email_confirmed_at is not null then
    insert into public.subject_contacts (
      subject_id,
      kind,
      normalized_value,
      status,
      provider,
      verified_at
    )
    values (
      internal_subject_id,
      'email',
      lower(new.email),
      'verified',
      'supabase',
      new.email_confirmed_at
    )
    on conflict (subject_id, kind) do update
      set normalized_value = excluded.normalized_value,
          status = excluded.status,
          provider = excluded.provider,
          verified_at = excluded.verified_at,
          updated_at = now();
  end if;

  return new;
end;
$$;

revoke all on function identity_private.sync_auth_user() from public, anon, authenticated, service_role;

comment on function identity_private.sync_auth_user() is
  'Maps managed identities to stable internal subjects and relinks returning contacts before confirmation updates.';
