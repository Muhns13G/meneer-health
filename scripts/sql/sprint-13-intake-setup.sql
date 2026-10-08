-- Bounded synthetic publication only; no real professional appointment or clinical approval.
begin;
do $$begin
  if not exists(select 1 from public.tenants
    where id='80000000-0000-4000-8000-000000000001' and status='suspended')
    or not exists(select 1 from public.tenants
      where id='e1330000-0000-4000-8000-000000000001' and status='active')
    or (select count(*) from public.client_profiles
      where tenant_id='e1330000-0000-4000-8000-000000000001')<>1
    or exists(select 1 from intake_private.publications)
  then raise exception 'SPRINT13_INTAKE_BASELINE_CHANGED'; end if;
end $$;
insert into public.subjects(id) values ('e1330000-0000-4000-8000-000000000007');
insert into intake_private.publications(
  id,tenant_id,collection_version,control_version,catalogue_hash,privacy_body,review_body,
  recipient_reference,clinical_approver,privacy_approver,primary_responder,fallback_responder,
  acknowledgement_seconds,guidance_version,urgent_guidance,after_hours_guidance,
  effective_at,expires_at,status
) values (
  'e1330000-0000-4000-8000-000000000008','e1330000-0000-4000-8000-000000000001',
  '1.1.0','1.0.0','06db05e0eac46bebb855f4aa9afca05769603ce0c4f19282931904216cbd5a34',
  'SYNTHETIC TEST ONLY privacy','SYNTHETIC TEST ONLY review',
  'e1330000-0000-4000-8000-000000000009','e1330000-0000-4000-8000-000000000007',
  'e1330000-0000-4000-8000-000000000002','e1330000-0000-4000-8000-000000000007',
  'e1330000-0000-4000-8000-000000000002',300,'e1330000-0000-4000-8000-000000000011',
  'SYNTHETIC TEST ONLY urgent guidance','SYNTHETIC TEST ONLY fallback',
  now()-interval '1 minute',now()+interval '2 hours','published'
);
commit;
