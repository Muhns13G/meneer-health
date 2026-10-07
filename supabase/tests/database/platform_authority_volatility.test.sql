begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(8);

select is(provolatile::text, 'v', 'notification retry authority is volatile')
from pg_proc where oid = 'audit_private.notification_resend_allowed(audit_private.transactional_notifications,jsonb)'::regprocedure;
select is(provolatile::text, 'v', 'queue authority resolver is volatile')
from pg_proc where oid = 'identity_private.read_operations_queue_before_audit(uuid,uuid,text,uuid,uuid,uuid,uuid,text,timestamptz,uuid)'::regprocedure;

select ok(not has_function_privilege(role_name, function_id, 'execute'),
  role_name || ' cannot execute retired/internal authority primitive')
from (values ('anon'), ('authenticated'), ('service_role')) roles(role_name)
cross join (values
  ('audit_private.notification_resend_allowed(audit_private.transactional_notifications,jsonb)'::regprocedure),
  ('identity_private.read_operations_queue_before_audit(uuid,uuid,text,uuid,uuid,uuid,uuid,text,timestamptz,uuid)'::regprocedure)
) functions(function_id);

select * from finish();
rollback;
