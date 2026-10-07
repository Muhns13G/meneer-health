-- Permanent queue conflicts must not trigger PostgREST serialization retries.
-- Only four intentional raises change; genuine serialization errors remain unchanged.
begin;
do $$
declare
  function_id oid := 'public.command_operations_queue(uuid,uuid,text,uuid,uuid,uuid,jsonb)'::regprocedure::oid;
  definition text;
  original_acl aclitem[];
  original_owner oid;
  original_config text[];
  original_security boolean;
  marker constant text := 'errcode=''40001''';
  conflict_marker constant text := 'errcode=''40001'',message=''QUEUE_CONFLICT''';
begin
  select pg_get_functiondef(p.oid), p.proacl, p.proowner, p.proconfig, p.prosecdef
    into definition, original_acl, original_owner, original_config, original_security
    from pg_proc p where p.oid = function_id;
  if (length(definition) - length(replace(definition, marker, ''))) / length(marker) <> 4
    or (length(definition) - length(replace(definition, conflict_marker, '')))
      / length(conflict_marker) <> 4 then
    raise exception 'QUEUE_CONFLICT_DEFINITION_UNEXPECTED';
  end if;
  execute replace(definition, conflict_marker, 'errcode=''PT409'',message=''QUEUE_CONFLICT''');
  if exists(select 1 from pg_proc p where p.oid = function_id and
    (p.proacl is distinct from original_acl or p.proowner <> original_owner or
     p.proconfig is distinct from original_config or p.prosecdef <> original_security)) then
    raise exception 'QUEUE_CONFLICT_SECURITY_METADATA_CHANGED';
  end if;
end $$;
commit;
