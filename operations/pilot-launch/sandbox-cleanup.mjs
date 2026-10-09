// Builds a NEW scoped packet; historical rehearsal source/guards remain unchanged.
import { readFileSync } from "node:fs";
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function sandboxCleanupSql(m) {
  const preserved = m.baseline.authIds.map(({ id }) => id);
  const disposable = m.fixtureAuthIds ?? [];
  if (
    preserved.length !== 4 ||
    ![...preserved, ...disposable].every((id) => uuid.test(id)) ||
    disposable.some((id) => preserved.includes(id)) ||
    !m.fixtureRoots.every((id) => uuid.test(id) || id === "acct_1U32UbFfj16Nnr1i")
  ) {
    throw new Error("CLEANUP_MANIFEST_SCOPE_INVALID");
  }
  const quote = (id) => "'" + id + "'";
  const originalGuard = `if not exists(select 1 from public.tenants where id='80000000-0000-4000-8000-000000000001' and status='suspended')
 or exists(select 1 from auth.users where id::text not in(select id from exercise_roots)) then`;
  const replacement = `if not exists(select 1 from public.tenants where id='80000000-0000-4000-8000-000000000001' and status='active')
 or (select count(*) from auth.users where id in(${preserved.map(quote).join(",")}))<>4
 or exists(select 1 from auth.users where id not in(${[...preserved, ...disposable].map(quote).join(",")})) then`;
  const guardEnd =
    "or (t.tgrelid='commerce_private.refund_jobs'::regclass and t.tgname='refund_jobs_guard'))";
  const mobileGuards = `or (t.tgrelid='commerce_private.refund_jobs'::regclass and t.tgname='refund_jobs_guard')
   or (t.tgrelid='identity_private.mobile_invitations'::regclass and t.tgname='mobile_invitation_guard')
   or (t.tgrelid='identity_private.mobile_invitation_contacts'::regclass and t.tgname='mobile_contact_guard')
   or (t.tgrelid='identity_private.mobile_invitation_tokens'::regclass and t.tgname='mobile_token_guard')
   or (t.tgrelid='identity_private.mobile_invitation_claims'::regclass and t.tgname='mobile_claim_guard'))`;
  const template = readFileSync(
    new URL("../../scripts/sql/sprint-13-onboarding-cleanup.sql", import.meta.url),
    "utf8",
  );
  if (!template.includes(originalGuard) || !template.includes(guardEnd))
    throw new Error("CLEANUP_TEMPLATE_CHANGED");
  return template
    .replace(originalGuard, replacement)
    .replace(guardEnd, mobileGuards)
    .replaceAll("{{baseline}}", JSON.stringify(m.baseline.inventory).replaceAll("'", "''"))
    .replaceAll("{{roots}}", JSON.stringify(m.fixtureRoots))
    .replace(/^([\s\S]*?)begin;/, "")
    .replace(/commit;\s*select true as scoped_cleanup_committed;\s*$/, "");
}
