-- Only owner-approved manifested UUID roots. Never include the existing pilot tenant.
-- Preserve concurrent legitimate onboarding: fingerprint unrelated rows inside the locked transaction.
begin;
create temporary table fixture_roots(id text primary key) on commit drop;
insert into fixture_roots select distinct jsonb_array_elements_text('{{roots}}'::jsonb);
create temporary table fixture_rows(rel oid,tid tid,primary key(rel,tid)) on commit drop;
create temporary table unaffected_baseline(rel oid primary key,n bigint,fingerprint text) on commit drop;
do $$declare r record; f record; joins text; added integer; changed integer;
begin
 if exists(select 1 from fixture_roots where id='80000000-0000-4000-8000-000000000001' or id !~ '^[a-f0-9-]{36}$')
  or exists(select 1 from public.tenants where id::text in(select id from fixture_roots)
    and (id<>'{{isolated_tenant}}'::uuid or slug<>'email-fallback-'||id::text)) then
  raise exception 'EMAIL_CLEANUP_TENANT_ROOT_REJECTED'; end if;
 for r in select c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where c.relkind='r' and n.nspname in('public','identity_private','audit_private') loop
  execute format('insert into fixture_rows select %s,ctid from %s t where exists(select 1 from jsonb_each_text(to_jsonb(t)) j join fixture_roots x on x.id=j.value) on conflict do nothing',r.oid,r.oid::regclass);
 end loop;
 loop
  changed:=0;
  for f in select conrelid,confrelid,conkey,confkey from pg_constraint where contype='f'
   and conrelid in(select c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname in('public','identity_private','audit_private')) loop
   select string_agg(format('c.%I=p.%I',ca.attname,pa.attname),' and ') into joins
    from unnest(f.conkey,f.confkey) k(child,parent)
    join pg_attribute ca on ca.attrelid=f.conrelid and ca.attnum=k.child
    join pg_attribute pa on pa.attrelid=f.confrelid and pa.attnum=k.parent;
   execute format('insert into fixture_rows select %s,c.ctid from %s c join %s p on %s join fixture_rows e on e.rel=%s and e.tid=p.ctid on conflict do nothing',f.conrelid,f.conrelid::regclass,f.confrelid::regclass,joins,f.confrelid);
   get diagnostics added=row_count; changed:=changed+added;
  end loop;
  exit when changed=0;
 end loop;
 if exists(select 1 from public.audit_events a join fixture_rows e on e.rel='public.audit_events'::regclass and e.tid=a.ctid where a.tenant_id<>'{{isolated_tenant}}'::uuid) then
  raise exception 'EMAIL_CLEANUP_REQUIRES_ISOLATED_AUDIT_TENANT'; end if;
 for r in select distinct rel from fixture_rows order by rel loop
  execute format('lock table %s in access exclusive mode',r.rel::regclass);
  execute format('insert into unaffected_baseline select %s,count(*),md5(coalesce(string_agg(to_jsonb(t)::text,''|'' order by to_jsonb(t)::text),'''')) from %s t where not exists(select 1 from fixture_rows e where e.rel=%s and e.tid=t.ctid)',r.rel,r.rel::regclass,r.rel);
 end loop;
end $$;
create temporary table named_guards on commit drop as select t.tgrelid,t.tgname,t.tgenabled
 from pg_trigger t where not t.tgisinternal and (t.tgtype & 8)=8
 and t.tgrelid in(select distinct rel from fixture_rows)
 and (t.tgname like '%append_only' or t.tgname like '%immutable'
 or t.tgname in('mobile_invitation_guard','mobile_token_guard','mobile_claim_guard','mobile_contact_guard','mobile_email_exchange_guard','pilot_email_attempt_guard'));
do $$declare r record; f record; joins text; blocked boolean; changed integer; remaining integer; n bigint; fingerprint text;
begin
 for r in select * from named_guards loop
  if r.tgenabled<>'O' then raise exception 'EMAIL_CLEANUP_GUARD_ALREADY_DISABLED'; end if;
  execute format('alter table %s disable trigger %I',r.tgrelid::regclass,r.tgname);
 end loop;
 loop
  changed:=0;
  for r in select distinct rel from fixture_rows order by rel loop
   blocked:=false;
   for f in select conrelid,confrelid,conkey,confkey from pg_constraint where contype='f' and confrelid=r.rel and conrelid<>confrelid loop
    select string_agg(format('c.%I=p.%I',ca.attname,pa.attname),' and ') into joins
     from unnest(f.conkey,f.confkey) k(child,parent)
     join pg_attribute ca on ca.attrelid=f.conrelid and ca.attnum=k.child
     join pg_attribute pa on pa.attrelid=f.confrelid and pa.attnum=k.parent;
    execute format('select exists(select 1 from %s c join %s p on %s join fixture_rows e on e.rel=%s and e.tid=p.ctid)',f.conrelid::regclass,f.confrelid::regclass,joins,r.rel) into blocked;
    exit when blocked;
   end loop;
   if not blocked then
    execute format('delete from %s t using fixture_rows e where e.rel=%s and e.tid=t.ctid',r.rel::regclass,r.rel);
    delete from fixture_rows where rel=r.rel; changed:=changed+1;
   end if;
  end loop;
  select count(*) into remaining from fixture_rows;
  exit when remaining=0;
  if changed=0 then raise exception 'EMAIL_CLEANUP_DEPENDENCY_BLOCKED'; end if;
 end loop;
 for r in select * from named_guards loop
  execute format('alter table %s enable trigger %I',r.tgrelid::regclass,r.tgname);
 end loop;
 if exists(select 1 from named_guards g join pg_trigger t on t.tgrelid=g.tgrelid and t.tgname=g.tgname where t.tgenabled<>g.tgenabled) then
  raise exception 'EMAIL_CLEANUP_GUARD_RESTORE_FAILED'; end if;
 for r in select * from unaffected_baseline loop
  execute format('select count(*),md5(coalesce(string_agg(to_jsonb(t)::text,''|'' order by to_jsonb(t)::text),'''')) from %s t',r.rel::regclass) into n,fingerprint;
  if n<>r.n or fingerprint<>r.fingerprint then raise exception 'EMAIL_CLEANUP_UNRELATED_ROWS_CHANGED'; end if;
 end loop;
end $$;
commit;
select true as scoped_cleanup_committed;
