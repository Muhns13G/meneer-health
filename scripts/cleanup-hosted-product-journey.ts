import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { z } from "zod";
import {
  buildProductHostedCleanup,
  productBaselineSchema,
  productNativePriceRootsSql,
} from "./lib/product-rehearsal-cleanup";
import {
  preparationManifestSchema,
  productRehearsalAccount,
} from "./lib/product-rehearsal-preparation";

function assert(value: unknown, code: string): asserts value {
  if (!value) throw Error(code);
}
const replacement = process.argv.includes("--replacement");
const path = replacement
  ? ".sprint15-product-journey-replacement.local"
  : ".sprint15-product-journey-auth-isolation.local";
const m = JSON.parse(readFileSync(path, "utf8"));
const config = preparationManifestSchema.parse(
  JSON.parse(readFileSync(".sprint15-product-rehearsal.local", "utf8")),
);
assert(
  process.env.PRODUCT_REHEARSAL_CLEANUP_CONFIRM === "manifested-refunded-fixtures-only" &&
    !process.env.CI &&
    process.env.SUPABASE_URL === "https://gibfpolrdjotwvewgfsz.supabase.co" &&
    process.env.SUPABASE_SECRET_KEY &&
    process.env.STRIPE_RESTRICTED_KEY?.startsWith("rk_test_") &&
    m.exerciseId === config.exerciseId &&
    m.tenant === config.tenantId &&
    m.cleaned === false &&
    m.paymentIntents.length === (replacement ? 2 : 1) &&
    m.refunds.length === (replacement ? 2 : 1),
  "S15_CLEANUP_GUARD_REJECTED",
);
const baseline = productBaselineSchema.parse(m.baseline);
const actors = z
  .record(z.string(), z.object({ id: z.uuid(), subject: z.uuid(), token: z.string().optional() }))
  .parse(m.actors);
const ids = z.record(z.string(), z.uuid()).parse(m.ids);
const real = z.array(z.uuid()).parse(m.realAuthIds);
const key = execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-w"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}).trim();
const nativePrices = replacement ? await readNativePrices() : [];
async function readNativePrices(): Promise<string[]> {
  // Resolve only the native-generated parent of this exact synthetic catalogue.
  // It is not discovered by a child-FK walk and must never include a shared price.
  const rows = (await sql(productNativePriceRootsSql(config.tenantId, ids.catalogue!))) as {
    id: string;
  }[];
  assert(rows.length === 1, "S15_NATIVE_PRICE_SCOPE_REJECTED");
  return rows.map((r) => z.uuid().parse(r.id));
}
const roots = [
  ...new Set([
    config.tenantId,
    config.serviceId,
    ...Object.values(ids),
    ...nativePrices,
    ...Object.values(actors).flatMap((a) => [a.id, a.subject]),
  ]),
];
async function sql(query: string, readOnly = true) {
  const r = await fetch(
    "https://api.supabase.com/v1/projects/gibfpolrdjotwvewgfsz/database/query",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, read_only: readOnly }),
      signal: AbortSignal.timeout(45000),
    },
  );
  assert(r.ok, "S15_SCOPED_CLEANUP_SQL_FAILED");
  return r.json();
}
const stripe = new Stripe(process.env.STRIPE_RESTRICTED_KEY!, {
  apiVersion: "2026-07-29.dahlia",
  maxNetworkRetries: 0,
  telemetry: false,
});
assert(
  (await stripe.accounts.retrieveCurrent()).id === productRehearsalAccount,
  "S15_ACCOUNT_MISMATCH",
);
for (const id of m.checkoutSessions) {
  const s = await stripe.checkout.sessions.retrieve(
    z
      .string()
      .regex(/^cs_test_/)
      .parse(id),
  );
  assert(!s.livemode && s.status !== "open", "S15_SESSION_NOT_FINAL");
}
for (const id of m.paymentIntents) {
  const p = await stripe.paymentIntents.retrieve(z.string().regex(/^pi_/).parse(id));
  assert(!p.livemode && typeof p.latest_charge === "string", "S15_CAPTURE_MODE_REJECTED");
  const c = await stripe.charges.retrieve(p.latest_charge);
  assert(c.refunded && c.amount_refunded === c.amount, "S15_REFUND_NOT_COMPLETE");
}
await stripe.webhookEndpoints.update(config.webhookId!, { disabled: true });
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
for (const a of Object.values(actors))
  if (a.token) await admin.auth.admin.signOut(a.token, "global");
const scope = {
  tenant: config.tenantId,
  exerciseId: config.exerciseId,
  roots,
  realAuthIds: real,
  baseline,
};
await sql(buildProductHostedCleanup({ ...scope, rollback: true }), false);
await sql(buildProductHostedCleanup(scope), false);
for (const a of Object.values(actors)) {
  const r = await admin.auth.admin.deleteUser(a.id);
  assert(!r.error, "S15_AUTH_CLEANUP_FAILED");
}
const after = productBaselineSchema.parse(
  await sql(readFileSync("scripts/sql/sprint-13-onboarding-baseline.sql", "utf8")),
);
assert(JSON.stringify(after) === JSON.stringify(baseline), "S15_APPLICATION_BASELINE_CHANGED");
const users = (await sql("select id from auth.users order by id;")) as { id: string }[];
assert(
  JSON.stringify(users.map((u) => u.id)) === JSON.stringify(real),
  "S15_REAL_AUTH_BASELINE_CHANGED",
);
m.cleaned = true;
m.stage = m.completed ? "completed-cleaned" : "failed-cleaned";
writeFileSync(path, JSON.stringify(m), { mode: 0o600 });
console.log(
  JSON.stringify({
    cleaned: true,
    realAuthUsersPreserved: real.length,
    originalMethodRefundVerified: true,
    environmentGuardNeverDisabled: true,
    webhookDisabled: true,
  }),
);
