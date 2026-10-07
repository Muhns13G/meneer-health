-- Intentional notification conflicts are not retryable serialization failures.
-- Keep genuine database serialization errors unchanged and preserve function security metadata.
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
    ('public.finish_transactional_notification(uuid,uuid,uuid,text)', 3),
    ('public.bind_transactional_message(uuid,uuid,uuid,text)', 3)
  ) as expected(signature, occurrences)
  loop
    function_id := target.signature::regprocedure::oid;
    select pg_get_functiondef(p.oid), p.proacl, p.proowner, p.proconfig, p.prosecdef
      into definition, original_acl, original_owner, original_config, original_security
      from pg_proc p where p.oid = function_id;
    if (length(definition) - length(replace(definition, marker, ''))) / length(marker)
      <> target.occurrences then
      raise exception 'NOTIFICATION_CONFLICT_DEFINITION_UNEXPECTED';
    end if;
    execute replace(definition, marker, 'errcode=''PT409''');
    if exists (select 1 from pg_proc p where p.oid = function_id and
      (p.proacl is distinct from original_acl or p.proowner <> original_owner or
       p.proconfig is distinct from original_config or p.prosecdef <> original_security)) then
      raise exception 'NOTIFICATION_CONFLICT_SECURITY_METADATA_CHANGED';
    end if;
  end loop;
end $$;
commit;
