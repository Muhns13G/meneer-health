-- Retain Supabase's automatic-RLS event trigger while preventing browser and
-- service API roles from invoking its SECURITY DEFINER function through RPC.
-- Local Supabase versions that do not provision this helper remain compatible.
do $migration$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated, service_role';
  end if;
end
$migration$;
