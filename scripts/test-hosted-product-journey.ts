import { execFileSync, spawnSync } from "node:child_process";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { z } from "zod";
import { chromium, type BrowserContext } from "@playwright/test";
import {
  preparationManifestSchema,
  productRehearsalAccount as account,
  productRehearsalOrigin as origin,
} from "./lib/product-rehearsal-preparation";
import {
  buildProductHostedCleanup,
  productBaselineSchema,
  productNativePriceRootsSql,
} from "./lib/product-rehearsal-cleanup";
import { createSupabaseManagedIdentityProvider } from "../src/adapters/identity/supabase/supabase-managed-identity-provider";
import { SupabaseIdentitySessionRepository } from "../src/adapters/identity/supabase/supabase-identity-session-repository";
import { SupabaseWorkforceContextRepository } from "../src/adapters/identity/supabase/supabase-workforce-context-repository";
import { SupabaseAccessRepository } from "../src/adapters/persistence/supabase/supabase-access-repository";
import { SupabaseIdentityGovernanceRepository } from "../src/adapters/identity/supabase/supabase-identity-governance-repository";
import {
  WorkforceSessionService,
  type WorkforceProof,
} from "../src/application/identity/workforce-session-service";
import { PatientSessionService } from "../src/application/identity/patient-session-service";
import { sealWorkforceProof } from "../src/server/identity/workforce-session-cookie";
import {
  sealPatientSession,
  patientSessionCookieName,
} from "../src/server/identity/patient-session-cookie";
import { encryptIntake } from "../src/server/intake/intake-envelope";
import { encryptShippingAddress } from "../src/server/payments/shipping-envelope";
import { completeSyntheticAnswers } from "../contracts/fixtures/medical-intake-synthetic";
import {
  orderReviewResultSchema,
  checkoutResultSchema,
  type OrderReview,
} from "../src/domain/payments/order-review";
import { staffProductQuoteViewSchema } from "../src/domain/payments/staff-product-quote";
import { productQuoteIssueViewSchema } from "../src/domain/payments/product-quote-issue";
import { productFulfilmentViewSchema } from "../src/domain/payments/product-fulfilment";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw Error(code);
}
const uuid = (value: unknown) => z.uuid().parse(value);
const literal = (value: unknown) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
const config = preparationManifestSchema.parse(
  JSON.parse(readFileSync(".sprint15-product-rehearsal.local", "utf8")),
);
const retry = process.argv.includes("--retry-cleaned-no-capture");
const authIsolationRetry = process.argv.includes("--retry-cleaned-auth-isolation");
const quotePreflight = process.argv.includes("--quote-preflight-no-payment");
const replacement = process.argv.includes("--approved-replacement-deposit");
if (replacement) {
  invariant(
    process.env.PRODUCT_REHEARSAL_REPLACEMENT_CONFIRM ===
      "one-replacement-deposit-original-method-refund",
    "S15_REPLACEMENT_AUTHORITY_REQUIRED",
  );
  for (const name of ["auth-isolation", "quote-preflight"]) {
    const prior = JSON.parse(readFileSync(`.sprint15-product-journey-${name}.local`, "utf8"));
    invariant(
      prior.cleaned === true &&
        prior.exerciseId === config.exerciseId &&
        prior.paymentIntents.length === (name === "auth-isolation" ? 1 : 0) &&
        prior.refunds.length === (name === "auth-isolation" ? 1 : 0),
      "S15_REPLACEMENT_BASELINE_REJECTED",
    );
  }
}
if (quotePreflight) {
  const prior = JSON.parse(readFileSync(".sprint15-product-journey-auth-isolation.local", "utf8"));
  invariant(
    prior.cleaned === true &&
      prior.paymentIntents.length === 1 &&
      prior.refunds.length === 1 &&
      prior.exerciseId === config.exerciseId,
    "S15_PRIOR_CAPTURE_NOT_CLEANED",
  );
}
for (const path of authIsolationRetry
  ? [".sprint15-product-journey.local", ".sprint15-product-journey-retry.local"]
  : retry
    ? [".sprint15-product-journey.local"]
    : []) {
  const prior = JSON.parse(readFileSync(path, "utf8"));
  invariant(
    prior.cleaned === true &&
      prior.completed === false &&
      prior.paymentIntents.length === 0 &&
      prior.checkoutSessions.length === 0 &&
      prior.exerciseId === config.exerciseId,
    "S15_PRIOR_ATTEMPT_NOT_CLEAN",
  );
}
const manifestPath = replacement
  ? ".sprint15-product-journey-replacement.local"
  : quotePreflight
    ? ".sprint15-product-journey-quote-preflight.local"
    : authIsolationRetry
      ? ".sprint15-product-journey-auth-isolation.local"
      : retry
        ? ".sprint15-product-journey-retry.local"
        : ".sprint15-product-journey.local";
const project = "gibfpolrdjotwvewgfsz";
invariant(
  process.env.PRODUCT_REHEARSAL_EXERCISE_CONFIRM === "isolated-two-test-captures-and-cleanup" &&
    !process.env.CI &&
    process.env.SUPABASE_URL === `https://${project}.supabase.co` &&
    process.env.SUPABASE_SECRET_KEY &&
    process.env.STRIPE_RESTRICTED_KEY?.startsWith("rk_test_") &&
    process.env.STRIPE_CHECKOUT_ACCOUNT_ID === account &&
    config.configurationVersion &&
    Date.parse(config.expiresAt) > Date.now() + 3600000 &&
    !existsSync(manifestPath),
  "S15_EXERCISE_GUARD_REJECTED",
);
const tenant = uuid(config.tenantId);
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const provider = createSupabaseManagedIdentityProvider({
  url: process.env.SUPABASE_URL,
  secretKey: process.env.SUPABASE_SECRET_KEY,
});
const sessions = new SupabaseIdentitySessionRepository(admin);
const workforce = new WorkforceSessionService(
  provider,
  new SupabaseWorkforceContextRepository(admin),
  sessions,
);
const patients = new PatientSessionService(
  provider,
  new SupabaseAccessRepository(admin),
  sessions,
  new SupabaseIdentityGovernanceRepository(admin),
);
const stripe = new Stripe(process.env.STRIPE_RESTRICTED_KEY!, {
  apiVersion: "2026-07-29.dahlia",
  maxNetworkRetries: 0,
  timeout: 15000,
  telemetry: false,
});
const management = execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-w"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}).trim();
invariant(management.startsWith("sbp_"), "S15_MANAGEMENT_AUTH_REQUIRED");
type Row = Record<string, unknown>;
async function sql(query: string, readOnly = true): Promise<Row[]> {
  const r = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${management}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, read_only: readOnly }),
    signal: AbortSignal.timeout(45000),
  });
  if (!r.ok) {
    const body = await r.text();
    const code = /\b(?:S15_[A-Z_]+|[A-Z_]{4,}_REJECTED|ONBOARDING_[A-Z_]+|COMMERCE_[A-Z_]+)\b/.exec(
      body,
    )?.[0];
    throw Error(code ?? `S15_DATABASE_HTTP_${r.status}`);
  }
  return r.json();
}
type Actor = {
  id: string;
  subject: string;
  email: string;
  role: string;
  cookie?: string;
  proof?: WorkforceProof;
  token?: string;
  factorSecret?: string;
  factorId?: string;
  lastMfa?: number;
};
const actors: Record<string, Actor> = {};
const ids = Object.fromEntries(
  [
    "invitation",
    "intake",
    "publication",
    "catalogue",
    "product",
    "address",
    "delivery",
    "depositPrice",
    "depositTerms",
    "productTerms",
  ].map((name) => [name, randomUUID()]),
) as Record<string, string>;
const medicalKey = randomBytes(32);
const checkoutSessions: string[] = [],
  paymentIntents: string[] = [],
  refunds: string[] = [];
let baseline: z.infer<typeof productBaselineSchema> = [],
  realAuthIds: string[] = [];
let stage = "initialised",
  fixtureSeeded = false,
  completed = false,
  cleaned = false;
const proofs: Row[] = [];
let failure: Row | undefined;
function checkpoint(next = stage) {
  stage = next;
  writeFileSync(
    manifestPath,
    JSON.stringify({
      contract: "sprint15.product-journey",
      version: 1,
      exerciseId: config.exerciseId,
      tenant,
      service: config.serviceId,
      ids,
      actors,
      medicalKey: medicalKey.toString("base64"),
      baseline,
      realAuthIds,
      checkoutSessions,
      paymentIntents,
      refunds,
      proofs,
      failure,
      stage,
      fixtureSeeded,
      completed,
      cleaned,
    }),
    { mode: 0o600 },
  );
}
function roots() {
  return [
    ...new Set([
      tenant,
      config.serviceId,
      ...Object.values(ids),
      ...Object.values(actors).flatMap((actor) => [
        actor.id,
        ...(actor.subject ? [actor.subject] : []),
      ]),
    ]),
  ];
}
function cleanupQuery(rollback = false) {
  return buildProductHostedCleanup({
    tenant,
    exerciseId: config.exerciseId,
    roots: roots(),
    realAuthIds,
    baseline,
    rollback,
  });
}
function activeVersion(name: string) {
  const r = spawnSync(
    "node_modules/.bin/wrangler",
    [
      "deployments",
      "list",
      "--name",
      name,
      "--config",
      "dist-product-rehearsal/server/wrangler.json",
      "--json",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  invariant(r.status === 0, "S15_VERSION_READ_FAILED");
  const value = JSON.parse(r.stdout).at(-1);
  invariant(
    value.versions.length === 1 && value.versions[0].percentage === 100,
    "S15_TRAFFIC_SPLIT_REJECTED",
  );
  return value.versions[0].version_id as string;
}
function totp(secret: string) {
  let bits = "";
  for (const c of secret.replaceAll("=", "")) {
    const n = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c.toUpperCase());
    invariant(n >= 0, "S15_FACTOR_INVALID");
    bits += n.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let n = 0; n + 8 <= bits.length; n += 8) bytes.push(parseInt(bits.slice(n, n + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  return ((h.readUInt32BE(h[h.length - 1]! & 15) & 0x7fffffff) % 1000000)
    .toString()
    .padStart(6, "0");
}
const accessCookie = `__Host-product-rehearsal=${config.accessKey}`;
async function request(path: string, body: Row | undefined, actor?: Actor) {
  const r = await fetch(origin + path, {
    method: body ? "POST" : "GET",
    redirect: "manual",
    headers: {
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
      Cookie: [accessCookie, actor?.cookie].filter(Boolean).join("; "),
      ...(body
        ? {
            "Content-Type": "application/json",
            "Idempotency-Key": String(body.requestKey ?? randomUUID()),
          }
        : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  invariant(r.headers.get("cache-control")?.includes("no-store"), "S15_NO_STORE_MISSING");
  return r;
}
async function json(path: string, body: Row, actor = actors.operations!) {
  const r = await request(path, body, actor);
  invariant(r.status === 200, `S15_ROUTE_${path.split("/").at(-1)?.toUpperCase()}_${r.status}`);
  return r.json() as Promise<unknown>;
}
function context(actor: Actor) {
  invariant(actor.proof?.sessionId, "S15_WORKFORCE_PROOF_MISSING");
  return {
    tenantId: tenant,
    subjectId: actor.subject,
    sessionId: actor.proof.sessionId,
    providerSubject: actor.id,
    providerSessionId: actor.proof.providerSessionId,
    verifiedEmail: actor.email,
    purpose:
      actor.role === "clinician"
        ? "care_delivery"
        : actor.role === "admin"
          ? "security_administration"
          : "operations",
  };
}
async function rpc(name: string, args: Row) {
  const { data, error } = await admin.rpc(name, args);
  invariant(!error, `S15_RPC_${name.toUpperCase()}_${error?.code ?? "FAILED"}`);
  return data as unknown;
}
async function code(actor: Actor) {
  const r = await admin.auth.admin.generateLink({ type: "magiclink", email: actor.email });
  invariant(!r.error && r.data.user.id === actor.id, "S15_NO_SEND_CODE_FAILED");
  return r.data.properties.email_otp;
}
async function login(actor: Actor) {
  const pending = await workforce.verifyCode(actor.email, await code(actor));
  invariant(pending.enrollment?.secret && !pending.proof.sessionId, "S15_INITIAL_MFA_REQUIRED");
  const complete = await workforce.completeMfa(pending.proof, totp(pending.enrollment.secret));
  invariant(
    complete.session.assurance === "aal2" && complete.proof.context.tenantId === tenant,
    "S15_GENUINE_MFA_FAILED",
  );
  actor.proof = complete.proof;
  actor.factorSecret = pending.enrollment.secret;
  actor.factorId = pending.enrollment.factorId;
  actor.lastMfa = Date.now();
  actor.token = complete.proof.providerSession.accessToken;
  actor.cookie = (
    await sealWorkforceProof(complete.proof, complete.session.absoluteExpiresAt, config.sessionKey)
  ).split(";", 1)[0];
  checkpoint();
}
async function freshMfa(actor: Actor) {
  if (actor.lastMfa && Date.now() - actor.lastMfa < 120000) return;
  invariant(actor.proof && actor.factorId && actor.factorSecret, "S15_FACTOR_MISSING");
  const challenge = await provider.challengeWorkforceTotp(
    actor.proof.providerSession,
    actor.factorId,
  );
  const session = await provider.verifyWorkforceTotp(
    actor.proof.providerSession,
    actor.factorId,
    challenge,
    totp(actor.factorSecret),
  );
  actor.proof = { ...actor.proof, providerSession: session };
  await workforce.authorise(actor.proof);
  actor.token = session.accessToken;
  actor.lastMfa = Date.now();
  actor.cookie = (
    await sealWorkforceProof(actor.proof, new Date(Date.now() + 10 * 60000), config.sessionKey)
  ).split(";", 1)[0];
  checkpoint();
}
async function setup() {
  const patient = actors.patient!,
    security = actors.admin!,
    clinical = actors.clinician!;
  // Never sign a patient into the service repository's client: Supabase keeps an
  // in-memory session even when persistence is disabled and would replace its bearer.
  const generated = await provider.verifyEmailOtp(patient.email, await code(patient));
  patient.token = generated.accessToken;
  checkpoint();
  const identity = await provider.verifyAccessToken(patient.token);
  const docs = await sql(
    "select distinct on(instrument_id) id,instrument_id,content_sha256 from public.pilot_instrument_publications where instrument_id in('pilot-account-terms','pilot-privacy-notice') and status='published' and effective_at<=clock_timestamp() and (expires_at is null or expires_at>clock_timestamp()) order by instrument_id,effective_at desc,published_at desc;",
  );
  const terms = docs.find((row) => row.instrument_id === "pilot-account-terms"),
    privacy = docs.find((row) => row.instrument_id === "pilot-privacy-notice");
  invariant(terms && privacy, "S15_CURRENT_ACCOUNT_DOCUMENTS_MISSING");
  uuid(terms.id);
  uuid(privacy.id);
  const activation = {
    givenName: "Synthetic",
    familyName: "Product Client",
    mobileE164: "+27820000000",
    contactPreference: "email",
    termsPublicationId: terms.id,
    termsHash: terms.content_sha256,
    privacyPublicationId: privacy.id,
    privacyHash: privacy.content_sha256,
    termsAccepted: true,
    privacyAcknowledged: true,
    requestKey: randomUUID(),
  };
  const seed = `begin;
 insert into public.tenants(id,slug,display_name,status) values('${tenant}','synthetic-s15-${config.exerciseId}','SYNTHETIC PRODUCT ACCEPTANCE','active');
 ${Object.entries(actors)
   .filter(([name]) => name !== "patient")
   .map(
     ([, actor]) =>
       `insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)values('${tenant}','${actor.subject}','${actor.role}','active',now()-interval '1 minute',now()+interval '2 hours','${actor.role === "admin" ? clinical.subject : security.subject}');`,
   )
   .join("\n")}
 -- Declared synthetic invitation prerequisite, not evidence of an email/SMS delivery.
 insert into public.identity_invitations(id,tenant_id,contact_digest,intended_role,provider_subject,expires_at,issued_by_subject_id,purpose,request_key,delivery_status,delivered_at)
 values('${ids.invitation}','${tenant}',encode(extensions.digest(convert_to('${patient.email}','UTF8'),'sha256'),'hex'),'patient','${patient.id}',now()+interval '2 hours','${security.subject}','operations',gen_random_uuid(),'delivered',now());
 select public.activate_pilot_account('${ids.invitation}','${tenant}','${patient.id}','${uuid(identity.providerSessionId)}',${literal(activation)});
 insert into commerce_private.checkout_releases(tenant_id,provider_account_id,approval_reference,expires_at,enabled) values('${tenant}','${account}',gen_random_uuid(),now()+interval '2 hours',true);
 insert into public.service_identities(id,tenant_id,name,environment,purpose,status,expires_at)values('${config.serviceId}','${tenant}','synthetic-s15-webhook','preview','operations','active',now()+interval '2 hours');
 insert into public.service_identity_scopes(service_identity_id,resource,action)values('${config.serviceId}','payment','append'),('${config.serviceId}','payment','update');
 insert into commerce_private.prices(id,kind,version,description,unit_amount_minor,tax_treatment,source_fingerprint,approval_reference,environment,effective_at,expires_at)values('${ids.depositPrice}','review_deposit','s15-${config.exerciseId}','SYNTHETIC deposit',99900,'vat-inclusive-planning',repeat('a',64),gen_random_uuid(),'local-synthetic',now()-interval '1 minute',now()+interval '2 hours');
 insert into commerce_private.order_publications(id,tenant_id,scenario,instrument_version,supplier,body,content_hash,approval_reference,effective_at,expires_at,status)values('${ids.depositTerms}','${tenant}','review_deposit','1.0.0','SYNTHETIC TEST ONLY','SYNTHETIC deposit terms',repeat('a',64),gen_random_uuid(),now()-interval '1 minute',now()+interval '2 hours','published');
 commit;`;
  // Exercise the exact new fixture creation plus scoped cleanup in a single rollback first.
  await sql(
    seed.replace(/commit;$/, "") + cleanupQuery(true).replace(/^([\s\S]*?)begin;/, ""),
    false,
  );
  checkpoint("setup-cleanup-rollback-passed");
  await sql(seed, false);
  fixtureSeeded = true;
  checkpoint("tenant-and-account-created");
  const eligibility = {
    documents_ready: await rpc("has_pilot_account_evidence", {
      p_tenant_id: tenant,
      p_subject_id: patient.subject,
    }),
    review_eligible: await rpc("account_document_review_eligible", {
      p_tenant_id: tenant,
      p_subject_id: patient.subject,
    }),
  };
  invariant(eligibility.documents_ready === true, "S15_PATIENT_DOCUMENT_PREREQUISITE_FAILED");
  proofs.push({ patientPrerequisites: eligibility });
  checkpoint("checking-patient-continuation");
  const session = await patients.continueAfterActivation({
    providerSubject: patient.id,
    tenantId: tenant,
    accessToken: generated.accessToken,
    refreshToken: generated.refreshToken,
  });
  patient.cookie = `${patientSessionCookieName}=${await sealPatientSession(session, Uint8Array.from(Buffer.from(config.sessionKey, "base64")))}`;
  const patientContext = {
    tenantId: tenant,
    subjectId: patient.subject,
    sessionId: session.session.id,
    providerSubject: patient.id,
    providerSessionId: identity.providerSessionId,
    verifiedEmail: patient.email,
    purpose: "account",
  };
  checkpoint();
  for (const [name, actor] of Object.entries(actors)) if (name !== "patient") await login(actor);
  await sql(
    `insert into intake_private.publications(id,tenant_id,collection_version,control_version,catalogue_hash,privacy_body,review_body,recipient_reference,clinical_approver,privacy_approver,primary_responder,fallback_responder,acknowledgement_seconds,guidance_version,urgent_guidance,after_hours_guidance,effective_at,expires_at,status,transfer_notice)values('${ids.publication}','${tenant}','1.1.0','1.0.0',repeat('a',64),'Synthetic privacy only','Synthetic review only',gen_random_uuid(),'${clinical.subject}','${security.subject}','${clinical.subject}','${security.subject}',300,gen_random_uuid(),'Synthetic only','Synthetic only',now()-interval '1 minute',now()+interval '2 hours','published','Synthetic test recipient notice');`,
    false,
  );
  for (const [version, action] of [
    [0, "save"],
    [1, "submit"],
  ] as const) {
    const snapshot = randomUUID();
    const envelope = await encryptIntake(
      completeSyntheticAnswers,
      {
        tenantId: tenant,
        subjectId: patient.subject,
        intakeId: ids.intake!,
        snapshotId: snapshot,
        collectionVersion: "1.1.0",
        controlVersion: "1.0.0",
      },
      { current: "s15-synthetic", keys: { "s15-synthetic": Uint8Array.from(medicalKey) } },
    );
    await rpc("patient_intake_write", {
      p_context: patientContext,
      p_command: {
        intakeId: ids.intake,
        publicationId: ids.publication,
        expectedVersion: version,
        requestKey: randomUUID(),
        snapshotId: snapshot,
        action,
        digest: createHash("sha256").update(JSON.stringify(completeSyntheticAnswers)).digest("hex"),
        replayDigests: [],
        safetyFlag: false,
        envelope,
      },
    });
  }
  const intake = (
    await sql(
      `select case_id,snapshot_id from intake_private.intakes where id='${ids.intake}' and tenant_id='${tenant}';`,
    )
  )[0]!;
  ids.case = uuid(intake.case_id);
  ids.snapshot = uuid(intake.snapshot_id);
  checkpoint("native-synthetic-intake-submitted");
  await sql(
    Object.entries(actors)
      .filter(([name]) => ["operations", "alternate"].includes(name))
      .map(
        ([, actor]) =>
          `insert into public.operations_assignments(tenant_id,case_id,subject_id,workforce_subject_id,granted_by_subject_id,starts_at,expires_at)values('${tenant}','${ids.case}','${patient.subject}','${actor.subject}','${security.subject}',now()-interval '1 minute',now()+interval '2 hours');`,
      )
      .join("\n"),
    false,
  );
  const approved = await rpc("approve_medical_grant", {
    p_context: context(clinical),
    p_command: {
      intakeId: ids.intake,
      snapshotId: ids.snapshot,
      targetSubjectId: actors.reviewer!.subject,
      purpose: "medical_review",
      fields: ["contact", "mental_safety"],
      rosterReference: randomUUID(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      requestKey: randomUUID(),
    },
  });
  await rpc("activate_medical_grant", {
    p_context: context(security),
    p_approval_id: uuid(approved),
  });
  return patientContext;
}
async function catalogue() {
  const patient = actors.patient!;
  const envelope = await encryptShippingAddress(
    {
      recipient: "Synthetic Product Client",
      line1: "1 Synthetic Test Lane",
      locality: "Synthetic",
      province: "Western Cape",
      postalCode: "0001",
      country: "ZA",
    },
    {
      tenantId: tenant,
      subjectId: patient.subject,
      caseId: ids.case!,
      snapshotId: ids.address!,
      version: 1,
    },
    "s15-shipping",
    Uint8Array.from(Buffer.from(config.shippingKey, "base64")),
  );
  await sql(
    `begin;
 insert into commerce_private.catalogue_versions(id,tenant_id,version,provenance,source_fingerprint,import_fingerprint,approval_reference,imported_by,reviewed_by,currency,tax_treatment,effective_at,expires_at,item_count)values('${ids.catalogue}','${tenant}','s15-${config.exerciseId}','local-synthetic',repeat('a',64),repeat('b',64),gen_random_uuid(),'${actors.operations!.subject}','${actors.alternate!.subject}','zar','vat-inclusive-planning',now()-interval '1 minute',now()+interval '2 hours',1);
 insert into commerce_private.catalogue_items values('${ids.catalogue}','${tenant}','${ids.product}','s15-synthetic-item','Synthetic product only',150000,2);
 insert into commerce_private.shipping_address_snapshots(id,tenant_id,subject_id,case_id,version,envelope,captured_by)values('${ids.address}','${tenant}','${patient.subject}','${ids.case}',1,${literal(envelope)},'${patient.subject}');
 insert into commerce_private.delivery_quotes(id,tenant_id,subject_id,case_id,version,amount_minor,approval_reference,effective_at,expires_at,status)values('${ids.delivery}','${tenant}','${patient.subject}','${ids.case}','s15-synthetic',10000,gen_random_uuid(),now()-interval '1 minute',now()+interval '2 hours','approved');
 insert into commerce_private.product_delivery_bindings(quote_id,tenant_id,case_id,subject_id,address_snapshot_id,catalogue_id,custody_policy_reference,evidence_reference)values('${ids.delivery}','${tenant}','${ids.case}','${patient.subject}','${ids.address}','${ids.catalogue}',gen_random_uuid(),gen_random_uuid());
 insert into commerce_private.product_quote_releases(tenant_id,provenance,approval_reference,expires_at,enabled)values('${tenant}','local-synthetic',gen_random_uuid(),now()+interval '2 hours',true);
 insert into commerce_private.order_publications(id,tenant_id,scenario,instrument_version,supplier,body,content_hash,approval_reference,effective_at,expires_at,status)values('${ids.productTerms}','${tenant}','approved_product_order','1.0.0','SYNTHETIC supplier','SYNTHETIC product terms; capped product credit, separate delivery and original-method refunds.',repeat('b',64),gen_random_uuid(),now()-interval '1 minute',now()+interval '2 hours','published');
 commit;`,
    false,
  );
}
async function accept(view: OrderReview) {
  await json(
    "/portal/order/command",
    {
      action: "accept",
      offerId: view.offerId,
      publicationId: view.terms.publicationId,
      snapshotHash: view.snapshotHash,
      contentHash: view.terms.contentHash,
      accepted: true,
      requestKey: randomUUID(),
    },
    actors.patient,
  );
}
async function completeCheckout(url: string, ctx: BrowserContext) {
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.getByLabel("Email", { exact: true }).fill(actors.patient!.email);
    await page.getByPlaceholder("1234 1234 1234 1234").fill("4242424242424242");
    await page.getByPlaceholder("MM / YY").fill("1230");
    await page.getByPlaceholder("CVC").fill("123");
    await page.getByLabel("Cardholder name", { exact: true }).fill("Synthetic Product Client");
    const country = page.getByLabel("Country or region", { exact: true });
    if (await country.count()) await country.selectOption("ZA");
    const postal = page.getByPlaceholder("12345");
    if ((await postal.count()) && (await postal.isVisible())) await postal.fill("0001");
    await page.getByRole("button", { name: /^Pay/ }).click();
    await page.waitForURL(origin + "/portal/order", { timeout: 90000 });
  } finally {
    await page.close();
  }
}
async function checkout(view: OrderReview, ctx: BrowserContext) {
  invariant(checkoutSessions.length < 2, "S15_CAPTURE_BUDGET_EXHAUSTED");
  const body = { action: "checkout", offerId: view.offerId, requestKey: randomUUID() };
  const result = checkoutResultSchema.parse(
    await json("/portal/order/command", body, actors.patient),
  );
  const intent = (
    await sql(
      `select session_id from commerce_private.checkout_intents where offer_id='${view.offerId}' and tenant_id='${tenant}';`,
    )
  )[0];
  const id = z
    .string()
    .regex(/^cs_test_/)
    .parse(intent?.session_id);
  checkoutSessions.push(id);
  checkpoint("sandbox-checkout-created");
  const before = await stripe.checkout.sessions.retrieve(id);
  invariant(
    !before.livemode &&
      before.url === result.checkoutUrl &&
      before.amount_total === view.amountTotalMinor,
    "S15_CHECKOUT_AMOUNT_REJECTED",
  );
  await completeCheckout(result.checkoutUrl, ctx);
  const paid = await stripe.checkout.sessions.retrieve(id);
  invariant(
    !paid.livemode && paid.payment_status === "paid" && typeof paid.payment_intent === "string",
    "S15_PROVIDER_CAPTURE_UNCONFIRMED",
  );
  paymentIntents.push(paid.payment_intent);
  checkpoint("sandbox-capture-confirmed");
  for (let n = 0; n < 18; n++) {
    const r = await sql(
      `select s.paid_confirmed and not s.reconciliation_required and not s.dispute_seen as ok from commerce_private.settlements s join commerce_private.checkout_intents i on i.id=s.intent_id where i.offer_id='${view.offerId}' and i.tenant_id='${tenant}';`,
    );
    if (r[0]?.ok === true) return;
    await delay(2000);
  }
  throw Error("S15_GENUINE_SIGNED_SETTLEMENT_NOT_OBSERVED");
}
async function exercise() {
  await catalogue();
  if (quotePreflight) {
    const caseVersion = (
      await sql(`select version from public.operations_cases where id='${ids.case}';`)
    )[0]!.version;
    const result = staffProductQuoteViewSchema.parse(
      await json("/staff/products/command", {
        action: "prepare_draft",
        caseId: ids.case,
        catalogueId: ids.catalogue,
        deliveryQuoteId: ids.delivery,
        expectedCaseVersion: caseVersion,
        expectedDraftVersion: 0,
        requestKey: randomUUID(),
        items: [{ productId: ids.product, quantity: 2 }],
      }),
    );
    invariant(result.draft, "S15_PREFLIGHT_DRAFT_MISSING");
    proofs.push({ quotePreflight: true, additionalCheckouts: 0, additionalCaptures: 0 });
    checkpoint("quote-preflight-passed");
    return;
  }
  invariant(
    (await request("/portal/products/command", { action: "read" })).status === 401,
    "S15_EMAIL_ONLY_OR_ANON_ALLOWED",
  );
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
  try {
    await ctx.addCookies(
      [accessCookie, actors.patient!.cookie!].map((cookie) => {
        const [name, ...rest] = cookie.split("=");
        return {
          name: name!,
          value: rest.join("="),
          url: origin,
          httpOnly: true,
          secure: true,
          sameSite: "Strict" as const,
        };
      }),
    );
    const page = await ctx.newPage();
    await page.goto(origin + "/portal/products", { waitUntil: "networkidle" });
    invariant(
      await page.getByText("Synthetic product only", { exact: true }).count(),
      "S15_BROWSER_CATALOGUE_NOT_RENDERED",
    );
    await page.close();
    await stripe.webhookEndpoints.update(config.webhookId!, { disabled: false });
    const deposit = orderReviewResultSchema.parse(
      await json("/portal/order/command", { action: "read" }, actors.patient),
    ).review;
    invariant(
      deposit?.scenario === "review_deposit" && deposit.amountTotalMinor === 99900,
      "S15_DEPOSIT_REVIEW_MISSING",
    );
    await accept(deposit);
    await checkout(deposit, ctx);
    checkpoint("signed-deposit-complete");
    await freshMfa(actors.operations!);
    const caseVersion = (
      await sql(`select version from public.operations_cases where id='${ids.case}';`)
    )[0]!.version;
    const command = {
      action: "prepare_draft",
      caseId: ids.case,
      catalogueId: ids.catalogue,
      deliveryQuoteId: ids.delivery,
      expectedCaseVersion: caseVersion,
      expectedDraftVersion: 0,
      requestKey: randomUUID(),
      items: [{ productId: ids.product, quantity: 2 }],
    };
    checkpoint("preparing-funded-product-draft");
    const draft = staffProductQuoteViewSchema.parse(await json("/staff/products/command", command));
    invariant(draft.draft, "S15_DRAFT_MISSING");
    checkpoint("funded-product-draft-prepared");
    invariant(
      (
        await request(
          "/staff/products/evidence",
          {
            action: "record",
            target: { intakeId: ids.intake },
            draftId: draft.draft.draftId,
            kind: "clinical",
            evidenceReference: randomUUID(),
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            requestKey: randomUUID(),
          },
          actors.operations,
        )
      ).status === 403,
      "S15_OPERATIONS_CLINICAL_IMPERSONATION_ALLOWED",
    );
    for (const kind of ["clinical", "provider_stock", "pharmacy_authority", "address_custody"]) {
      await freshMfa(kind === "clinical" ? actors.reviewer! : actors.alternate!);
      await json(
        "/staff/products/evidence",
        {
          action: "record",
          target: kind === "clinical" ? { intakeId: ids.intake } : { caseId: ids.case },
          draftId: draft.draft.draftId,
          kind,
          evidenceReference: randomUUID(),
          expiresAt: new Date(Date.now() + 1800000).toISOString(),
          requestKey: randomUUID(),
        },
        kind === "clinical" ? actors.reviewer : actors.alternate,
      );
    }
    checkpoint("independent-product-evidence-recorded");
    const issued = productQuoteIssueViewSchema.parse(
      await json("/staff/products/issue", {
        action: "issue",
        caseId: ids.case,
        draftId: draft.draft.draftId,
        requestKey: randomUUID(),
      }),
    );
    invariant(issued.offerId, "S15_ISSUE_FAILED");
    const product = orderReviewResultSchema.parse(
      await json("/portal/order/command", { action: "read" }, actors.patient),
    ).review;
    invariant(
      product?.offerId === issued.offerId &&
        product.creditMinor === 99900 &&
        product.amountTotalMinor === 210100,
      "S15_CREDIT_NOT_CONSERVED",
    );
    await accept(product);
    await checkout(product, ctx);
    checkpoint("signed-product-balance-complete");
    let version = 0;
    for (const event of [
      "provider_ordered",
      "exception",
      "exception_resolved",
      "pharmacy_released",
      "hub_received",
      "courier_dispatched",
      "delivered",
    ]) {
      const command = {
        action: "record",
        caseId: ids.case,
        offerId: issued.offerId,
        expectedVersion: version,
        event,
        evidenceReference: randomUUID(),
        requestKey: randomUUID(),
      };
      const result = productFulfilmentViewSchema.parse(
        await json("/staff/products/fulfilment", command),
      );
      version++;
      invariant(result.version === version, "S15_CUSTODY_VERSION_MISMATCH");
      const replay = productFulfilmentViewSchema.parse(
        await json("/staff/products/fulfilment", command),
      );
      invariant(replay.version === version, "S15_CUSTODY_REPLAY_DUPLICATED");
    }
    const counts = (
      await sql(
        `select (select count(*) from commerce_private.product_fulfilment_events where tenant_id='${tenant}') as events,(select count(*) from audit_private.transactional_notifications where tenant_id='${tenant}' and source_kind='product_fulfilment') as notices;`,
      )
    )[0]!;
    invariant(
      Number(counts.events) === 7 && Number(counts.notices) === 7,
      "S15_EVENT_NOTIFICATION_CHAIN_MISMATCH",
    );
    const client = await json("/portal/order/fulfilment", {}, actors.patient);
    invariant(
      z.object({ progress: z.literal("delivered") }).safeParse(client).success,
      "S15_CLIENT_PROGRESS_MISSING",
    );
    proofs.push({
      genuineDeposit: 99900,
      genuineProductBalance: 210100,
      creditMinor: 99900,
      custodyEvents: 7,
      outboxOnly: 7,
      emails: 0,
      clinicalRoleDenial: true,
      exactReplay: true,
    });
    completed = true;
    checkpoint("journey-complete");
  } finally {
    await ctx.close();
    await browser.close();
  }
}
async function cleanup() {
  for (const id of checkoutSessions) {
    const s = await stripe.checkout.sessions.retrieve(id);
    invariant(!s.livemode, "S15_CLEANUP_LIVE_SESSION_REJECTED");
    if (s.status === "open") await stripe.checkout.sessions.expire(id);
    if (
      s.payment_status === "paid" &&
      typeof s.payment_intent === "string" &&
      !paymentIntents.includes(s.payment_intent)
    )
      paymentIntents.push(s.payment_intent);
  }
  for (const id of paymentIntents) {
    const p = await stripe.paymentIntents.retrieve(id);
    invariant(
      !p.livemode && p.status === "succeeded" && typeof p.latest_charge === "string",
      "S15_CLEANUP_CAPTURE_REJECTED",
    );
    const charge = await stripe.charges.retrieve(p.latest_charge);
    if (charge.amount_refunded < charge.amount) {
      const r = await stripe.refunds.create(
        { payment_intent: id, amount: charge.amount - charge.amount_refunded },
        { idempotencyKey: `s15-cleanup:${config.exerciseId}:${id}` },
      );
      invariant(
        r.payment_intent === id && r.status === "succeeded",
        "S15_ORIGINAL_METHOD_REFUND_UNCONFIRMED",
      );
      refunds.push(r.id);
      checkpoint("provider-refunded");
    }
  }
  if (config.webhookId) await stripe.webhookEndpoints.update(config.webhookId, { disabled: true });
  for (const actor of Object.values(actors))
    if (actor.token) await admin.auth.admin.signOut(actor.token, "global");
  if (baseline.length) {
    // Native quote issuance creates parent prices that a child-FK walk cannot discover.
    const nativePrices = await sql(productNativePriceRootsSql(tenant, ids.catalogue!));
    for (const [index, row] of nativePrices.entries()) ids[`nativePrice${index}`] = uuid(row.id);
    checkpoint("native-price-cleanup-roots-recorded");
    await sql(cleanupQuery(), false);
  }
  for (const actor of Object.values(actors)) {
    const result = await admin.auth.admin.deleteUser(actor.id);
    invariant(!result.error, "S15_AUTH_CLEANUP_FAILED");
  }
  const restored = productBaselineSchema.parse(
    await sql(readFileSync("scripts/sql/sprint-13-onboarding-baseline.sql", "utf8")),
  );
  invariant(
    JSON.stringify(restored) === JSON.stringify(baseline),
    "S15_APPLICATION_BASELINE_NOT_RESTORED",
  );
  const realAfter = (await sql("select id from auth.users order by id;")).map((row) =>
    String(row.id),
  );
  invariant(
    JSON.stringify(realAfter) === JSON.stringify(realAuthIds),
    "S15_REAL_AUTH_BASELINE_CHANGED",
  );
  invariant(
    activeVersion("meneer-health") === config.mainVersion &&
      activeVersion("meneer-product-rehearsal") === config.configurationVersion,
    "S15_UNEXPECTED_DEPLOYMENT_CHANGE",
  );
  cleaned = true;
  checkpoint(completed ? "completed-cleaned" : "failed-cleaned");
}
async function main() {
  invariant(
    activeVersion("meneer-health") === config.mainVersion &&
      activeVersion("meneer-product-rehearsal") === config.configurationVersion,
    "S15_EXPECTED_RELEASE_NOT_ACTIVE",
  );
  invariant((await stripe.accounts.retrieveCurrent()).id === account, "S15_ACCOUNT_MISMATCH");
  baseline = productBaselineSchema.parse(
    await sql(readFileSync("scripts/sql/sprint-13-onboarding-baseline.sql", "utf8")),
  );
  realAuthIds = (await sql("select id from auth.users order by id;")).map((row) => uuid(row.id));
  checkpoint("baseline-captured");
  try {
    for (const [name, role] of [
      ["patient", "patient"],
      ["operations", "operations"],
      ["alternate", "operations"],
      ["admin", "admin"],
      ["clinician", "clinician"],
      ["reviewer", "clinician"],
    ]) {
      const email = `s15-${name}-${config.exerciseId}@example.invalid`;
      const result = await admin.auth.admin.createUser({ email, email_confirm: true });
      invariant(!result.error && result.data.user, "S15_AUTH_CREATE_FAILED");
      const actor: Actor = { id: uuid(result.data.user.id), subject: "", email, role: role! };
      actors[name!] = actor;
      checkpoint("auth-created");
      actor.subject = uuid(
        (
          await sql(
            `select subject_id from public.external_identities where provider='supabase' and provider_subject='${actor.id}';`,
          )
        )[0]?.subject_id,
      );
      checkpoint("auth-linked");
    }
    await setup();
    await exercise();
  } catch (error) {
    failure = {
      stage,
      kind: error instanceof Error ? error.constructor.name : "Unknown",
      diagnostic:
        error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : undefined,
      code:
        error instanceof Error &&
        "code" in error &&
        typeof error.code === "string" &&
        /^[A-Z0-9_]+$/.test(error.code)
          ? error.code
          : undefined,
    };
    checkpoint("failed-awaiting-cleanup");
    throw error;
  } finally {
    await cleanup();
  }
  console.log(
    JSON.stringify({
      exercise: "sprint15-hosted-product-journey",
      completed,
      cleaned,
      proofs,
      providerCaptures: paymentIntents.length,
      originalMethodRefunds: refunds.length,
      realAccountsPreserved: realAuthIds.length,
      mainDeploymentPreserved: true,
      workerStillRestricted: true,
    }),
  );
}
await main().catch((error) => {
  console.error(
    JSON.stringify({
      error:
        error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
          ? error.message
          : "S15_REHEARSAL_FAILED",
      stage,
      fixtureSeeded,
      cleaned,
      completed,
      manifest: manifestPath,
      failure,
    }),
  );
  process.exitCode = 1;
});
