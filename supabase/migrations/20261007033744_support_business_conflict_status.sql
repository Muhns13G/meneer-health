-- Business denials must not use serialization_failure: PostgREST retries 40001.
-- Replace only the known support business-conflict raises, preserving function
-- signatures, owners, ACLs, security-definer attributes and search paths.
begin;
do $$
declare
  target record;
  function_id oid;
  definition text;
  original_acl aclitem[];
  original_owner oid;
  original_config text[];
  original_security boolean;
  marker constant text := 'errcode=''40001''';
begin
  for target in select * from (values
    ('public.patient_support_command(jsonb,jsonb)', 1),
    ('public.staff_support_command(jsonb,jsonb)', 2),
    ('public.staff_support_followup(jsonb,jsonb)', 4)
  ) as expected(signature, occurrences)
  loop
    function_id := target.signature::regprocedure::oid;
    select pg_get_functiondef(p.oid), p.proacl, p.proowner, p.proconfig, p.prosecdef
      into definition, original_acl, original_owner, original_config, original_security
      from pg_proc p where p.oid = function_id;
    if (length(definition) - length(replace(definition, marker, ''))) / length(marker)
      <> target.occurrences then
      raise exception 'SUPPORT_CONFLICT_DEFINITION_UNEXPECTED';
    end if;
    execute replace(definition, marker, 'errcode=''PT409''');
    if exists (select 1 from pg_proc p where p.oid = function_id and
      (p.proacl is distinct from original_acl or p.proowner <> original_owner or
       p.proconfig is distinct from original_config or p.prosecdef <> original_security)) then
      raise exception 'SUPPORT_CONFLICT_SECURITY_METADATA_CHANGED';
    end if;
  end loop;
end $$;
commit;
