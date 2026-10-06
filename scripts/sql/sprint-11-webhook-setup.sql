-- Owner-authorised disposable transport fixture. No client/Auth/clinical/payment state.
begin;
lock table public.tenants, public.service_identities, public.service_identity_scopes
  in access exclusive mode;
do $$declare r record; n bigint; begin
  if (select count(*) from public.tenants)<>1 or not exists(
    select 1 from public.tenants where id='80000000-0000-4000-8000-000000000001'
      and slug='meneer-pilot' and status='suspended')
    or (select count(*) from auth.users)<>0
    or (select count(*) from public.service_identities)<>0 then
    raise exception 'SPRINT11_WEBHOOK_BASELINE_CHANGED';
  end if;
  for r in select c.relname from pg_class c join pg_namespace s on s.oid=c.relnamespace
    where s.nspname='commerce_private' and c.relkind='r' loop
    execute format('select count(*) from commerce_private.%I',r.relname) into n;
    if n<>0 then raise exception 'SPRINT11_COMMERCE_BASELINE_CHANGED'; end if;
  end loop;
end $$;
insert into public.tenants(id,slug,display_name,status) values
  ('e1190000-0000-4000-8000-000000000001','synthetic-sprint11-webhook','SYNTHETIC TRANSPORT ONLY','active');
insert into public.service_identities(id,tenant_id,name,environment,purpose,status,expires_at) values
  ('e1190000-0000-4000-8000-000000000002','e1190000-0000-4000-8000-000000000001',
   'synthetic-sprint11-webhook','preview','operations','active',now()+interval '1 hour');
insert into public.service_identity_scopes(service_identity_id,resource,action) values
  ('e1190000-0000-4000-8000-000000000002','payment','append'),
  ('e1190000-0000-4000-8000-000000000002','payment','update');
commit;
