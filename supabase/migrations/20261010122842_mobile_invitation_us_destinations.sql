-- US delivery support only. No messages, country activation, budget or sender changes.
begin;
alter table identity_private.mobile_invitation_policies
 add column us_delivery_ready boolean not null default false;

-- US geographic numbering metadata, Google libphonenumber, inspected 2026-10-10,
-- Apache-2.0, Copyright The Libphonenumber Authors. +1 is not US-only.
create function identity_private.mobile_us_destination(phone text) returns boolean
language sql immutable security invoker set search_path='' as $$
 select coalesce(phone ~ '^\+1(?:983[2-57-9][0-9]{6}|(?:2(?:0[1-35-9]|1[02-9]|2[03-57-9]|3[1459]|4[08]|5[1-46]|6[0279]|7[02469]|8[13])|3(?:0[1-57-9]|1[02-9]|2[013-79]|3[0-24679]|4[167]|5[0-3]|6[01349]|8[056])|4(?:0[124-9]|1[02-579]|2[3-5]|3[0245]|4[023578]|58|6[349]|7[02589]|8[04])|5(?:0[1-57-9]|1[0235-8]|20|3[0149]|4[01]|5[179]|6[1-47]|7[0-5]|8[0256])|6(?:0[1-35-9]|1[024-9]|2[03689]|3[016]|4[0156]|5[01679]|6[0-279]|78|8[0-269])|7(?:0[1-46-8]|1[2-9]|2[04-8]|3[0-2478]|4[0378]|5[47]|6[02359]|7[0-59]|8[156])|8(?:0[1-68]|1[02-8]|2[0168]|3[0-2589]|4[03578]|5[046-9]|6[02-5]|7[028])|9(?:0[1346-9]|1[02-9]|2[0589]|3[0146-8]|4[01357-9]|5[12469]|7[0-3589]|8[04-69]))[2-9][0-9]{6})$',false)
$$;
revoke all on function identity_private.mobile_us_destination(text)
 from public,anon,authenticated,service_role;

-- Patch just the existing native destination check. Preserve all current authority,
-- one-shot, expiry, budget, audit, ownership, ACL and security settings.
do $$declare target oid; definition text; original record; marker text; replacement text;
begin
 target:='public.prepare_mobile_invitation_delivery(uuid,uuid,text,uuid,uuid,uuid,uuid,integer,uuid,text,uuid,text)'::regprocedure;
 select proacl,proowner,proconfig,prosecdef,provolatile into original from pg_proc where oid=target;
 definition:=pg_get_functiondef(target);
 marker:='phone_value is null or phone_value !~ ''^\+27[0-9]{9}$''';
 replacement:='phone_value is null or not (phone_value ~ ''^\+27[0-9]{9}$'' or (policy.us_delivery_ready and identity_private.mobile_us_destination(phone_value)))';
 if (length(definition)-length(replace(definition,marker,'')))/length(marker)<>1 then
  raise exception 'MOBILE_US_PATCH_SHAPE_INVALID';end if;
 execute replace(definition,marker,replacement);
 if exists(select 1 from pg_proc p where p.oid=target and
  (p.proacl is distinct from original.proacl or p.proowner<>original.proowner
   or p.proconfig is distinct from original.proconfig or p.prosecdef<>original.prosecdef
   or p.provolatile<>original.provolatile)) then
  raise exception 'MOBILE_US_SECURITY_METADATA_CHANGED';end if;
end $$;
commit;
