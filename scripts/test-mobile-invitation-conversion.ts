import { execFileSync } from "node:child_process";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { readSupabaseIntegrationEnvironment } from "./lib/supabase-integration-environment";
import { createMobileRedemptionHandler } from "../src/server/identity/mobile-invitation-redemption-http";
import {
  MobileInvitationEmailService,
  mobileEmailRepository,
} from "../src/server/identity/mobile-invitation-email-service";
import { createSupabaseManagedIdentityProvider } from "../src/adapters/identity/supabase/supabase-managed-identity-provider";
import { createPatientActivationHttpHandler } from "../src/server/identity/patient-activation-http";
import { mobileDigest } from "../src/server/identity/mobile-invitation-claim";

// Fixed local Auth only. generateLink supplies a local code without sending any email.
if (
  Object.entries(process.env).some(
    ([name, value]) =>
      value &&
      /^(SUPABASE_|POSTGRES_|BREVO_|TELNYX_|STRIPE_|MOBILE_INVITATION|IDENTITY_|RECOVERY_|BACKUP_HEARTBEAT)/.test(
        name,
      ),
  )
)
  throw new Error("MOBILE_CONVERSION_LOCAL_ONLY");
const config = readSupabaseIntegrationEnvironment();
if (config.target !== "local" || new URL(config.API_URL).hostname !== "127.0.0.1")
  throw new Error("MOBILE_CONVERSION_LOCAL_ONLY");
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
  } catch (error) {
    const diagnostic = error as { stderr?: Buffer };
    const sqlState = diagnostic.stderr?.toString().match(/ERROR:\s+([^\n]+)/)?.[1];
    throw new Error(`MOBILE_CONVERSION_LOCAL_SQL_FAILED: ${sqlState ?? "unavailable"}`);
  }
}
function invariant(value: unknown): asserts value {
  if (!value) throw new Error("MOBILE_CONVERSION_LOCAL_ASSERTION_FAILED");
}
const client = createClient(config.API_URL, config.SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const tables = [
  "identity_private.mobile_invitations",
  "identity_private.mobile_invitation_contacts",
  "identity_private.mobile_invitation_tokens",
  "identity_private.mobile_invitation_claims",
  "identity_private.mobile_invitation_events",
  "identity_private.mobile_email_exchanges",
  "identity_private.pilot_activation_commands",
  "public.identity_invitations",
  "public.subjects",
  "public.external_identities",
  "public.subject_contacts",
  "public.tenants",
  "public.tenant_memberships",
  "public.client_profiles",
  "public.client_profile_events",
  "public.pilot_instrument_publications",
  "public.pilot_instrument_receipts",
  "public.pilot_account_lifecycle_events",
  "public.audit_events",
  "public.audit_chain_heads",
  "audit_private.transactional_notifications",
  "audit_private.transactional_dispatch",
];
function snapshot() {
  return sql(
    `select jsonb_build_array(${tables.map((t) => `(select jsonb_build_array(count(*),md5(coalesce(string_agg(to_jsonb(r)::text,'|' order by to_jsonb(r)::text),''))) from ${t} r)`).join(",")});`,
  );
}
const baseline = snapshot();
invariant(sql("select count(*) from auth.users;") === "0");
invariant(
  sql("select (select count(*) from auth.sessions)+(select count(*) from auth.refresh_tokens);") ===
    "0",
);
invariant(sql("select count(*) from identity_private.mobile_invitations;") === "0");
invariant(sql("select count(*) from pg_trigger where not tgisinternal and tgenabled='D';") === "0");
const auditTrigger = sql(
  "select tgname from pg_trigger where tgrelid='public.audit_events'::regclass and not tgisinternal and tgfoid='audit_private.reject_append_only_mutation()'::regprocedure;",
);
invariant(/^[a-z_]+$/.test(auditTrigger));
const guards = [
  ["identity_private.mobile_invitations", "mobile_invitation_guard"],
  ["identity_private.mobile_invitation_contacts", "mobile_contact_guard"],
  ["identity_private.mobile_invitation_tokens", "mobile_token_guard"],
  ["identity_private.mobile_invitation_claims", "mobile_claim_guard"],
  ["identity_private.mobile_invitation_events", "mobile_event_immutable"],
  ["identity_private.pilot_activation_commands", "pilot_activation_commands_append_only"],
  ["public.client_profile_events", "client_profile_events_append_only"],
  ["public.pilot_instrument_receipts", "pilot_instrument_receipts_append_only"],
  ["public.pilot_account_lifecycle_events", "pilot_account_lifecycle_events_append_only"],
  ["public.pilot_instrument_publications", "pilot_instrument_publications_immutable"],
  ["public.audit_events", auditTrigger],
  ["audit_private.transactional_notifications", "transactional_notifications_immutable"],
];
const tenant = crypto.randomUUID(),
  actor = crypto.randomUUID(),
  mobile = crypto.randomUUID(),
  terms = crypto.randomUUID(),
  privacy = crypto.randomUUID();
const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
const key = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64");
const preactivationKey = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64");
const digest = await mobileDigest(token);
let authUser: string | undefined,
  participant: string | undefined,
  code = "",
  providerCalls = 0;
const provider = createSupabaseManagedIdentityProvider({
  url: config.API_URL,
  secretKey: config.SECRET_KEY,
});
const emailService = new MobileInvitationEmailService(mobileEmailRepository(client), {
  invitePatient: async (email) => {
    providerCalls++;
    const { data, error } = await client.auth.admin.generateLink({ type: "invite", email });
    invariant(!error && data.user && /^\d{6}$/.test(data.properties?.email_otp ?? ""));
    authUser = data.user.id;
    code = data.properties.email_otp;
    participant = sql(
      `select subject_id from public.external_identities where provider_subject='${authUser}';`,
    );
    invariant(/^[a-f0-9-]{36}$/.test(participant));
    return authUser;
  },
  verifyInvitationOtp: (email, otp) => provider.verifyInvitationOtp(email, otp),
  verifyAccessToken: (access) => provider.verifyAccessToken(access),
  revokeSessions: (access, scope) => provider.revokeSessions(access, scope),
});
const bindings = {
  REQUEST_RATE_LIMITER: { limit: async () => ({ success: true }) },
  SUPABASE_URL: config.API_URL,
  SUPABASE_SECRET_KEY: config.SECRET_KEY,
  MOBILE_INVITATIONS_REDEMPTION_MODE: "enabled",
  MOBILE_INVITATIONS_EMAIL_MODE: "enabled",
  MOBILE_INVITATIONS_TENANT_ID: tenant,
  MOBILE_INVITATION_CLAIM_KEY_BASE64: key,
  IDENTITY_PREACTIVATION_KEY_BASE64: preactivationKey,
};
const handler = createMobileRedemptionHandler(
  bindings,
  async (args) => {
    const { data, error } = await client.rpc("exchange_mobile_invitation", args);
    invariant(!error);
    return data;
  },
  emailService,
);
const activate = createPatientActivationHttpHandler(bindings);
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
try {
  sql(`begin;
    insert into public.tenants(id,slug,display_name,status) values('${tenant}','synthetic-mobile-${tenant}','Synthetic mobile conversion','active');
    insert into public.subjects(id) values('${actor}');
    insert into identity_private.mobile_invitations(id,tenant_id,created_by_subject_id,provenance_reference,contact_authority_reference,request_key)
      values('${mobile}','${tenant}','${actor}',gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
    insert into identity_private.mobile_invitation_contacts(invitation_id,tenant_id,given_name,family_name,phone)
      values('${mobile}','${tenant}','Synthetic','Mobile','+99914700001');
    update identity_private.mobile_invitations set status='issued',issued_at=statement_timestamp(),expires_at=statement_timestamp()+interval '48 hours' where id='${mobile}';
    insert into identity_private.mobile_invitation_tokens(invitation_id,tenant_id,invitation_version,digest,issued_at,expires_at)
      select id,tenant_id,version,'${digest}',issued_at,expires_at from identity_private.mobile_invitations where id='${mobile}';
    insert into public.pilot_instrument_publications(id,instrument_id,instrument_version,document_body,content_sha256,rendered_locator,approval_reference,approved_by_subject_id,approved_at,effective_at)
      values('${terms}','pilot-account-terms','1.0','Synthetic local mobile terms',repeat('0',64),'/account/activate','synthetic-local-only','${actor}',now()-interval '1 day',now()-interval '1 hour'),
      ('${privacy}','pilot-privacy-notice','1.0','Synthetic local mobile privacy',repeat('0',64),'/account/activate','synthetic-local-only','${actor}',now()-interval '1 day',now()-interval '1 hour');
    commit;`);
  const redeemed = await handler(request("redeem", { token, requestKey: crypto.randomUUID() }));
  invariant(redeemed.status === 200);
  const claimCookie = redeemed.headers.get("set-cookie")?.split(";")[0];
  invariant(claimCookie);
  invariant(
    z
      .object({ emailBound: z.boolean() })
      .parse(
        await (
          await handler(request("bind", { email: "synthetic-mobile@example.invalid" }, claimCookie))
        ).json(),
      ).emailBound === true,
  );
  const requests = await Promise.all(
    Array.from({ length: 8 }, () => handler(request("email", {}, claimCookie))),
  );
  invariant(requests.every((r) => r.status === 200));
  invariant(providerCalls === 1);
  invariant(
    z
      .object({ status: z.string() })
      .parse(await (await handler(request("email", {}, claimCookie))).json()).status ===
      "code-requested",
  );
  invariant(providerCalls === 1 && code);
  const verified = await handler(request("verify", { code }, claimCookie));
  code = "";
  invariant(
    verified.status === 200 &&
      z.object({ status: z.string() }).parse(await verified.json()).status === "verified",
  );
  const activationCookie = verified.headers.get("set-cookie")?.split(";")[0];
  invariant(activationCookie);
  invariant(!activationCookie.includes("meneer-session"));
  invariant(
    sql(`select status from identity_private.mobile_invitations where id='${mobile}';`) ===
      "claimed",
  );
  invariant(
    sql(`select count(*) from public.client_profiles where tenant_id='${tenant}';`) === "0",
  );
  const prepared = await activate(
    new Request("https://meneerhealth.co.za/account/activate/instruments", {
      headers: { cookie: activationCookie },
    }),
  );
  invariant(prepared.status === 200);
  const view = z
    .object({
      documents: z.array(
        z.object({ instrumentId: z.string(), publicationId: z.string(), contentHash: z.string() }),
      ),
    })
    .parse(await prepared.json());
  const requestKey = crypto.randomUUID();
  const t = view.documents.find(
    (d: { instrumentId: string }) => d.instrumentId === "pilot-account-terms",
  );
  const p = view.documents.find(
    (d: { instrumentId: string }) => d.instrumentId === "pilot-privacy-notice",
  );
  invariant(t && p);
  const command = {
    givenName: "Synthetic",
    familyName: "Mobile",
    mobileE164: "+99914700001",
    contactPreference: "email",
    termsPublicationId: t.publicationId,
    termsHash: t.contentHash,
    privacyPublicationId: p.publicationId,
    privacyHash: p.contentHash,
    termsAccepted: true,
    privacyAcknowledged: true,
    requestKey,
  };
  const commitRequest = () =>
    new Request("https://meneerhealth.co.za/account/activate", {
      method: "POST",
      headers: {
        origin: "https://meneerhealth.co.za",
        cookie: activationCookie,
        "content-type": "application/json",
        "idempotency-key": requestKey,
      },
      body: JSON.stringify(command),
    });
  invariant((await activate(commitRequest())).status === 204);
  invariant((await activate(commitRequest())).status === 204);
  invariant(
    sql(`select status from identity_private.mobile_invitations where id='${mobile}';`) ===
      "converted",
  );
  invariant(
    sql(`select count(*) from public.client_profiles where tenant_id='${tenant}';`) === "1",
  );
  invariant(
    sql(`select count(*) from public.pilot_instrument_receipts where tenant_id='${tenant}';`) ===
      "2",
  );
  invariant(
    z
      .object({ status: z.string() })
      .parse(await (await handler(request("read", {}, claimCookie))).json()).status ===
      "unavailable",
  );
} finally {
  code = "";
  if (authUser) {
    // Revoke before deletion; do not assume deleting a user invalidates issued access JWTs.
    sql(`update auth.sessions set not_after=clock_timestamp() where user_id='${authUser}';`);
    const { error } = await client.auth.admin.deleteUser(authUser);
    invariant(!error);
  }
  sql(`begin;
    lock table ${tables.join(",")} in access exclusive mode;
    ${guards.map(([table, guard]) => `alter table ${table} disable trigger ${guard};`).join("\n")}
    delete from identity_private.pilot_activation_commands where invitation_id in(select id from public.identity_invitations where tenant_id='${tenant}');
    delete from public.client_profile_events where tenant_id='${tenant}';
    delete from public.pilot_instrument_receipts where tenant_id='${tenant}';
    delete from public.pilot_account_lifecycle_events where tenant_id='${tenant}';
    delete from public.client_profiles where tenant_id='${tenant}';
    delete from public.tenant_memberships where tenant_id='${tenant}';
    delete from identity_private.mobile_email_exchanges where mobile_invitation_id='${mobile}';
    delete from identity_private.mobile_invitation_events where invitation_id='${mobile}';
    delete from identity_private.mobile_invitation_claims where invitation_id='${mobile}';
    delete from identity_private.mobile_invitation_tokens where invitation_id='${mobile}';
    delete from identity_private.mobile_invitation_contacts where invitation_id='${mobile}';
    delete from identity_private.mobile_invitations where id='${mobile}';
    delete from public.identity_invitations where tenant_id='${tenant}';
    delete from audit_private.transactional_dispatch where notification_id in(select id from audit_private.transactional_notifications where tenant_id='${tenant}');
    delete from audit_private.transactional_notifications where tenant_id='${tenant}';
    delete from public.pilot_instrument_publications where id in('${terms}','${privacy}');
    delete from public.audit_events where tenant_id='${tenant}';
    ${guards.map(([table, guard]) => `alter table ${table} enable trigger ${guard};`).join("\n")}
    delete from public.audit_chain_heads where tenant_id='${tenant}';
    ${participant ? `delete from public.subject_contacts where subject_id='${participant}'; delete from public.external_identities where subject_id='${participant}'; delete from public.subjects where id='${participant}';` : ""}
    delete from public.subjects where id='${actor}';
    delete from public.tenants where id='${tenant}';
    commit;`);
  invariant(snapshot() === baseline);
  invariant(sql("select count(*) from auth.users;") === "0");
  invariant(
    sql(
      "select (select count(*) from auth.sessions)+(select count(*) from auth.refresh_tokens);",
    ) === "0",
  );
  invariant(
    sql("select count(*) from pg_trigger where not tgisinternal and tgenabled='D';") === "0",
  );
}
console.log(
  JSON.stringify({
    exercise: "local-mobile-conversion",
    competingSendRequests: 8,
    providerInvitations: 1,
    actualLocalAuthOtp: true,
    separatePreactivation: true,
    atomicProfileAndTwoReceipts: true,
    convertedSingleUse: true,
    activationReplaySafe: true,
    baselineRestored: true,
    emailsSent: 0,
    hostedProvidersContacted: false,
  }),
);
