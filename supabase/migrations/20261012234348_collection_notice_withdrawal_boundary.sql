-- Withdrawal/expiry is a stop, not permission to fall back to the previous company.
create or replace function intake_private.current_collection_notice(tenant uuid)
returns intake_private.publications language plpgsql volatile set search_path='' as $$
declare current_notice intake_private.publications;
begin
 select * into current_notice from intake_private.publications p where p.tenant_id=tenant
 and p.status in('published','withdrawn') and p.effective_at<=clock_timestamp()
 order by p.effective_at desc,p.id desc limit 1;
 if current_notice.status is distinct from 'published' or current_notice.expires_at<=clock_timestamp() then return null;end if;
 return current_notice;
end$$;
revoke all on function intake_private.current_collection_notice(uuid) from public,anon,authenticated,service_role;
