-- Read-only aggregate inventory. Retain fingerprints privately for exact fixture cleanup.
select n.nspname || '.' || c.relname as relation,
  ((xpath('/row/n/text()', x))[1]::text)::bigint as n,
  (xpath('/row/fingerprint/text()', x))[1]::text as fingerprint
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join lateral query_to_xml(format(
  'select count(*) n, md5(coalesce(string_agg(to_jsonb(t)::text,''|'' order by to_jsonb(t)::text),'''')) fingerprint from %s t',
  c.oid::regclass), false, true, '') x
where c.relkind = 'r' and n.nspname in (
  'public', 'identity_private', 'intake_private', 'commerce_private', 'audit_private',
  'payments_private', 'fulfilment_private', 'lifecycle_private', 'measurement_private'
)
order by relation;
