-- Intentional intake conflicts must not trigger PostgREST serialization retries.
-- Genuine database serialization errors, other functions and all access controls are unchanged.
begin;
do $$
declare
  function_id oid := 'public.patient_intake_write(jsonb,jsonb)'::regprocedure::oid;
  definition text;
  original_acl aclitem[];
  original_owner oid;
  original_config text[];
  original_security boolean;
  marker constant text := 'errcode=''40001''';
begin
  select pg_get_functiondef(p.oid), p.proacl, p.proowner, p.proconfig, p.prosecdef
    into definition, original_acl, original_owner, original_config, original_security
    from pg_proc p where p.oid = function_id;
  if (length(definition) - length(replace(definition, marker, ''))) / length(marker) <> 2
    or (length(definition) - length(replace(definition,
      'errcode=''40001'',message=''INTAKE_CONFLICT''', '')))
      / length('errcode=''40001'',message=''INTAKE_CONFLICT''') <> 2 then
    raise exception 'INTAKE_CONFLICT_DEFINITION_UNEXPECTED';
  end if;
  execute replace(definition, marker, 'errcode=''PT409''');
  if exists(select 1 from pg_proc p where p.oid = function_id and
    (p.proacl is distinct from original_acl or p.proowner <> original_owner or
     p.proconfig is distinct from original_config or p.prosecdef <> original_security)) then
    raise exception 'INTAKE_CONFLICT_SECURITY_METADATA_CHANGED';
  end if;
end $$;
commit;
