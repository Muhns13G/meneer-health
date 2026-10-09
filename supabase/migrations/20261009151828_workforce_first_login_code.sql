-- Existing reviewed workforce only. No user creation, confirmation, session or grant mutation.
begin;
create function public.resolve_workforce_code_target(p_email text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare targets uuid[];
begin
 select array_agg(distinct u.id) into targets
 from auth.users u
 join public.external_identities e on e.provider='supabase' and e.provider_subject=u.id::text
 join public.subjects s on s.id=e.subject_id and s.status='active'
 join public.tenant_memberships m on m.subject_id=s.id
 join public.tenants t on t.id=m.tenant_id and t.status='active'
 where lower(u.email)=lower(btrim(p_email)) and not coalesce(u.is_anonymous,false)
 and (u.banned_until is null or u.banned_until<=clock_timestamp())
 and m.role in ('operations','support','auditor','admin','release','clinician','pharmacy')
 and m.status='active' and m.valid_from<=clock_timestamp() and m.expires_at>clock_timestamp()
 and m.approved_by_subject_id is not null and m.approved_by_subject_id<>s.id;
 if coalesce(cardinality(targets),0)<>1 then
  raise exception using errcode='42501',message='WORKFORCE_REJECTED';
 end if;
 return targets[1];
end $$;
revoke all on function public.resolve_workforce_code_target(text) from public,anon,authenticated;
grant execute on function public.resolve_workforce_code_target(text) to service_role;
commit;
