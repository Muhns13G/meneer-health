import { execFileSync, spawnSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Explicitly approved operator rehearsal only; never CI, local fixture replay or cohort sending.
const origin = "https://meneerhealth.co.za";
const project = "gibfpolrdjotwvewgfsz";
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function requireProof(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(reason);
}
const phone = process.env.SPRINT14_CONTROLLED_PHONE;
const baselineVersion = process.env.SPRINT14_BASELINE_VERSION;
requireProof(
  !process.env.CI &&
    process.env.SPRINT14_HOSTED_CONFIRM === "one-sms-one-dollar-isolated-cleanup" &&
    /^\+27[0-9]{9}$/.test(phone ?? "") &&
    uuid.test(baselineVersion ?? "") &&
    process.env.SUPABASE_URL === `https://${project}.supabase.co` &&
    process.env.SUPABASE_SECRET_KEY &&
    process.env.TELNYX_API_KEY &&
    process.env.TELNYX_MESSAGING_PROFILE_ID &&
    process.env.TELNYX_FROM_NUMBER &&
    Buffer.from(process.env.MOBILE_INVITATION_CLAIM_KEY_BASE64 ?? "", "base64").length === 32,
  "SPRINT14_OPERATOR_GUARD_REJECTED",
);
const resumePath = process.env.SPRINT14_RESUME_MANIFEST;
requireProof(
  !resumePath ||
    (resumePath.startsWith(tmpdir() + "/meneer-sprint14-private-") &&
      resumePath.endsWith("/manifest.json")),
  "RESUME_PATH_INVALID",
);
const saved = resumePath
  ? z
      .object({
        task: z.literal("2.14.9"),
        baselineVersion: z.uuid(),
        baseEtag: z.string(),
        roots: z.array(z.uuid()).min(6),
        operatorAuth: z.uuid(),
        participantAuth: z.uuid().optional(),
        mobile: z.uuid().optional(),
        reservation: z.uuid().optional(),
        configurationVersion: z.uuid(),
        baseline: z.array(z.record(z.string(), z.unknown())).min(1),
        triggers: z.array(z.record(z.string(), z.unknown())).min(1),
        dispatched: z.boolean(),
        converted: z.boolean(),
        restored: z.literal(false),
      })
      .parse(JSON.parse(readFileSync(resumePath, "utf8")))
  : undefined;
requireProof(!saved || saved.baselineVersion === baselineVersion, "RESUME_BASELINE_CHANGED");
const tenant = saved?.roots[0] ?? randomUUID();
const approver = saved?.roots[1] ?? randomUUID();
const terms = saved?.roots[2] ?? randomUUID();
const privacy = saved?.roots[3] ?? randomUUID();
const directory = saved ? undefined : mkdtempSync(join(tmpdir(), "meneer-sprint14-private-"));
const manifestPath = resumePath ?? join(directory!, "manifest.json");
const management = execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-w"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}).trim();
requireProof(management.startsWith("sbp_"), "MANAGEMENT_AUTH_UNAVAILABLE");
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
async function sql(query: string, readOnly = true): Promise<Record<string, unknown>[]> {
  const r = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${management}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, read_only: readOnly }),
    signal: AbortSignal.timeout(30_000),
  });
  requireProof(r.ok, `HOSTED_SQL_STATUS_${r.status}`);
  return r.json();
}
function wrangler(args: string[], input?: string): string {
  const r = spawnSync("bunx", ["wrangler", ...args], {
    input,
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env },
  });
  requireProof(r.status === 0, "CONFIGURATION_COMMAND_FAILED");
  return r.stdout;
}
async function activeVersion(): Promise<string> {
  const entries = JSON.parse(wrangler(["deployments", "list", "--json"])) as {
    versions: { version_id: string; percentage: number }[];
  }[];
  const v = entries.at(-1)?.versions;
  requireProof(v?.length === 1 && v[0]?.percentage === 100, "SPLIT_DEPLOYMENT_REJECTED");
  return v[0].version_id;
}
function etag(version: string): string {
  requireProof(uuid.test(version), "VERSION_INVALID");
  const data = JSON.parse(wrangler(["versions", "view", version, "--json"]));
  requireProof(typeof data.resources?.script?.etag === "string", "VERSION_ETAG_MISSING");
  return data.resources.script.etag;
}
const baseEtag = etag(baselineVersion!);
const baselineSql = readFileSync("scripts/sql/sprint-13-onboarding-baseline.sql", "utf8");
const baseline = saved?.baseline ?? (await sql(baselineSql));
requireProof(!saved || saved.baseEtag === baseEtag, "RESUME_SOURCE_CHANGED");
requireProof(baseline.length > 0, "BASELINE_MISSING");
requireProof(
  baseline.every(
    (r) =>
      Number(r.n) ===
      (r.relation === "public.tenants"
        ? 1
        : r.relation === "public.fulfilment_provider_gates"
          ? 12
          : 0),
  ),
  "NONEMPTY_APPLICATION_BASELINE",
);
const initial = await sql("select count(*) as n from auth.users");
requireProof(
  Number(initial[0]?.n) === (saved ? (saved.participantAuth ? 2 : 1) : 0),
  "NONEMPTY_AUTH_BASELINE",
);
const triggers =
  saved?.triggers ??
  (await sql(
    "select n.nspname||'.'||c.relname relation,t.tgname,t.tgenabled from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in ('public','identity_private','audit_private') order by 1,2",
  ));
requireProof(
  triggers.every((t) => t.tgenabled === "O"),
  "DISABLED_BASELINE_GUARD",
);
let operatorAuth: string | undefined = saved?.operatorAuth;
let operatorSubject: string | undefined;
let participantAuth: string | undefined = saved?.participantAuth;
let participantSubject: string | undefined;
let mobile: string | undefined = saved?.mobile;
let reservation: string | undefined = saved?.reservation;
let staffCookie = "";
let claimCookie = "";
let activationCookie = "";
let token = "";
let configurationVersion: string | undefined = saved?.configurationVersion;
let configurationAttempted = !!saved;
let dispatched = saved?.dispatched ?? false;
let converted = saved?.converted ?? false;
let restored = false;
const roots = new Set<string>(saved?.roots ?? [tenant, approver, terms, privacy]);
const proof: Record<string, unknown> = {};
function manifest(stage: string) {
  writeFileSync(
    manifestPath,
    JSON.stringify({
      task: "2.14.9",
      stage,
      baselineVersion,
      baseEtag,
      configurationVersion,
      roots: [...roots],
      operatorAuth,
      participantAuth,
      mobile,
      reservation,
      baseline,
      triggers,
      dispatched,
      converted,
      restored,
      proof,
    }),
    { mode: 0o600 },
  );
}
function cleanupSql() {
  requireProof(
    [...roots].every((id) => uuid.test(id)),
    "CLEANUP_ROOT_INVALID",
  );
  let result = readFileSync("scripts/sql/sprint-13-onboarding-cleanup.sql", "utf8")
    .replaceAll("{{roots}}", JSON.stringify([...roots]))
    .replaceAll("{{baseline}}", JSON.stringify(baseline));
  const mobileGuards = `or (t.tgrelid='identity_private.mobile_invitations'::regclass and t.tgname='mobile_invitation_guard')
    or (t.tgrelid='identity_private.mobile_invitation_contacts'::regclass and t.tgname='mobile_contact_guard')
    or (t.tgrelid='identity_private.mobile_invitation_tokens'::regclass and t.tgname='mobile_token_guard')
    or (t.tgrelid='identity_private.mobile_invitation_claims'::regclass and t.tgname='mobile_claim_guard')`;
  result = result.replace(
    "or (t.tgrelid='commerce_private.refund_jobs'::regclass and t.tgname='refund_jobs_guard'))",
    "or (t.tgrelid='commerce_private.refund_jobs'::regclass and t.tgname='refund_jobs_guard') " +
      mobileGuards +
      ")",
  );
  requireProof(result.includes(mobileGuards) && !result.includes("{{"), "CLEANUP_TEMPLATE_INVALID");
  return result;
}
async function request(path: string, fields?: Record<string, string>, cookie = "") {
  const r = await fetch(origin + path, {
    method: fields ? "POST" : "GET",
    redirect: "manual",
    headers: {
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
      ...(fields ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: fields ? new URLSearchParams(fields) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  requireProof(r.headers.get("cache-control")?.includes("no-store"), "NO_STORE_MISSING");
  return r;
}
function cookie(r: Response, name: string): string {
  const h = r.headers.get("set-cookie") ?? "";
  requireProof(
    h.includes("HttpOnly") && h.includes("Secure") && h.includes("SameSite=Strict"),
    "COOKIE_SECURITY_MISSING",
  );
  const value = h.match(new RegExp(`${name}=([^;]+)`))?.[1];
  requireProof(value, "COOKIE_MISSING");
  return `${name}=${value}`;
}
function totp(secret: string) {
  let bits = "";
  for (const c of secret.replaceAll("=", "").toUpperCase()) {
    const n = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c);
    requireProof(n >= 0, "FACTOR_INVALID");
    bits += n.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8)
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  return ((digest.readUInt32BE(digest[digest.length - 1]! & 15) & 0x7fffffff) % 1_000_000)
    .toString()
    .padStart(6, "0");
}
async function setup() {
  requireProof(!operatorAuth, "SETUP_ALREADY_ATTEMPTED");
  requireProof((await activeVersion()) === baselineVersion, "DEPLOYMENT_CHANGED");
  const created = await admin.auth.admin.createUser({
    email: `synthetic-mobile-${tenant}@example.invalid`,
    email_confirm: true,
  });
  requireProof(!created.error && created.data.user, "OPERATOR_CREATION_FAILED");
  operatorAuth = created.data.user.id;
  roots.add(operatorAuth);
  manifest("operator-created");
  const subject = await sql(
    `select subject_id from public.external_identities where provider='supabase' and provider_subject='${operatorAuth}'`,
  );
  operatorSubject = String(subject[0]?.subject_id);
  requireProof(uuid.test(operatorSubject), "OPERATOR_SUBJECT_MISSING");
  roots.add(operatorSubject);
  const setupSql = `begin;
    insert into public.tenants(id,slug,display_name,status) values('${tenant}','synthetic-mobile-${tenant}','SYNTHETIC MOBILE REHEARSAL','active');
    insert into public.subjects(id) values('${approver}');
    insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
      values('${tenant}','${operatorSubject}','operations','active',now()-interval '1 minute',now()+interval '2 hours','${approver}');
    insert into public.access_assignments(tenant_id,subject_id,resource_type,resource_id,purpose,status,valid_from,expires_at)
      values('${tenant}','${operatorSubject}','identity_contact','${tenant}','operations','active',now()-interval '1 minute',now()+interval '2 hours');
    insert into identity_private.mobile_invitation_policies(tenant_id,daily_reservation_limit,sending_enabled,delivery_ready,provider_profile_id,from_phone,per_segment_usd_micros,per_message_usd_micros,daily_usd_micros)
      values('${tenant}',1,true,true,'${process.env.TELNYX_MESSAGING_PROFILE_ID}','${process.env.TELNYX_FROM_NUMBER}',500000,1000000,1000000);
    insert into public.pilot_instrument_publications(id,instrument_id,instrument_version,document_body,content_sha256,rendered_locator,approval_reference,approved_by_subject_id,approved_at,effective_at,expires_at)
      values('${terms}','pilot-account-terms','1.0','SYNTHETIC TEST ONLY account terms',repeat('0',64),'/account/activate','sprint14-synthetic-only','${approver}',now()-interval '1 hour',now()-interval '1 minute',now()+interval '2 hours'),
      ('${privacy}','pilot-privacy-notice','1.0','SYNTHETIC TEST ONLY privacy notice',repeat('0',64),'/account/activate','sprint14-synthetic-only','${approver}',now()-interval '1 hour',now()-interval '1 minute',now()+interval '2 hours');
    commit;`;
  await sql(
    setupSql.replace(/commit;\s*$/, "") +
      cleanupSql()
        .replace(/^([\s\S]*?)begin;/, "")
        .replace(/commit;/, "rollback;"),
    false,
  );
  manifest("setup-cleanup-rollback-passed");
  await sql(setupSql, false);
  manifest("fixtures-created");
  const values = {
    MOBILE_INVITATIONS_MODE: "telnyx",
    MOBILE_INVITATIONS_REDEMPTION_MODE: "enabled",
    MOBILE_INVITATIONS_EMAIL_MODE: "enabled",
    MOBILE_INVITATIONS_WEBHOOK_MODE: "telnyx",
    MOBILE_INVITATIONS_DELIVERY_READY: "true",
    MOBILE_INVITATIONS_TENANT_ID: tenant,
    MOBILE_INVITATION_CLAIM_KEY_BASE64: process.env.MOBILE_INVITATION_CLAIM_KEY_BASE64!,
    TELNYX_API_KEY: process.env.TELNYX_API_KEY!,
    TELNYX_PUBLIC_KEY_BASE64: process.env.TELNYX_PUBLIC_KEY_BASE64!,
    TELNYX_MESSAGING_PROFILE_ID: process.env.TELNYX_MESSAGING_PROFILE_ID!,
    TELNYX_FROM_NUMBER: process.env.TELNYX_FROM_NUMBER!,
  };
  configurationAttempted = true;
  manifest("configuration-preparing");
  const output = wrangler(
    ["versions", "secret", "bulk", "--message", "Isolated Sprint 14 mobile rehearsal"],
    JSON.stringify(values),
  );
  configurationVersion = output.match(/Created version ([a-f0-9-]{36})/)?.[1];
  requireProof(configurationVersion, "CONFIGURATION_VERSION_MISSING");
  requireProof(etag(configurationVersion) === baseEtag, "CONFIGURATION_CHANGED_CODE");
  requireProof((await activeVersion()) === baselineVersion, "CONCURRENT_DEPLOYMENT_CHANGED");
  manifest("configuration-prepared");
  console.log(JSON.stringify({ stage: "awaiting-owner-promotion", configurationVersion }));
}
async function authenticateStaff() {
  requireProof(operatorAuth && configurationVersion, "CONFIGURATION_NOT_PREPARED");
  requireProof((await activeVersion()) === configurationVersion, "CONFIGURATION_NOT_ACTIVE");
  const operator = await admin.auth.admin.getUserById(operatorAuth);
  requireProof(!operator.error && operator.data.user?.email, "OPERATOR_NOT_FOUND");
  requireProof(
    operator.data.user.email === `synthetic-mobile-${tenant}@example.invalid`,
    "OPERATOR_SCOPE_CHANGED",
  );
  // Only a previously interrupted, unverified factor on this exact disposable identity is removed.
  const factors = await admin.auth.admin.mfa.listFactors({ userId: operatorAuth });
  requireProof(!factors.error && factors.data, "FACTOR_INVENTORY_FAILED");
  for (const factor of factors.data.factors) {
    requireProof(factor.status === "unverified", "VERIFIED_FACTOR_RESET_REJECTED");
    const removed = await admin.auth.admin.mfa.deleteFactor({
      userId: operatorAuth,
      id: factor.id,
    });
    requireProof(!removed.error, "UNVERIFIED_FACTOR_CLEANUP_FAILED");
  }
  const generated = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: operator.data.user.email,
  });
  requireProof(!generated.error && generated.data.user.id === operatorAuth, "OPERATOR_CODE_FAILED");
  const signed = await request("/staff/sign-in", {
    action: "verify",
    email: operator.data.user.email,
    code: generated.data.properties.email_otp,
  });
  requireProof(signed.status === 200, `STAFF_SIGNIN_${signed.status}`);
  staffCookie = cookie(signed, "__Host-meneer-workforce");
  const enrollment = z
    .object({ enrollment: z.object({ secret: z.string() }) })
    .parse(await signed.json()).enrollment.secret;
  requireProof(typeof enrollment === "string", "TOTP_ENROLLMENT_MISSING");
  const emailOnly = await request("/staff/mobile-invitations/read", { afterId: "" }, staffCookie);
  requireProof(emailOnly.status === 401, `EMAIL_ONLY_DENIAL_${emailOnly.status}`);
  proof.emailOnlyDenied = true;
  const mfa = await request("/staff/mfa", { code: totp(enrollment) }, staffCookie);
  requireProof(mfa.status === 204, `TOTP_STATUS_${mfa.status}`);
  staffCookie = cookie(mfa, "__Host-meneer-workforce");
  proof.genuineAal2 = true;
  manifest("staff-ready");
}
async function send() {
  requireProof(!dispatched && staffCookie, "SEND_ALREADY_ATTEMPTED_OR_NOT_READY");
  const r = await request(
    "/staff/mobile-invitations/command",
    {
      action: "create",
      requestKey: randomUUID(),
      givenName: "Synthetic",
      familyName: "Mobile",
      phone: phone!,
      provenanceReference: randomUUID(),
      contactAuthorityReference: randomUUID(),
    },
    staffCookie,
  );
  requireProof(r.status === 200, `CREATE_STATUS_${r.status}`);
  mobile = z.object({ invitationId: z.uuid() }).parse(await r.json()).invitationId;
  requireProof(mobile && uuid.test(mobile), "INVITATION_ID_INVALID");
  roots.add(mobile);
  manifest("invitation-created");
  for (const action of ["review", "send"]) {
    const requestKey = randomUUID();
    const response = await request(
      "/staff/mobile-invitations/command",
      {
        action,
        requestKey,
        invitationId: mobile,
        expectedVersion: "1",
      },
      staffCookie,
    );
    requireProof(response.status === 200, `RESERVATION_STATUS_${response.status}`);
    if (action === "send") reservation = requestKey;
  }
  dispatched = true; // One-shot marker is persisted BEFORE the request; never resend on uncertainty.
  manifest("dispatch-attempted");
  const dispatch = await request(
    "/staff/mobile-invitations/dispatch",
    {
      invitationId: mobile,
      expectedVersion: "1",
      reservationRequestKey: reservation!,
    },
    staffCookie,
  );
  proof.dispatchHttpStatus = dispatch.status;
  proof.dispatch = z
    .object({
      outcome: z.enum(["accepted", "failed", "uncertain", "already_attempted", "disabled"]),
    })
    .parse(await dispatch.json());
  manifest("dispatch-returned");
  console.log(JSON.stringify({ stage: "sms-requested", ...proof }));
}
async function redeem() {
  requireProof(dispatched && mobile && !claimCookie, "REDEMPTION_NOT_READY");
  const intents = await sql(
    `select provider_message_id from identity_private.mobile_invitation_delivery_intents where invitation_id='${mobile}'`,
  );
  const messageId = String(intents[0]?.provider_message_id);
  requireProof(uuid.test(messageId), "PROVIDER_MESSAGE_NOT_BOUND");
  const r = await fetch(`https://api.telnyx.com/v2/messages/${messageId}`, {
    headers: { Authorization: `Bearer ${process.env.TELNYX_API_KEY}` },
    signal: AbortSignal.timeout(15_000),
  });
  requireProof(r.ok, "PROVIDER_MESSAGE_READ_FAILED");
  const data = z
    .object({
      data: z.object({
        text: z.string(),
        to: z.array(z.object({ status: z.string() })),
        cost: z
          .object({ amount: z.union([z.string(), z.number()]), currency: z.literal("USD") })
          .nullish(),
      }),
    })
    .parse(await r.json()).data;
  token = data.text?.match(/\/mobile-invitation#([A-Za-z0-9_-]{43})\./)?.[1] ?? "";
  requireProof(token.length === 43, "PROVIDER_BEARER_UNAVAILABLE");
  proof.providerDisposition = data.to?.[0]?.status;
  proof.providerCost = data.cost;
  const get = await request("/mobile-invitation");
  requireProof(
    get.status === 200 && get.headers.get("referrer-policy") === "no-referrer",
    "REDEMPTION_PAGE_INVALID",
  );
  const exchange = await request("/mobile-invitation/redeem", { token, requestKey: randomUUID() });
  requireProof(exchange.status === 200, `REDEEM_STATUS_${exchange.status}`);
  claimCookie = cookie(exchange, "__Host-meneer-mobile-claim");
  token = "";
  const bind = await request(
    "/mobile-invitation/bind",
    { email: "support@meneerhealth.co.za" },
    claimCookie,
  );
  requireProof(
    bind.status === 200 &&
      z.object({ emailBound: z.boolean() }).parse(await bind.json()).emailBound === true,
    "EMAIL_BIND_FAILED",
  );
  const email = await request("/mobile-invitation/email", {}, claimCookie);
  requireProof(
    email.status === 200 &&
      z.object({ status: z.string() }).parse(await email.json()).status === "code-requested",
    "EMAIL_SEND_FAILED",
  );
  const users = await admin.auth.admin.listUsers({ page: 1, perPage: 10 });
  requireProof(!users.error, "AUTH_INVENTORY_FAILED");
  const user = users.data.users.find((u) => u.email === "support@meneerhealth.co.za");
  requireProof(user, "PARTICIPANT_IDENTITY_MISSING");
  participantAuth = user.id;
  roots.add(participantAuth);
  const subject = await sql(
    `select subject_id from public.external_identities where provider_subject='${participantAuth}'`,
  );
  participantSubject = String(subject[0]?.subject_id);
  requireProof(uuid.test(participantSubject), "PARTICIPANT_SUBJECT_MISSING");
  roots.add(participantSubject);
  manifest("awaiting-mailbox-code");
  console.log(
    JSON.stringify({ stage: "awaiting-mailbox-code", handsetReceiptNeedsOwnerConfirmation: true }),
  );
}
async function verify(code: string) {
  requireProof(/^\d{6}$/.test(code) && claimCookie, "CODE_INPUT_INVALID");
  const r = await request("/mobile-invitation/verify", { code }, claimCookie);
  requireProof(
    r.status === 200 &&
      z.object({ status: z.string() }).parse(await r.json()).status === "verified",
    `VERIFY_STATUS_${r.status}`,
  );
  activationCookie = cookie(r, "__Host-meneer-preactivation");
  const view = await request("/account/activate/instruments", undefined, activationCookie);
  requireProof(view.status === 200, `ACTIVATION_PREPARE_${view.status}`);
  const documents = z
    .object({
      documents: z.array(
        z.object({
          instrumentId: z.string(),
          publicationId: z.uuid(),
          contentHash: z.string(),
          body: z.string(),
        }),
      ),
    })
    .parse(await view.json()).documents;
  requireProof(
    documents.length === 2 && documents.every((d) => d.body.includes("SYNTHETIC TEST ONLY")),
    "REAL_DOCUMENT_REJECTED",
  );
  const t = documents.find((d) => d.instrumentId === "pilot-account-terms");
  const p = documents.find((d) => d.instrumentId === "pilot-privacy-notice");
  requireProof(t && p, "SYNTHETIC_DOCUMENTS_MISSING");
  const requestKey = randomUUID();
  const commit = await fetch(origin + "/account/activate", {
    method: "POST",
    redirect: "manual",
    headers: {
      Origin: origin,
      Cookie: activationCookie,
      "Content-Type": "application/json",
      "Idempotency-Key": requestKey,
    },
    body: JSON.stringify({
      givenName: "Synthetic",
      familyName: "Mobile",
      mobileE164: phone,
      contactPreference: "email",
      termsPublicationId: t.publicationId,
      termsHash: t.contentHash,
      privacyPublicationId: p.publicationId,
      privacyHash: p.contentHash,
      termsAccepted: true,
      privacyAcknowledged: true,
      requestKey,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  requireProof(commit.status === 204, `ACTIVATION_STATUS_${commit.status}`);
  const result = await sql(
    `select (select status from identity_private.mobile_invitations where id='${mobile}') status,(select count(*) from public.client_profiles where tenant_id='${tenant}') profiles,(select count(*) from public.pilot_instrument_receipts where tenant_id='${tenant}') receipts,(select count(*) from identity_private.mobile_invitation_delivery_receipts r join identity_private.mobile_invitation_delivery_intents d on d.id=r.attempt_id where d.tenant_id='${tenant}' and r.outcome='delivered') delivery_receipts`,
  );
  requireProof(
    result[0]?.status === "converted" &&
      Number(result[0]?.profiles) === 1 &&
      Number(result[0]?.receipts) === 2,
    "ATOMIC_CONVERSION_UNCONFIRMED",
  );
  proof.conversion = result[0];
  requireProof(Number(result[0]?.delivery_receipts) > 0, "GENUINE_DELIVERY_CALLBACK_MISSING");
  converted = true;
  manifest("converted");
  console.log(JSON.stringify({ stage: "converted", proof }));
}
async function cleanup() {
  if (configurationAttempted) {
    const current = await activeVersion();
    requireProof(
      current === baselineVersion || current === configurationVersion,
      "CONCURRENT_DEPLOYMENT_PREVENTS_RESTORE",
    );
    requireProof(etag(current) === baseEtag, "SOURCE_CHANGED_PREVENTS_RESTORE");
    // Owner-controlled promotion/restoration is never performed by this driver.
    requireProof((await activeVersion()) === baselineVersion, "RESTORATION_UNCONFIRMED");
  }
  // Recover exact provider-created identity after an interrupted email response, never an unrelated user.
  if (mobile && !participantAuth) {
    const linked = await sql(
      `select i.provider_subject from identity_private.mobile_email_exchanges x join public.identity_invitations i on i.id=x.email_invitation_id where x.mobile_invitation_id='${mobile}'`,
    );
    const id = linked[0]?.provider_subject;
    if (typeof id === "string" && uuid.test(id)) {
      participantAuth = id;
      roots.add(id);
    }
  }
  for (const id of [operatorAuth, participantAuth].filter((id): id is string => !!id)) {
    const mapped = await sql(
      `select subject_id from public.external_identities where provider='supabase' and provider_subject='${id}'`,
    );
    for (const r of mapped) {
      requireProof(uuid.test(String(r.subject_id)), "CLEANUP_SUBJECT_INVALID");
      roots.add(String(r.subject_id));
    }
    await sql(`update auth.sessions set not_after=clock_timestamp() where user_id='${id}'`, false);
    const removed = await admin.auth.admin.deleteUser(id);
    requireProof(!removed.error, "AUTH_CLEANUP_FAILED");
  }
  await sql(cleanupSql(), false);
  const final = await sql(baselineSql);
  requireProof(JSON.stringify(final) === JSON.stringify(baseline), "BASELINE_NOT_RESTORED");
  const finalAuth = await sql(
    "select (select count(*) from auth.users)+(select count(*) from auth.sessions)+(select count(*) from auth.refresh_tokens) as n",
  );
  requireProof(Number(finalAuth[0]?.n) === 0, "AUTH_BASELINE_NOT_RESTORED");
  const finalTriggers = await sql(
    "select n.nspname||'.'||c.relname relation,t.tgname,t.tgenabled from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in ('public','identity_private','audit_private') order by 1,2",
  );
  requireProof(JSON.stringify(finalTriggers) === JSON.stringify(triggers), "GUARDS_NOT_RESTORED");
  restored = true;
  token = staffCookie = claimCookie = activationCookie = "";
  manifest("restored");
}
if (saved) await sql(cleanupSql().replace(/commit;/, "rollback;"), false);
const terminalState = process.stdin.isTTY
  ? execFileSync("stty", ["-g"], { encoding: "utf8", stdio: ["inherit", "pipe", "pipe"] }).trim()
  : undefined;
if (terminalState) execFileSync("stty", ["-echo"], { stdio: ["inherit", "pipe", "pipe"] });
const lines = createInterface({ input: process.stdin, terminal: false });
console.log(JSON.stringify({ stage: "ready", manifestPath, messagesAllowed: 1, maximumUsd: 1 }));
try {
  for await (const line of lines) {
    const command = JSON.parse(line) as { action: string; code?: string };
    // A resumed dispatch may have been accepted before interruption. Never reconstruct a send.
    requireProof(!saved?.dispatched || command.action === "cleanup", "RESUME_CLEANUP_ONLY");
    if (command.action === "setup") {
      await setup();
    } else if (command.action === "authenticate") {
      await authenticateStaff();
      console.log(JSON.stringify({ stage: "staff-ready" }));
    } else if (command.action === "send") await send();
    else if (command.action === "redeem") await redeem();
    else if (command.action === "verify") await verify(command.code ?? "");
    else if (command.action === "cleanup") break;
    else throw new Error("OPERATOR_ACTION_REJECTED");
  }
} catch (error) {
  console.log(
    JSON.stringify({
      stage: "incomplete",
      reason:
        error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
          ? error.message
          : "REHEARSAL_FAILED",
    }),
  );
  process.exitCode = 1;
} finally {
  lines.close();
  try {
    await cleanup();
    console.log(JSON.stringify({ stage: "restored", converted, proof }));
  } catch {
    manifest("cleanup-incomplete");
    console.log(JSON.stringify({ stage: "cleanup-incomplete", manifestPath }));
    process.exitCode = 1;
  }
  if (terminalState) execFileSync("stty", [terminalState], { stdio: ["inherit", "pipe", "pipe"] });
}
