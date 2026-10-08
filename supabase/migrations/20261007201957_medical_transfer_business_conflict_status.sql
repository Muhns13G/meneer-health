-- Permanent medical grant/transfer conflicts must not invoke serialization retries.
-- Only six named intentional raises change; authority, guards, ACLs and audit stay unchanged.
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
  conflict_marker constant text := 'errcode=''40001'',message=''MEDICAL_CONFLICT''';
begin
  for target in select * from (values
    ('public.approve_medical_grant(jsonb,jsonb)',1),
    ('public.authorise_medical_transfer(jsonb,uuid,uuid,uuid,uuid)',1),
    ('public.record_medical_transfer(jsonb,jsonb)',2),
    ('public.reconcile_medical_transfer(jsonb,jsonb)',2)
  ) as functions(signature,expected_count) loop
    function_id := target.signature::regprocedure::oid;
    select pg_get_functiondef(p.oid),p.proacl,p.proowner,p.proconfig,p.prosecdef
      into definition,original_acl,original_owner,original_config,original_security
      from pg_proc p where p.oid=function_id;
    if (length(definition)-length(replace(definition,marker,'')))/length(marker)<>target.expected_count
      or (length(definition)-length(replace(definition,conflict_marker,'')))/length(conflict_marker)<>target.expected_count then
      raise exception 'MEDICAL_TRANSFER_CONFLICT_DEFINITION_UNEXPECTED';
    end if;
    execute replace(definition,conflict_marker,'errcode=''PT409'',message=''MEDICAL_CONFLICT''');
    if exists(select 1 from pg_proc p where p.oid=function_id and
      (p.proacl is distinct from original_acl or p.proowner<>original_owner or
       p.proconfig is distinct from original_config or p.prosecdef<>original_security)) then
      raise exception 'MEDICAL_TRANSFER_CONFLICT_SECURITY_METADATA_CHANGED';
    end if;
  end loop;
end $$;
commit;
