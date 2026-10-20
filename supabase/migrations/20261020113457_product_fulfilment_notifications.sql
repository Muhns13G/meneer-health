begin;
-- Reference-only outbox integration. No historical backfill, dispatch or mode activation.
alter table audit_private.transactional_notifications
 drop constraint transactional_notifications_source_kind_check;
alter table audit_private.transactional_notifications
 add constraint transactional_notifications_source_kind_check
 check(source_kind in('profile','rights','workflow','settlement','support','product_fulfilment'));

create function audit_private.capture_product_fulfilment_notification() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin
 -- The client belongs to the exact immutable offer, never the workforce actor or caller input.
 select subject_id into recipient from commerce_private.offers
 where id=new.offer_id and tenant_id=new.tenant_id;
 if recipient is null then
  raise exception using errcode='23503',message='FULFILMENT_NOTIFICATION_SCOPE_INVALID';
 end if;
 insert into audit_private.transactional_notifications
 (tenant_id,subject_id,source_kind,source_id,source_version,template,owner)
 values(new.tenant_id,recipient,'product_fulfilment',new.id,new.version::text,'service-v1','operations')
 on conflict do nothing;
 return new;
end $$;
revoke all on function audit_private.capture_product_fulfilment_notification()
 from public,anon,authenticated,service_role;
create trigger product_fulfilment_transactional_notification
 after insert on commerce_private.product_fulfilment_events
 for each row execute function audit_private.capture_product_fulfilment_notification();
commit;
