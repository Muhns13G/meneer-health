import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash, createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { orderReviewResultSchema } from "../src/domain/payments/order-review";
import catalogue from "../content/medical-intake-catalogue.json";
import { completeSyntheticAnswers } from "../contracts/fixtures/medical-intake-synthetic";

// Separately authorised TD-064 acceptance. No emails, provider payment calls or clinical grants.
const project = "gibfpolrdjotwvewgfsz";
const tenant = "6d951368-281e-4519-8361-7b5f63efe245";
const origin = "https://meneerhealth.co.za";
const journal = ".td064-hosted-conflicts.local";
function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
invariant(
  process.env.HOSTED_BUSINESS_CONFLICT_CONFIRM === "isolated-no-send-preserve-four-staff" &&
    process.env.SUPABASE_URL === `https://${project}.supabase.co` &&
    process.env.SUPABASE_SECRET_KEY &&
    readFileSync("supabase/.temp/project-ref", "utf8").trim() === project,
  "HOSTED_CONFLICT_GUARD_REJECTED",
);
invariant(
  !existsSync(journal) || JSON.parse(readFileSync(journal, "utf8")).state === "cleaned",
  "HOSTED_CONFLICT_PRIOR_FIXTURES_REQUIRE_RECONCILIATION",
);
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
function sql(query: string): Array<Record<string, unknown>> {
  try {
    const output = execFileSync(
      "bun",
      ["--no-env-file", "x", "supabase", "db", "query", "--linked", "--", query],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 4 * 1024 * 1024 },
    );
    return JSON.parse(output.slice(output.indexOf("{"))).rows;
  } catch {
    throw new Error("HOSTED_CONFLICT_SQL_FAILED");
  }
}
const baselineQuery = readFileSync("scripts/sql/sprint-13-onboarding-baseline.sql", "utf8");
const baseline = sql(baselineQuery);
const realUsers = sql(
  "select id::text,md5(to_jsonb(u)::text) as fingerprint from auth.users u order by id;",
);
invariant(
  realUsers.length === 4 &&
    sql(
      `select not exists(select 1 from public.tenants where id='${tenant}') and exists(select 1 from public.tenants where slug='meneer-pilot' and status='suspended') as safe;`,
    )[0]?.safe,
  "HOSTED_CONFLICT_BASELINE_CHANGED",
);
const ids = {
  approver: crypto.randomUUID(),
  terms: crypto.randomUUID(),
  privacy: crypto.randomUUID(),
  invitation: crypto.randomUUID(),
  publication: crypto.randomUUID(),
  intake: crypto.randomUUID(),
  price: crypto.randomUUID(),
  orderTerms: crypto.randomUUID(),
};
type Actor = { email: string; provider: string; subject: string; cookie?: string };
const actors = new Map<string, Actor>();
const checks: string[] = [];
let fixtureSeeded = false;
function checkpoint(state: string) {
  writeFileSync(
    journal,
    JSON.stringify({
      state,
      tenant,
      ids,
      actors: [...actors],
      baseline,
      realUsers,
      fixtureSeeded,
      checks,
    }),
    { mode: 0o600 },
  );
}
async function request(path: string, body: Record<string, unknown>, role?: string, form = false) {
  const response = await fetch(origin + path, {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
    headers: {
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
      "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json",
      "Idempotency-Key": String(body.requestKey ?? crypto.randomUUID()),
      ...(role && actors.get(role)?.cookie ? { Cookie: actors.get(role)!.cookie! } : {}),
    },
    body: form ? new URLSearchParams(body as Record<string, string>) : JSON.stringify(body),
  });
  invariant(
    response.headers.get("cache-control")?.includes("no-store") &&
      !response.headers.has("access-control-allow-origin"),
    "HOSTED_CONFLICT_RESPONSE_POLICY_FAILED",
  );
  return response;
}
function remember(response: Response, actor: Actor) {
  const cookie = response.headers.get("set-cookie");
  invariant(
    cookie &&
      cookie.includes("HttpOnly") &&
      cookie.includes("Secure") &&
      cookie.includes("SameSite=Strict"),
    "HOSTED_CONFLICT_COOKIE_INVALID",
  );
  actor.cookie = cookie.split(";", 1)[0];
}
function totp(secret: string) {
  let bits = "";
  for (const c of secret.replaceAll("=", "").toUpperCase()) {
    const n = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c);
    invariant(n >= 0, "HOSTED_CONFLICT_FACTOR_INVALID");
    bits += n.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const hash = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  return ((hash.readUInt32BE(hash[hash.length - 1]! & 15) & 0x7fffffff) % 1_000_000)
    .toString()
    .padStart(6, "0");
}
function businessFingerprint() {
  return JSON.stringify(
    sql(
      `select '${tenant}' as scope, (select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by id),'')) from intake_private.intakes t where tenant_id='${tenant}') as intakes, (select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by id),'')) from public.client_profiles t where tenant_id='${tenant}') as profiles, (select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by id),'')) from commerce_private.order_acceptances t where tenant_id='${tenant}') as acceptances, (select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by id),'')) from audit_private.operations_alert_responses t where tenant_id='${tenant}') as alerts;`,
    ),
  );
}
async function conflict(
  path: string,
  command: Record<string, unknown>,
  role: string,
  name: string,
  form = false,
) {
  const before = businessFingerprint();
  const response = await request(path, command, role, form);
  invariant(response.status === 409, `${name}_STATUS_${response.status}`);
  invariant(businessFingerprint() === before, `${name}_BUSINESS_STATE_CHANGED`);
  checks.push(name);
}
let passed = false;
try {
  invariant(
    (await request("/portal/intake/command", { action: "read", intakeId: null })).status === 401 &&
      (await request("/portal/order/command", { action: "read" })).status === 401,
    "HOSTED_CONFLICT_CONFIGURATION_NOT_READY",
  );
  checkpoint("creating-isolated-identities");
  for (const role of ["patient", "operations", "admin"]) {
    const email = `td064-${role}-${crypto.randomUUID()}@example.invalid`;
    const created = await admin.auth.admin.createUser({ email, email_confirm: true });
    invariant(!created.error && created.data.user, "HOSTED_CONFLICT_CREATE_FAILED");
    const provider = created.data.user.id;
    actors.set(role, { email, provider, subject: "" });
    checkpoint("identity-created");
    const subject = String(
      sql(
        `select subject_id from public.external_identities where provider='supabase' and provider_subject='${provider}';`,
      )[0]?.subject_id ?? "",
    );
    invariant(/^[a-f0-9-]{36}$/.test(subject), "HOSTED_CONFLICT_SUBJECT_MISSING");
    actors.get(role)!.subject = subject;
    checkpoint("identity-linked");
  }
  const patient = actors.get("patient")!,
    operations = actors.get("operations")!,
    security = actors.get("admin")!;
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email: patient.email });
  invariant(!link.error, "HOSTED_CONFLICT_BOOTSTRAP_FAILED");
  const verified = await admin.auth.verifyOtp({
    type: "email",
    token_hash: link.data.properties.hashed_token,
  });
  invariant(!verified.error && verified.data.session, "HOSTED_CONFLICT_BOOTSTRAP_SESSION_FAILED");
  const providerSession = JSON.parse(
    Buffer.from(verified.data.session.access_token.split(".")[1]!, "base64url").toString(),
  ).session_id;
  invariant(/^[a-f0-9-]{36}$/.test(providerSession), "HOSTED_CONFLICT_PROVIDER_SESSION_INVALID");
  const hash = createHash("sha256").update(JSON.stringify(catalogue)).digest("hex");
  sql(`begin;
    insert into public.tenants(id,slug,display_name,status) values('${tenant}','td064-isolated-conflicts','SYNTHETIC CONFLICT ACCEPTANCE ONLY','active');
    insert into public.subjects(id) values('${ids.approver}');
    insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id) values('${tenant}','${operations.subject}','operations','active',now()-interval '1 minute',now()+interval '2 hours','${ids.approver}'),('${tenant}','${security.subject}','admin','active',now()-interval '1 minute',now()+interval '2 hours','${ids.approver}');
    insert into public.pilot_instrument_publications(id,instrument_id,instrument_version,document_body,content_sha256,rendered_locator,approval_reference,approved_by_subject_id,approved_at,effective_at,expires_at) values('${ids.terms}','pilot-account-terms','1.0','SYNTHETIC TEST ONLY account terms',repeat('0',64),'/account/activate','td064-synthetic-only','${ids.approver}',now()-interval '1 hour',now()-interval '1 minute',now()+interval '2 hours'),('${ids.privacy}','pilot-privacy-notice','1.0','SYNTHETIC TEST ONLY privacy notice',repeat('0',64),'/account/activate','td064-synthetic-only','${ids.approver}',now()-interval '1 hour',now()-interval '1 minute',now()+interval '2 hours');
    insert into public.identity_invitations(id,tenant_id,contact_digest,intended_role,provider_subject,expires_at,issued_by_subject_id,purpose,request_key,delivery_status,delivered_at) select '${ids.invitation}','${tenant}',encode(sha256(convert_to(lower(email),'UTF8')),'hex'),'patient',id::text,now()+interval '2 hours','${ids.approver}','operations',gen_random_uuid(),'delivered',now() from auth.users where id='${patient.provider}';
    select public.activate_pilot_account('${ids.invitation}','${tenant}','${patient.provider}','${providerSession}',jsonb_build_object('givenName','Synthetic','familyName','Conflict','mobileE164','+27820000000','contactPreference','email','termsPublicationId','${ids.terms}','termsHash',encode(sha256(convert_to('SYNTHETIC TEST ONLY account terms','UTF8')),'hex'),'privacyPublicationId','${ids.privacy}','privacyHash',encode(sha256(convert_to('SYNTHETIC TEST ONLY privacy notice','UTF8')),'hex'),'termsAccepted',true,'privacyAcknowledged',true,'requestKey',gen_random_uuid()));
    insert into intake_private.publications(id,tenant_id,collection_version,control_version,catalogue_hash,privacy_body,review_body,recipient_reference,clinical_approver,privacy_approver,primary_responder,fallback_responder,acknowledgement_seconds,guidance_version,urgent_guidance,after_hours_guidance,effective_at,expires_at,status) values('${ids.publication}','${tenant}','1.1.0','1.0.0','${hash}','SYNTHETIC TEST ONLY privacy','SYNTHETIC TEST ONLY review',gen_random_uuid(),'${ids.approver}','${security.subject}','${ids.approver}','${operations.subject}',300,gen_random_uuid(),'SYNTHETIC TEST ONLY urgent guidance','SYNTHETIC TEST ONLY fallback',now()-interval '1 minute',now()+interval '2 hours','published');
    insert into commerce_private.prices(id,kind,version,description,unit_amount_minor,tax_treatment,source_fingerprint,approval_reference,environment,effective_at,expires_at) values('${ids.price}','review_deposit','td064-synthetic-deposit','SYNTHETIC review deposit',99900,'vat-inclusive-planning',repeat('a',64),gen_random_uuid(),'local-synthetic',now()-interval '1 minute',now()+interval '2 hours');
    insert into commerce_private.order_publications(id,tenant_id,scenario,instrument_version,supplier,body,content_hash,approval_reference,effective_at,expires_at,status) values('${ids.orderTerms}','${tenant}','review_deposit','1.0.0','SYNTHETIC TEST ONLY supplier','SYNTHETIC TEST ONLY deposit terms',repeat('0',64),gen_random_uuid(),now()-interval '1 minute',now()+interval '2 hours','published');
    commit; select true as seeded;`);
  fixtureSeeded = true;
  checkpoint("testing");
  for (const [role, actor] of actors) {
    const code = await admin.auth.admin.generateLink({ type: "magiclink", email: actor.email });
    invariant(!code.error, "HOSTED_CONFLICT_CODE_FAILED");
    const login = await request(
      role === "patient" ? "/account/sign-in" : "/staff/sign-in",
      { action: "verify", email: actor.email, code: code.data.properties.email_otp },
      undefined,
      true,
    );
    invariant(
      login.status === (role === "patient" ? 204 : 200),
      `HOSTED_CONFLICT_LOGIN_${role}_${login.status}`,
    );
    remember(login, actor);
    if (role !== "patient") {
      const body = z
        .object({ enrollment: z.object({ secret: z.string().min(1) }) })
        .parse(await login.json());
      const mfa = await request("/staff/mfa", { code: totp(body.enrollment.secret) }, role, true);
      invariant(mfa.status === 204, `HOSTED_CONFLICT_MFA_${mfa.status}`);
      remember(mfa, actor);
    }
  }
  const save = {
    action: "save",
    intakeId: ids.intake,
    publicationId: ids.publication,
    privacyAcknowledged: true,
    expectedVersion: 0,
    requestKey: crypto.randomUUID(),
    answers: completeSyntheticAnswers,
  };
  const saved = await request("/portal/intake/command", save, "patient");
  invariant(saved.status === 200, `HOSTED_CONFLICT_SAVE_${saved.status}`);
  const written = z.object({ caseId: z.uuid() }).parse(await saved.json());
  invariant(
    (await request("/portal/intake/command", save, "patient")).status === 200,
    "HOSTED_CONFLICT_INTAKE_REPLAY_FAILED",
  );
  checks.push("intake-positive-exact-replay");
  await conflict(
    "/portal/intake/command",
    { ...save, requestKey: crypto.randomUUID() },
    "patient",
    "intake-stale-version",
  );
  const submit = await request(
    "/portal/intake/command",
    { ...save, action: "submit", expectedVersion: 1, requestKey: crypto.randomUUID() },
    "patient",
  );
  invariant(submit.status === 200, `HOSTED_CONFLICT_SUBMIT_${submit.status}`);
  const correction = {
    action: "correct",
    requestKey: crypto.randomUUID(),
    expectedVersion: 1,
    givenName: "Synthetic",
    familyName: "Updated",
    contactPreference: "email",
  };
  invariant(
    (await request("/portal/rights/command", correction, "patient")).status === 200 &&
      (await request("/portal/rights/command", correction, "patient")).status === 200,
    "HOSTED_CONFLICT_RIGHTS_REPLAY_FAILED",
  );
  checks.push("rights-positive-exact-replay");
  await conflict(
    "/portal/rights/command",
    { ...correction, requestKey: crypto.randomUUID() },
    "patient",
    "rights-stale-version",
  );
  sql(
    `begin; insert into public.operations_assignments(tenant_id,case_id,subject_id,workforce_subject_id,granted_by_subject_id,starts_at,expires_at) values('${tenant}','${written.caseId}','${patient.subject}','${operations.subject}','${ids.approver}',now()-interval '1 minute',now()+interval '2 hours'); select commerce_private.prepare_offer('${tenant}','${patient.subject}','${written.caseId}',jsonb_build_object('scenario','review_deposit','items','[]'::jsonb,'requestKey',gen_random_uuid())); commit; select true as offer_prepared;`,
  );
  const reviewResponse = await request("/portal/order/command", { action: "read" }, "patient");
  invariant(reviewResponse.status === 200, `HOSTED_CONFLICT_ORDER_READ_${reviewResponse.status}`);
  const review = orderReviewResultSchema.parse(await reviewResponse.json()).review;
  invariant(review && !review.checkoutEnabled, "HOSTED_CONFLICT_CHECKOUT_MUST_STAY_DISABLED");
  const accept = {
    action: "accept",
    offerId: review.offerId,
    publicationId: review.terms.publicationId,
    snapshotHash: review.snapshotHash,
    contentHash: review.terms.contentHash,
    requestKey: crypto.randomUUID(),
    accepted: true,
  };
  await conflict(
    "/portal/order/command",
    { ...accept, snapshotHash: "b".repeat(64) },
    "patient",
    "order-changed-snapshot",
  );
  invariant(
    (await request("/portal/order/command", accept, "patient")).status === 200 &&
      (await request("/portal/order/command", accept, "patient")).status === 200,
    "HOSTED_CONFLICT_ORDER_REPLAY_FAILED",
  );
  checks.push("order-positive-exact-replay");
  await conflict(
    "/portal/order/command",
    { ...accept, requestKey: crypto.randomUUID() },
    "patient",
    "order-different-key",
  );
  const alert = String(
    sql(
      `select id from audit_private.operations_alerts where tenant_id='${tenant}' order by recorded_at limit 1;`,
    )[0]?.id,
  );
  invariant(/^[a-f0-9-]{36}$/.test(alert), "HOSTED_CONFLICT_ALERT_MISSING");
  await conflict(
    "/staff/alerts/respond",
    { alertId: alert, action: "resolved", requestKey: crypto.randomUUID() },
    "admin",
    "alert-resolve-before-ack",
    true,
  );
  const ack = { alertId: alert, action: "acknowledged", requestKey: crypto.randomUUID() };
  invariant(
    (await request("/staff/alerts/respond", ack, "admin", true)).status === 200 &&
      (await request("/staff/alerts/respond", ack, "admin", true)).status === 200,
    "HOSTED_CONFLICT_ALERT_REPLAY_FAILED",
  );
  checks.push("alert-positive-exact-replay");
  await conflict(
    "/staff/alerts/respond",
    { ...ack, action: "resolved" },
    "admin",
    "alert-key-reuse",
    true,
  );
  const beforeDenial = businessFingerprint();
  invariant(
    (
      await request(
        "/staff/alerts/respond",
        { ...ack, requestKey: crypto.randomUUID() },
        "operations",
        true,
      )
    ).status === 403,
    "HOSTED_CONFLICT_WRONG_ROLE_ALLOWED",
  );
  invariant(
    (
      await request(
        "/staff/intake/command",
        {
          action: "read",
          intakeId: ids.intake,
          purpose: "medical_review",
        },
        "operations",
      )
    ).status === 403,
    "HOSTED_CONFLICT_CLINICAL_ACCESS_ALLOWED",
  );
  invariant(
    businessFingerprint() === beforeDenial,
    "HOSTED_CONFLICT_DENIAL_MUTATED_BUSINESS_STATE",
  );
  checks.push("wrong-role-and-clinical-denials");
  const restriction = {
    action: "restrict",
    intakeId: ids.intake,
    expectedVersion: 2,
    requestKey: crypto.randomUUID(),
  };
  invariant(
    (await request("/portal/intake/command", restriction, "patient")).status === 200,
    "HOSTED_CONFLICT_RESTRICTION_FAILED",
  );
  await conflict(
    "/portal/intake/command",
    { ...restriction, requestKey: crypto.randomUUID() },
    "patient",
    "restriction-stale-version",
  );
  checkpoint("acceptance-passed");
  passed = true;
} finally {
  const roots = [
    tenant,
    ...Object.values(ids),
    ...[...actors.values()].flatMap((a) => [a.provider, ...(a.subject ? [a.subject] : [])]),
  ];
  invariant(
    roots.every((id) => /^[a-f0-9-]{36}$/.test(id)),
    "HOSTED_CONFLICT_CLEANUP_ROOTS_INVALID",
  );
  for (const actor of actors.values())
    sql(`delete from auth.sessions where user_id='${actor.provider}'; select true as revoked;`);
  let cleanup = readFileSync("scripts/sql/sprint-13-onboarding-cleanup.sql", "utf8")
    .replaceAll("{{baseline}}", JSON.stringify(baseline))
    .replaceAll("{{roots}}", JSON.stringify(roots));
  cleanup = cleanup.replace(
    "or exists(select 1 from auth.users where id::text not in(select id from exercise_roots))",
    `or exists(select 1 from auth.users where id::text not in(select id from exercise_roots) and id::text not in(${realUsers.map((u) => `'${u.id}'`).join(",")}))`,
  );
  invariant(
    !cleanup.includes("{{") && cleanup.includes("and id::text not in("),
    "HOSTED_CONFLICT_PRESERVATION_GUARD_REQUIRED",
  );
  if (actors.size || fixtureSeeded) sql(cleanup);
  for (const actor of actors.values()) {
    const removed = await admin.auth.admin.deleteUser(actor.provider);
    invariant(!removed.error, "HOSTED_CONFLICT_PROVIDER_CLEANUP_FAILED");
  }
  invariant(
    JSON.stringify(sql(baselineQuery)) === JSON.stringify(baseline) &&
      JSON.stringify(
        sql("select id::text,md5(to_jsonb(u)::text) as fingerprint from auth.users u order by id;"),
      ) === JSON.stringify(realUsers),
    "HOSTED_CONFLICT_BASELINE_NOT_RESTORED",
  );
  checkpoint("cleaned");
}
invariant(passed, "HOSTED_CONFLICT_ACCEPTANCE_INCOMPLETE");
console.log(
  JSON.stringify({
    exercise: "hosted-business-conflicts",
    checks,
    fullApplicationBaselineRestored: true,
    realStaffPreserved: 4,
    realGrantsPreserved: 6,
    emailsSent: 0,
    providerPayments: 0,
    clinicalGrants: 0,
  }),
);
