-- Readiness correction only: time-sensitive predicates and volatile authority resolution must
-- not advertise statement-stable results. ALTER preserves bodies, ownership, ACLs and search_path.
alter function audit_private.notification_resend_allowed(
  audit_private.transactional_notifications, jsonb
) volatile;

alter function identity_private.read_operations_queue_before_audit(
  uuid, uuid, text, uuid, uuid, uuid, uuid, text, timestamptz, uuid
) volatile;
