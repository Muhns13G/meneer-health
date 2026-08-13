-- Pair each approved aggregate reviewer with only the purposes assigned to that reviewer class.

create or replace function public.export_measurement_daily_aggregates(
  p_actor_id uuid,
  p_actor_role text,
  p_assurance text,
  p_purpose text,
  p_environment text,
  p_from_date date,
  p_to_date date,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  exported jsonb;
  exported_count bigint;
begin
  if p_assurance <> 'aal2'
    or not (
      (
        p_actor_role in ('privacy_reviewer', 'security_reviewer')
        and p_purpose in ('privacy_request', 'security_investigation')
      )
      or (
        p_actor_role in ('product_reviewer', 'operations_reviewer')
        and p_purpose = 'product_review'
      )
    )
    or p_environment not in ('local', 'preview', 'production')
    or p_to_date < p_from_date
    or p_to_date > p_from_date + 366
  then
    raise exception using errcode = '42501', message = 'MEASUREMENT_ACCESS_DENIED';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'date', aggregate_date,
    'environment', environment,
    'eventName', event_name,
    'campaignId', nullif(campaign_id, ''),
    'step', nullif(step, 0),
    'outcome', nullif(outcome, ''),
    'durationBucket', nullif(duration_bucket, ''),
    'synthetic', synthetic,
    'eventCount', event_count
  ) order by aggregate_date, event_name), '[]'::jsonb), count(*)
  into exported, exported_count
  from measurement_private.daily_aggregates
  where environment = p_environment
    and aggregate_date between p_from_date and p_to_date;

  insert into measurement_private.access_evidence (
    actor_id, actor_role, assurance, purpose, action, environment, record_count, occurred_at
  ) values (
    p_actor_id, p_actor_role, p_assurance, p_purpose, 'aggregate_export', p_environment,
    exported_count, p_occurred_at
  );

  return exported;
end;
$$;

revoke all on function public.export_measurement_daily_aggregates(
  uuid, text, text, text, text, date, date, timestamptz
) from public, anon, authenticated, service_role;
grant execute on function public.export_measurement_daily_aggregates(
  uuid, text, text, text, text, date, date, timestamptz
) to service_role;
