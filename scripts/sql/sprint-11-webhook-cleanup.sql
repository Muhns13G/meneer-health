-- Execute only after configuration restoration and removal of the exact test endpoint.
-- Scoped immutable evidence removal is owner-authorised, locked and transactional.
begin;
lock table public.tenants, public.service_identities, public.service_identity_scopes,
  commerce_private.provider_receipts, commerce_private.receipt_applications,
  commerce_private.provider_exceptions, public.audit_events, public.audit_chain_heads,
  audit_private.operations_alerts, audit_private.operations_alert_dispatch,
  audit_private.operations_alert_attempts, audit_private.operations_alert_delivery_facts,
  audit_private.operations_alert_responses in access exclusive mode;
do $$declare r record; n bigint; begin
  if (select count(*) from public.tenants)<>2 or not exists(select 1 from public.tenants
      where id='80000000-0000-4000-8000-000000000001' and status='suspended')
    or not exists(select 1 from public.tenants where id='e1190000-0000-4000-8000-000000000001'
      and slug='synthetic-sprint11-webhook') or (select count(*) from auth.users)<>0
    or (select count(*) from public.service_identities)<>1
    or exists(select 1 from public.service_identities
      where id<>'e1190000-0000-4000-8000-000000000002')
    or exists(select 1 from commerce_private.provider_receipts
      where tenant_boundary<>'e1190000-0000-4000-8000-000000000001'
      or service_id<>'e1190000-0000-4000-8000-000000000002')
    or exists(select 1 from commerce_private.provider_exceptions e where not exists(
      select 1 from commerce_private.provider_receipts p where p.account_id=e.account_id
        and p.event_id=e.event_id and p.tenant_boundary='e1190000-0000-4000-8000-000000000001'))
    or exists(select 1 from public.audit_events where tenant_id<>'e1190000-0000-4000-8000-000000000001')
    or exists(select 1 from audit_private.operations_alerts where tenant_id<>'e1190000-0000-4000-8000-000000000001') then
    raise exception 'SPRINT11_WEBHOOK_CLEANUP_SCOPE_CHANGED';
  end if;
  for r in select c.relname from pg_class c join pg_namespace s on s.oid=c.relnamespace
    where s.nspname='commerce_private' and c.relkind='r'
      and c.relname not in('provider_receipts','provider_exceptions','receipt_applications') loop
    execute format('select count(*) from commerce_private.%I',r.relname) into n;
    if n<>0 then raise exception 'SPRINT11_UNEXPECTED_COMMERCE_DATA'; end if;
  end loop;
  if exists(select 1 from audit_private.operations_alert_dispatch)
    or exists(select 1 from audit_private.operations_alert_attempts)
    or exists(select 1 from audit_private.operations_alert_responses) then
    raise exception 'SPRINT11_UNEXPECTED_ALERT_ACTIVITY';
  end if;
end $$;
create temporary table sprint11_transport_triggers on commit drop as
  select tgrelid::regclass::text relation,tgname,tgenabled from pg_trigger
  where not tgisinternal and tgname in('provider_receipts_append_only',
    'operations_alerts_append_only','audit_events_append_only')
    and tgrelid in('commerce_private.provider_receipts'::regclass,
      'audit_private.operations_alerts'::regclass,'public.audit_events'::regclass);
do $$declare r record;begin
  if (select count(*) from sprint11_transport_triggers)<>3
    or exists(select 1 from sprint11_transport_triggers where tgenabled<>'O') then
    raise exception 'SPRINT11_TRIGGER_BASELINE_CHANGED';
  end if;
  for r in select * from sprint11_transport_triggers loop
    execute format('alter table %s disable trigger %I',r.relation,r.tgname);
  end loop;
end $$;
delete from commerce_private.receipt_applications a using commerce_private.provider_receipts p
  where a.account_id=p.account_id and a.event_id=p.event_id
    and p.tenant_boundary='e1190000-0000-4000-8000-000000000001';
delete from commerce_private.provider_exceptions e using commerce_private.provider_receipts p
  where e.account_id=p.account_id and e.event_id=p.event_id
    and p.tenant_boundary='e1190000-0000-4000-8000-000000000001';
delete from commerce_private.provider_receipts where tenant_boundary='e1190000-0000-4000-8000-000000000001';
delete from audit_private.operations_alerts where tenant_id='e1190000-0000-4000-8000-000000000001';
delete from public.audit_events where tenant_id='e1190000-0000-4000-8000-000000000001';
delete from public.audit_chain_heads where tenant_id='e1190000-0000-4000-8000-000000000001';
delete from public.service_identity_scopes where service_identity_id='e1190000-0000-4000-8000-000000000002';
delete from public.service_identities where id='e1190000-0000-4000-8000-000000000002'
  and tenant_id='e1190000-0000-4000-8000-000000000001';
delete from public.tenants where id='e1190000-0000-4000-8000-000000000001';
do $$declare r record;begin
  for r in select * from sprint11_transport_triggers loop
    execute format('alter table %s enable trigger %I',r.relation,r.tgname);
  end loop;
  if exists(select 1 from sprint11_transport_triggers b join pg_trigger t
    on t.tgrelid=b.relation::regclass and t.tgname=b.tgname where t.tgenabled<>b.tgenabled)
    or (select count(*) from public.tenants)<>1 then
    raise exception 'SPRINT11_TRANSPORT_RESTORATION_FAILED';
  end if;
end $$;
commit;
