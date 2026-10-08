import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { readSupabaseIntegrationEnvironment } from "./lib/supabase-integration-environment";
import { createMobileRedemptionHandler } from "../src/server/identity/mobile-invitation-redemption-http";
import { mobileDigest } from "../src/server/identity/mobile-invitation-claim";

// Fixed local target only; never adapt to hosted or load an ignored environment file.
if (
  Object.entries(process.env).some(
    ([name, value]) =>
      value &&
      /^(SUPABASE_|POSTGRES_|BREVO_|TELNYX_|STRIPE_|MOBILE_INVITATION|RECOVERY_|BACKUP_HEARTBEAT)/.test(
        name,
      ),
  )
) {
  throw new Error("MOBILE_REDEMPTION_LOCAL_ONLY");
}
const environment = readSupabaseIntegrationEnvironment();
if (environment.target !== "local" || new URL(environment.API_URL).hostname !== "127.0.0.1")
  throw new Error("MOBILE_REDEMPTION_LOCAL_ONLY");
const client = createClient(environment.API_URL, environment.SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
function sql(input: string) {
  try {
    return execFileSync(
      "docker",
      [
        "exec",
        "-i",
        "supabase_db_meneer-health-local",
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-X",
        "-qAt",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    ).trim();
  } catch {
    throw new Error("MOBILE_REDEMPTION_DATABASE_FAILED");
  }
}
const tables = [
  "identity_private.mobile_invitations",
  "identity_private.mobile_invitation_contacts",
  "identity_private.mobile_invitation_tokens",
  "identity_private.mobile_invitation_claims",
  "identity_private.mobile_invitation_events",
  "public.audit_events",
  "public.audit_chain_heads",
  "public.tenants",
  "public.subjects",
];
function snapshot() {
  return sql(
    `select jsonb_build_array(${tables.map((table) => `(select jsonb_build_array(count(*),md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),''))) from ${table} t)`).join(",")});`,
  );
}
const baseline = snapshot();
const auditTrigger = sql(
  "select tgname from pg_trigger where tgrelid='public.audit_events'::regclass and not tgisinternal and tgfoid='audit_private.reject_append_only_mutation()'::regprocedure;",
);
if (!/^[a-z_]+$/.test(auditTrigger)) throw new Error("MOBILE_REDEMPTION_CLEANUP_GUARD_INVALID");
if (
  JSON.parse(baseline)
    .slice(0, 5)
    .some((item: [number, string]) => item[0] !== 0) ||
  sql("select count(*) from pg_trigger where not tgisinternal and tgenabled='D';") !== "0"
)
  throw new Error("MOBILE_REDEMPTION_REQUIRES_EMPTY_LOCAL_JOURNAL");
const tenant = crypto.randomUUID(),
  subject = crypto.randomUUID(),
  invitation = crypto.randomUUID();
const token = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
  .replaceAll("+", "-")
  .replaceAll("/", "_")
  .replace(/=+$/, "");
const tokenDigest = await mobileDigest(token);
const key = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
const handler = createMobileRedemptionHandler(
  {
    REQUEST_RATE_LIMITER: { limit: async () => ({ success: true }) },
    MOBILE_INVITATIONS_REDEMPTION_MODE: "enabled",
    MOBILE_INVITATIONS_TENANT_ID: tenant,
    MOBILE_INVITATION_CLAIM_KEY_BASE64: key,
  },
  async (input) => {
    const { data, error } = await client.rpc("exchange_mobile_invitation", input);
    if (error) throw new Error("MOBILE_REDEMPTION_RPC_FAILED");
    return data;
  },
);
function request(action: string, fields: Record<string, string>, cookie = "") {
  return new Request(`https://meneerhealth.co.za/mobile-invitation/${action}`, {
    method: "POST",
    headers: {
      origin: "https://meneerhealth.co.za",
      "content-type": "application/x-www-form-urlencoded",
      cookie,
    },
    body: new URLSearchParams(fields),
  });
}
function invariant(value: unknown) {
  if (!value) throw new Error("MOBILE_REDEMPTION_ASSERTION_FAILED");
}
async function read(response: Response) {
  return z
    .object({
      status: z.string(),
      expiresAt: z.string().optional(),
      emailBound: z.boolean().optional(),
    })
    .strict()
    .parse(await response.json());
}
let prepared = false;
try {
  sql(`begin;
    insert into public.tenants(id,slug,display_name) values('${tenant}','mobile-race-${tenant}','Synthetic mobile race');
    insert into public.subjects(id) values('${subject}');
    insert into identity_private.mobile_invitations(id,tenant_id,created_by_subject_id,provenance_reference,contact_authority_reference,request_key)
     values('${invitation}','${tenant}','${subject}',gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
    insert into identity_private.mobile_invitation_contacts(invitation_id,tenant_id,given_name,family_name,phone)
     values('${invitation}','${tenant}','Synthetic','Race','+999000000001');
    update identity_private.mobile_invitations set status='issued',issued_at=statement_timestamp(),expires_at=statement_timestamp()+interval '48 hours' where id='${invitation}';
    insert into identity_private.mobile_invitation_tokens(invitation_id,tenant_id,invitation_version,digest,issued_at,expires_at)
     select id,tenant_id,version,'${tokenDigest}',issued_at,expires_at from identity_private.mobile_invitations where id='${invitation}';
    commit;`);
  prepared = true;
  const requests = Array.from({ length: 8 }, () => ({ token, requestKey: crypto.randomUUID() }));
  const responses = await Promise.all(requests.map((fields) => handler(request("redeem", fields))));
  invariant(responses.every((response) => response.status === 200));
  const results = await Promise.all(responses.map(read));
  const winners = results
    .map((result, index) => (result.status === "claimed" ? index : -1))
    .filter((index) => index >= 0);
  invariant(winners.length === 1);
  const winner = winners[0]!;
  const cookie = responses[winner]!.headers.get("Set-Cookie")!.split(";", 1)[0]!;
  const replay = await handler(request("redeem", requests[winner]!));
  invariant((await read(replay)).expiresAt === results[winner]!.expiresAt);
  const bound = await handler(request("bind", { email: "synthetic@example.invalid" }, cookie));
  invariant((await read(bound)).emailBound === true);
  const changed = await handler(request("bind", { email: "different@example.invalid" }, cookie));
  invariant((await read(changed)).status === "unavailable");
  invariant(
    sql(
      `select count(*) from identity_private.mobile_invitation_claims where invitation_id='${invitation}' and state='active';`,
    ) === "1",
  );
  invariant(
    sql(
      `select claimed_email from identity_private.mobile_invitation_contacts where invitation_id='${invitation}';`,
    ) === "synthetic@example.invalid",
  );
  const resumed = await handler(request("read", {}, cookie));
  invariant((await read(resumed)).emailBound === true);
  sql(
    `update identity_private.mobile_invitations set status='revoked',terminal_at=clock_timestamp() where id='${invitation}';`,
  );
  invariant((await read(await handler(request("read", {}, cookie)))).status === "unavailable");
} finally {
  if (prepared) {
    // Local-only manifested cleanup; every guard is restored before commit.
    const guards = [
      ["identity_private.mobile_invitation_events", "mobile_event_immutable"],
      ["identity_private.mobile_invitation_contacts", "mobile_contact_guard"],
      ["identity_private.mobile_invitation_claims", "mobile_claim_guard"],
      ["identity_private.mobile_invitation_tokens", "mobile_token_guard"],
      ["identity_private.mobile_invitations", "mobile_invitation_guard"],
      ["public.audit_events", "audit_events_append_only"],
    ];
    // Resolve the exact audit trigger name from its committed definition, not all triggers.
    guards[5]![1] = auditTrigger;
    sql(`begin;
      lock table ${tables.join(",")} in access exclusive mode;
      ${guards.map(([table, trigger]) => `alter table ${table} disable trigger ${trigger};`).join("\n")}
      delete from identity_private.mobile_invitation_events where invitation_id='${invitation}' and tenant_id='${tenant}';
      delete from identity_private.mobile_invitation_contacts where invitation_id='${invitation}' and tenant_id='${tenant}';
      delete from identity_private.mobile_invitation_claims where invitation_id='${invitation}' and tenant_id='${tenant}';
      delete from identity_private.mobile_invitation_tokens where invitation_id='${invitation}' and tenant_id='${tenant}';
      delete from identity_private.mobile_invitations where id='${invitation}' and tenant_id='${tenant}';
      delete from public.audit_events where tenant_id='${tenant}' and actor_id='${subject}';
      ${guards.map(([table, trigger]) => `alter table ${table} enable trigger ${trigger};`).join("\n")}
      delete from public.audit_chain_heads where tenant_id='${tenant}';
      delete from public.subjects where id='${subject}';
      delete from public.tenants where id='${tenant}';
      commit;`);
  }
}
invariant(snapshot() === baseline);
invariant(sql("select count(*) from pg_trigger where not tgisinternal and tgenabled='D';") === "0");
console.log(
  JSON.stringify({
    exercise: "local-mobile-redemption-race",
    concurrentClaims: 8,
    winningClaims: 1,
    replayDeadlineUnchanged: true,
    immutableEmail: true,
    revokeInvalidatesCookie: true,
    baselineRestored: true,
    providerContacted: false,
    hosted: false,
  }),
);
