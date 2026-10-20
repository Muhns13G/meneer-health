import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import Stripe from "stripe";
import { z } from "zod";
import {
  preparationManifestSchema,
  productRehearsalAccount,
  productRehearsalOrigin,
} from "./lib/product-rehearsal-preparation";
function assert(value: unknown, code: string): asserts value {
  if (!value) throw Error(code);
}
const c = preparationManifestSchema.parse(
  JSON.parse(readFileSync(".sprint15-product-rehearsal.local", "utf8")),
);
const attempts = ["auth-isolation", "replacement"].map((name) =>
  JSON.parse(readFileSync(`.sprint15-product-journey-${name}.local`, "utf8")),
);
assert(
  process.env.PRODUCT_REHEARSAL_FINALIZE_CONFIRM ===
    "three-refunded-captures-exact-webhook-removal" &&
    !process.env.CI &&
    process.env.STRIPE_RESTRICTED_KEY?.startsWith("rk_test_") &&
    attempts.every((m) => m.cleaned === true && m.exerciseId === c.exerciseId) &&
    attempts[1].completed === true,
  "S15_FINALIZE_SCOPE_REJECTED",
);
const stripe = new Stripe(process.env.STRIPE_RESTRICTED_KEY!, {
  apiVersion: "2026-07-29.dahlia",
  maxNetworkRetries: 0,
  telemetry: false,
});
assert(
  (await stripe.accounts.retrieveCurrent()).id === productRehearsalAccount,
  "S15_ACCOUNT_MISMATCH",
);
const captures = attempts.flatMap((m) => z.array(z.string().regex(/^pi_/)).parse(m.paymentIntents));
assert(
  captures.length === 3 && new Set(captures).size === 3,
  "S15_CUMULATIVE_CAPTURE_BUDGET_REJECTED",
);
let refundedMinor = 0;
for (const id of captures) {
  const p = await stripe.paymentIntents.retrieve(id);
  assert(
    !p.livemode && p.status === "succeeded" && typeof p.latest_charge === "string",
    "S15_CAPTURE_MODE_REJECTED",
  );
  const charge = await stripe.charges.retrieve(p.latest_charge);
  assert(
    charge.refunded && charge.amount === charge.amount_refunded,
    "S15_ORIGINAL_METHOD_REFUND_INCOMPLETE",
  );
  refundedMinor += charge.amount_refunded;
}
assert(refundedMinor === 409900, "S15_CUMULATIVE_REFUND_AMOUNT_CHANGED");
for (const id of attempts.flatMap((m) =>
  z.array(z.string().regex(/^cs_test_/)).parse(m.checkoutSessions),
)) {
  const s = await stripe.checkout.sessions.retrieve(id);
  assert(!s.livemode && s.status !== "open", "S15_UNFINISHED_CHECKOUT");
}
function cli(args: string[]) {
  return JSON.parse(
    execFileSync(
      "node_modules/.bin/wrangler",
      [...args, "--config", "dist-product-rehearsal/server/wrangler.json", "--json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 4 * 1024 * 1024 },
    ),
  );
}
const shutdown = "4c9b441d-272d-4de7-8b49-5c8a421837b3";
const main = cli(["deployments", "list", "--name", "meneer-health"]).at(-1);
const separate = cli(["deployments", "list", "--name", "meneer-product-rehearsal"]).at(-1);
assert(
  main.versions.length === 1 &&
    main.versions[0].version_id === c.mainVersion &&
    main.versions[0].percentage === 100,
  "S15_MAIN_DEPLOYMENT_CHANGED",
);
assert(
  separate.versions.length === 1 &&
    separate.versions[0].version_id === c.configurationVersion &&
    separate.versions[0].percentage === 100,
  "S15_SEPARATE_DEPLOYMENT_CHANGED",
);
const prepared = cli(["versions", "view", shutdown, "--name", "meneer-product-rehearsal"]);
const current = cli([
  "versions",
  "view",
  c.configurationVersion!,
  "--name",
  "meneer-product-rehearsal",
]);
assert(
  prepared.resources.script.etag === c.sourceEtag &&
    current.resources.script.etag === c.sourceEtag &&
    JSON.stringify(prepared.resources.script_runtime) ===
      JSON.stringify(current.resources.script_runtime),
  "S15_SHUTDOWN_SOURCE_CHANGED",
);
const bindingSnapshot = (v: typeof prepared) =>
  v.resources.bindings
    .filter((b: { name: string }) => b.name !== "PRODUCT_REHEARSAL_EXPIRES_AT")
    .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
assert(
  JSON.stringify(bindingSnapshot(prepared)) === JSON.stringify(bindingSnapshot(current)),
  "S15_SHUTDOWN_BINDINGS_CHANGED",
);
const hook = await stripe.webhookEndpoints.retrieve(c.webhookId!);
assert(
  !hook.livemode &&
    hook.url === productRehearsalOrigin + "/api/payments/stripe/webhook" &&
    hook.status === "disabled",
  "S15_WEBHOOK_DELETE_SCOPE_REJECTED",
);
const deleted = await stripe.webhookEndpoints.del(hook.id);
assert(deleted.deleted, "S15_WEBHOOK_REMOVAL_FAILED");
const inventory = await stripe.webhookEndpoints
  .list({ limit: 100 })
  .autoPagingToArray({ limit: 1000 });
assert(!inventory.some((h) => h.id === hook.id), "S15_WEBHOOK_STILL_PRESENT");
const proof = {
  contract: "sprint15.product-finalization",
  exerciseId: c.exerciseId,
  providerCaptures: 3,
  originalMethodRefunds: 3,
  refundedMinor,
  unfinishedSessions: 0,
  webhookDeleted: true,
  mainVersionPreserved: c.mainVersion,
  shutdownVersion: shutdown,
  shutdownPromoted: false,
  verifiedAt: new Date().toISOString(),
};
writeFileSync(".sprint15-product-finalization.local", JSON.stringify(proof), { mode: 0o600 });
console.log(JSON.stringify(proof));
