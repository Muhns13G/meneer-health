import { readFileSync } from "node:fs";
import { z } from "zod";

export const productBaselineSchema = z
  .array(
    z
      .object({
        relation: z
          .string()
          .regex(
            /^(public|identity_private|intake_private|commerce_private|audit_private|payments_private|fulfilment_private|lifecycle_private|measurement_private)\.[a-z_]+$/,
          ),
        n: z.coerce.number().int().min(0),
        fingerprint: z.string().regex(/^[a-f0-9]{32}$/),
      })
      .strict(),
  )
  .min(1);
const oldGuard = ` if not exists(select 1 from public.tenants where id='80000000-0000-4000-8000-000000000001' and status='suspended')
 or exists(select 1 from auth.users where id::text not in(select id from exercise_roots)) then
 raise exception 'ONBOARDING_CLEANUP_SCOPE_CHANGED';end if;`;
export function productNativePriceRootsSql(tenantId: string, catalogueId: string): string {
  const tenant = z.uuid().parse(tenantId),
    catalogue = z.uuid().parse(catalogueId);
  if (tenant === "80000000-0000-4000-8000-000000000001")
    throw Error("PRODUCT_REHEARSAL_CLEANUP_SCOPE_REJECTED");
  return `select p.id from commerce_private.catalogue_price_bindings b
 join commerce_private.catalogue_versions c on c.id=b.catalogue_id
 join commerce_private.prices p on p.id=b.price_id
 where c.tenant_id='${tenant}' and c.id='${catalogue}' and c.provenance='local-synthetic'
 and p.version='catalogue-${catalogue}' and p.environment='local-synthetic' order by p.id;`;
}
export function buildProductHostedCleanup(input: {
  tenant: string;
  exerciseId: string;
  roots: string[];
  realAuthIds: string[];
  baseline: unknown;
  rollback?: boolean;
}) {
  const tenant = z.uuid().parse(input.tenant),
    exercise = z.uuid().parse(input.exerciseId);
  const roots = z.array(z.uuid()).min(1).max(128).parse(input.roots);
  const real = z.array(z.uuid()).parse(input.realAuthIds);
  if (
    tenant === "80000000-0000-4000-8000-000000000001" ||
    !roots.includes(tenant) ||
    roots.includes("80000000-0000-4000-8000-000000000001") ||
    roots.some((id) => real.includes(id))
  )
    throw Error("PRODUCT_REHEARSAL_CLEANUP_SCOPE_REJECTED");
  const baseline = productBaselineSchema.parse(input.baseline);
  if (new Set(baseline.map((row) => row.relation)).size !== baseline.length)
    throw Error("PRODUCT_REHEARSAL_CLEANUP_BASELINE_REJECTED");
  let source = readFileSync("scripts/sql/sprint-13-onboarding-cleanup.sql", "utf8");
  if (
    !source.includes(oldGuard) ||
    source.split("{{baseline}}").length !== 2 ||
    source.split("{{roots}}").length !== 2 ||
    source.split("\ncommit;").length !== 2
  )
    throw Error("PRODUCT_REHEARSAL_CLEANUP_TEMPLATE_CHANGED");
  source = source
    .replace(
      oldGuard,
      ` if not exists(select 1 from public.tenants where id='80000000-0000-4000-8000-000000000001' and status='active')
 or exists(select 1 from public.tenants where id='${tenant}' and slug<>'synthetic-s15-${exercise}')
 or (select count(*) from auth.users where id=any(array[${real.map((id) => `'${id}'::uuid`).join(",")}]::uuid[]))<>${real.length}
 then raise exception 'PRODUCT_REHEARSAL_CLEANUP_SCOPE_CHANGED';end if;`,
    )
    .replace("{{baseline}}", JSON.stringify(baseline))
    .replace("{{roots}}", JSON.stringify([...new Set(roots)]));
  // Payment-release authority is a logical dependency, not an FK. Keep its
  // environment guard enabled and delete its exact intents/receipts first.
  const deletion = "   if not blocked then\n";
  if (source.split(deletion).length !== 2)
    throw Error("PRODUCT_REHEARSAL_CLEANUP_TEMPLATE_CHANGED");
  source = source.replace(
    deletion,
    `   if not blocked and r.rel='commerce_private.checkout_releases'::regclass then
    select exists(select 1 from commerce_private.checkout_releases release
      join exercise_rows marked on marked.rel=r.rel and marked.tid=release.ctid
      where exists(select 1 from commerce_private.checkout_intents i where i.tenant_id=release.tenant_id)
      or exists(select 1 from commerce_private.provider_receipts receipt where receipt.tenant_boundary=release.tenant_id)) into blocked;
   end if;
${deletion}`,
  );
  if (input.rollback) source = source.replace("\ncommit;", "\nrollback;");
  return source;
}
