-- Requires the exact pre-exercise count/fingerprint inventory and validated fixture UUID roots.
-- No TRUNCATE/CASCADE. Delete only identified roots and their FK descendants, children first.
begin;
create temporary table exercise_baseline(relation text primary key,n bigint,fingerprint text) on commit drop;
insert into exercise_baseline select * from jsonb_to_recordset('{{baseline}}'::jsonb)
 as x(relation text,n bigint,fingerprint text);
create temporary table exercise_rows(rel oid,tid tid,primary key(rel,tid)) on commit drop;
create temporary table exercise_roots(id text primary key) on commit drop;
insert into exercise_roots select jsonb_array_elements_text('{{roots}}'::jsonb);
do $$declare r record;f record; joins text; changed integer; added integer; remaining integer; n bigint; h text;
begin
 if not exists(select 1 from public.tenants where id='80000000-0000-4000-8000-000000000001' and status='suspended')
 or exists(select 1 from auth.users where id::text not in(select id from exercise_roots)) then
 raise exception 'JOURNEY_CLEANUP_SCOPE_CHANGED';end if;
 -- Locks cover only nonempty fixture-affected tables; unchanged baseline resources stay untouched.
 for r in select relation from exercise_baseline loop
  execute format('insert into exercise_rows select %L::regclass,ctid from %s t where exists(select 1 from jsonb_each_text(to_jsonb(t)) j join exercise_roots x on x.id=j.value) on conflict do nothing',r.relation,r.relation);
 end loop;
 -- Orphan exceptions deliberately have no intent_id and no receipt FK. Prove their exact
 -- composite receipt lineage to an already marked fixture row; never scope by account alone.
 insert into exercise_rows
 select 'commerce_private.provider_exceptions'::regclass,x.ctid
 from commerce_private.provider_exceptions x
 join commerce_private.provider_receipts p on p.account_id=x.account_id and p.event_id=x.event_id
 join exercise_rows owned on owned.rel='commerce_private.provider_receipts'::regclass
  and owned.tid=p.ctid
 on conflict do nothing;
 loop
  changed:=0;
  for f in select c.conrelid,c.confrelid,c.conkey,c.confkey from pg_constraint c
   where c.contype='f' and c.conrelid in(select relation::regclass from exercise_baseline)
   and c.confrelid in(select relation::regclass from exercise_baseline) loop
   select string_agg(format('c.%I=p.%I',ca.attname,pa.attname),' and ') into joins
   from unnest(f.conkey,f.confkey) k(child,parent)
   join pg_attribute ca on ca.attrelid=f.conrelid and ca.attnum=k.child
   join pg_attribute pa on pa.attrelid=f.confrelid and pa.attnum=k.parent;
   execute format('insert into exercise_rows select %s,c.ctid from %s c join %s p on %s join exercise_rows e on e.rel=%s and e.tid=p.ctid on conflict do nothing',f.conrelid,f.conrelid::regclass,f.confrelid::regclass,joins,f.confrelid);
   get diagnostics added=row_count;changed:=changed+added;
  end loop;
  exit when changed=0;
 end loop;
 for r in select distinct rel from exercise_rows order by rel loop
  execute format('lock table %s in access exclusive mode',r.rel::regclass);
 end loop;
 for r in select * from exercise_baseline loop
  execute format('select count(*),md5(coalesce(string_agg(to_jsonb(t)::text,''|'' order by to_jsonb(t)::text),'''')) from %s t where not exists(select 1 from exercise_rows e where e.rel=%L::regclass and e.tid=t.ctid)',r.relation,r.relation) into n,h;
  if n<>r.n or h<>r.fingerprint then raise exception 'JOURNEY_UNRELATED_DATA_CHANGED';end if;
 end loop;
 -- Revoke only our app sessions; provider users/sessions are separately removed through Auth Admin.
 update public.identity_sessions set status='revoked',revoked_at=now(),revocation_reason='synthetic-exercise-cleanup'
 where subject_id::text in(select id from exercise_roots) and status='active';
 -- UPDATE changes ctid; rebuild this table's exact root marks before deletion.
 delete from exercise_rows where rel='public.identity_sessions'::regclass;
 insert into exercise_rows select 'public.identity_sessions'::regclass,ctid from public.identity_sessions where subject_id::text in(select id from exercise_roots);
end $$;
create temporary table exercise_triggers on commit drop as
 select t.tgrelid,t.tgname,t.tgenabled from pg_trigger t
 where not t.tgisinternal and (t.tgtype & 8)=8
 and t.tgrelid in(select distinct rel from exercise_rows)
 and (t.tgname like '%append_only' or t.tgname like '%immutable'
 or t.tgname in('checkout_intents_guard','refund_jobs_guard'));
do $$declare r record;f record; joins text;blocked boolean;remaining integer;changed integer;n bigint;h text;
begin
 for r in select * from exercise_triggers loop
  if r.tgenabled<>'O' then raise exception 'JOURNEY_TRIGGER_BASELINE_CHANGED';end if;
  execute format('alter table %s disable trigger %I',r.tgrelid::regclass,r.tgname);
 end loop;
 loop
  changed:=0;
  for r in select distinct rel from exercise_rows order by rel loop
   blocked:=false;
   for f in select conrelid,confrelid,conkey,confkey from pg_constraint
    where contype='f' and confrelid=r.rel and conrelid<>confrelid loop
    select string_agg(format('c.%I=p.%I',ca.attname,pa.attname),' and ') into joins
    from unnest(f.conkey,f.confkey) k(child,parent)
    join pg_attribute ca on ca.attrelid=f.conrelid and ca.attnum=k.child
    join pg_attribute pa on pa.attrelid=f.confrelid and pa.attnum=k.parent;
    execute format('select exists(select 1 from %s c join %s p on %s join exercise_rows e on e.rel=%s and e.tid=p.ctid)',f.conrelid::regclass,f.confrelid::regclass,joins,r.rel) into blocked;
    exit when blocked;
   end loop;
   if not blocked then
    execute format('delete from %s t using exercise_rows e where e.rel=%s and e.tid=t.ctid',r.rel::regclass,r.rel);
    delete from exercise_rows where rel=r.rel;changed:=changed+1;
   end if;
  end loop;
  select count(*) into remaining from exercise_rows;
  exit when remaining=0;
  if changed=0 then raise exception 'JOURNEY_CLEANUP_DEPENDENCY_BLOCKED';end if;
 end loop;
 for r in select * from exercise_triggers loop
  execute format('alter table %s enable trigger %I',r.tgrelid::regclass,r.tgname);
 end loop;
 if exists(select 1 from exercise_triggers b join pg_trigger t on t.tgrelid=b.tgrelid and t.tgname=b.tgname where t.tgenabled<>b.tgenabled) then raise exception 'JOURNEY_TRIGGER_RESTORE_FAILED';end if;
 for r in select * from exercise_baseline loop
  execute format('select count(*),md5(coalesce(string_agg(to_jsonb(t)::text,''|'' order by to_jsonb(t)::text),'''')) from %s t',r.relation) into n,h;
  if n<>r.n or h<>r.fingerprint then raise exception 'JOURNEY_BASELINE_RESTORE_FAILED';end if;
 end loop;
end $$;
commit;
select true as scoped_cleanup_committed;
