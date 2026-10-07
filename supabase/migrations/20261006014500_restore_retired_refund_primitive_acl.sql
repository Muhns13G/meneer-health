-- Keep the retained inner primitive callable only through the current security-definer wrapper.
-- The prior regression fix inadvertently restored a service-role execute grant retired in 11.8.
-- Restore that original ACL; no function body, data or current public entrypoint is changed.
revoke all on function public.staff_refund_command_before_reconciliation(jsonb,jsonb)
 from public,anon,authenticated,service_role;
