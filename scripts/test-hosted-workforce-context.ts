import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { workforceContextSchema } from "../src/application/identity/workforce-session-service";

// Separately authorised disposable acceptance only. No messages, pilot activation or real grants.
function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
const project = "gibfpolrdjotwvewgfsz";
const manifestPath = ".td043-workforce-rehearsal.local";
invariant(
  !existsSync(manifestPath) || JSON.parse(readFileSync(manifestPath, "utf8")).state === "cleaned",
  "HOSTED_WORKFORCE_PRIOR_EXERCISE_REQUIRES_RECONCILIATION",
);
invariant(
  process.env.HOSTED_WORKFORCE_CONTEXT_CONFIRM === "isolated-no-send-preserve-real-staff" &&
    process.env.SUPABASE_URL === `https://${project}.supabase.co` &&
    process.env.SUPABASE_SECRET_KEY &&
    readFileSync("supabase/.temp/project-ref", "utf8").trim() === project,
  "HOSTED_WORKFORCE_CONTEXT_GUARD_REJECTED",
);
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
function sql(query: string): Array<Record<string, unknown>> {
  try {
    const output = execFileSync(
      "bun",
      ["--no-env-file", "x", "supabase", "db", "query", "--linked", query],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 2 * 1024 * 1024,
      },
    );
    const start = output.indexOf("{");
    invariant(start >= 0, "HOSTED_WORKFORCE_SQL_RESULT_INVALID");
    return JSON.parse(output.slice(start)).rows;
  } catch {
    throw new Error("HOSTED_WORKFORCE_SQL_FAILED");
  }
}
const baselineQuery = `select n.nspname||'.'||c.relname as relation,
 ((xpath('/row/n/text()',x))[1]::text)::bigint as n,
 (xpath('/row/f/text()',x))[1]::text as fingerprint
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 cross join lateral query_to_xml(format('select count(*) n,md5(coalesce(string_agg(to_jsonb(t)::text,''|'' order by to_jsonb(t)::text),'''')) f from %s t',c.oid::regclass),false,true,'') x
 where c.relkind='r' and n.nspname in('public','identity_private','intake_private','commerce_private','audit_private','payments_private','fulfilment_private','lifecycle_private','measurement_private') order by relation;`;
const before = sql(baselineQuery);
const realAuthBefore = sql("select id::text from auth.users order by id;");
invariant(realAuthBefore.length === 4, "HOSTED_WORKFORCE_EXPECTED_FOUR_REAL_ACCOUNTS");
const tenant = crypto.randomUUID();
const approver = crypto.randomUUID();
const email = `td043-${crypto.randomUUID()}@example.invalid`;
let providerId: string | undefined;
let subject: string | undefined;
let cookie: string | undefined;
let fixtureSeeded = false;
function checkpoint(state: string) {
  writeFileSync(
    manifestPath,
    JSON.stringify({ state, tenant, approver, email, providerId, subject, fixtureSeeded }),
    { mode: 0o600 },
  );
}
function totp(secret: string): string {
  let bits = "";
  for (const character of secret.replaceAll("=", "").toUpperCase()) {
    const value = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(character);
    invariant(value >= 0, "HOSTED_WORKFORCE_FACTOR_INVALID");
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8)
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  return ((digest.readUInt32BE(digest[digest.length - 1]! & 15) & 0x7fffffff) % 1_000_000)
    .toString()
    .padStart(6, "0");
}
async function request(path: string, fields?: Record<string, string>, selectedCookie = cookie) {
  const response = await fetch(`https://meneerhealth.co.za/staff/${path}`, {
    method: fields ? "POST" : "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
    headers: {
      Origin: "https://meneerhealth.co.za",
      "Sec-Fetch-Site": "same-origin",
      ...(fields ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(selectedCookie ? { Cookie: selectedCookie } : {}),
    },
    body: fields ? new URLSearchParams(fields) : undefined,
  });
  invariant(
    response.headers.get("cache-control")?.includes("no-store"),
    "HOSTED_WORKFORCE_CACHE_INVALID",
  );
  return response;
}
function remember(response: Response) {
  const header = response.headers.get("set-cookie");
  invariant(header, "HOSTED_WORKFORCE_COOKIE_MISSING");
  invariant(
    header?.includes("HttpOnly") && header.includes("Secure") && header.includes("SameSite=Strict"),
    "HOSTED_WORKFORCE_COOKIE_INVALID",
  );
  cookie = header.split(";", 1)[0];
}
let completed = false;
try {
  checkpoint("creating-identity");
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  invariant(!created.error && created.data.user, "HOSTED_WORKFORCE_CREATE_FAILED");
  providerId = created.data.user.id;
  checkpoint("identity-created");
  invariant(/^[a-f0-9-]{36}$/.test(providerId), "HOSTED_WORKFORCE_ID_INVALID");
  subject = String(
    sql(
      `select subject_id from public.external_identities where provider='supabase' and provider_subject='${providerId}';`,
    )[0]?.subject_id ?? "",
  );
  invariant(/^[a-f0-9-]{36}$/.test(subject), "HOSTED_WORKFORCE_SUBJECT_INVALID");
  checkpoint("seeding-fixture");
  sql(`begin;
   insert into public.tenants(id,slug,display_name,status) values('${tenant}','td043-${tenant}','Synthetic workforce acceptance','active');
   insert into public.subjects(id) values('${approver}');
   insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
   select '${tenant}','${subject}',role,'active',clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour','${approver}'
   from unnest(array['operations','auditor','admin']) role;
   commit; select true as seeded;`);
  fixtureSeeded = true;
  checkpoint("testing");
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  invariant(!link.error, "HOSTED_WORKFORCE_LOCAL_CODE_FAILED");
  const verify = await request("sign-in", {
    action: "verify",
    email,
    code: link.data.properties.email_otp,
  });
  invariant(verify.status === 200, `HOSTED_WORKFORCE_VERIFY_${verify.status}`);
  remember(verify);
  const enrollment = z
    .object({ enrollment: z.object({ secret: z.string().min(1) }) })
    .parse(await verify.json()).enrollment;
  invariant((await request("session")).status === 401, "HOSTED_WORKFORCE_EMAIL_GRANTED_ACCESS");
  const mfa = await request("mfa", { code: totp(enrollment.secret) });
  invariant(mfa.status === 200, `HOSTED_WORKFORCE_MFA_${mfa.status}`);
  remember(mfa);
  const contexts = z
    .object({ contexts: z.array(workforceContextSchema).length(3) })
    .strict()
    .parse(await mfa.json()).contexts;
  invariant(
    Array.isArray(contexts) &&
      contexts.length === 3 &&
      contexts.every((context) => context.tenantId === tenant && context.subjectId === subject),
    "HOSTED_WORKFORCE_CONTEXTS_INVALID",
  );
  invariant(
    (await request("context", { tenantId: crypto.randomUUID(), role: "admin" })).status === 401,
    "HOSTED_WORKFORCE_WRONG_TENANT_GRANTED",
  );
  const selected = await request("context", { tenantId: tenant, role: "operations" });
  invariant(selected.status === 204, `HOSTED_WORKFORCE_SELECTION_${selected.status}`);
  remember(selected);
  const oldCookie = cookie;
  const session = await request("session");
  invariant(
    session.status === 200 &&
      z.object({ role: z.literal("operations") }).safeParse(await session.json()).success,
    "HOSTED_WORKFORCE_SESSION_INVALID",
  );
  invariant(
    (await request("session", { action: "renew" })).status === 204,
    "HOSTED_WORKFORCE_RENEW_FAILED",
  );
  invariant(
    (await request("context", { tenantId: tenant, role: "admin" })).status === 401,
    "HOSTED_WORKFORCE_REBIND_GRANTED",
  );
  invariant(
    (await request("sign-out", { action: "sign-out" })).status === 204,
    "HOSTED_WORKFORCE_SIGNOUT_FAILED",
  );
  invariant(
    (await request("session", undefined, oldCookie)).status === 401,
    "HOSTED_WORKFORCE_STALE_COOKIE_GRANTED",
  );
  completed = true;
  console.log(
    JSON.stringify({
      exercise: "hosted-workforce-context",
      genuineTotp: true,
      emailOnlyDenied: true,
      selectedContext: true,
      wrongTenantDenied: true,
      rebindDenied: true,
      staleCookieDenied: true,
      emailsSent: 0,
      realGrantsChanged: 0,
    }),
  );
} finally {
  // This exact generated .invalid identity only; never select real accounts for cleanup.
  if (providerId) {
    sql(`delete from auth.sessions where user_id='${providerId}'; select true as revoked;`);
    if (subject) {
      sql(`begin;
       lock table identity_private.workforce_context_selections in access exclusive mode;
       alter table identity_private.workforce_context_selections disable trigger workforce_context_selection_immutable;
       delete from identity_private.workforce_context_selections where subject_id='${subject}' and tenant_id='${tenant}';
       alter table identity_private.workforce_context_selections enable trigger workforce_context_selection_immutable;
       delete from public.identity_sessions where subject_id='${subject}';
       delete from public.tenant_memberships where subject_id='${subject}' and tenant_id='${tenant}';
       delete from public.subject_contacts where subject_id='${subject}';
       delete from public.external_identities where subject_id='${subject}' and provider_subject='${providerId}';
       delete from public.subjects where id='${subject}';
       ${fixtureSeeded ? `delete from public.subjects where id='${approver}'; delete from public.tenants where id='${tenant}';` : ""}
       commit; select true as cleaned;`);
    }
    const removed = await admin.auth.admin.deleteUser(providerId);
    invariant(!removed.error, "HOSTED_WORKFORCE_AUTH_CLEANUP_FAILED");
  }
  invariant(
    JSON.stringify(sql(baselineQuery)) === JSON.stringify(before),
    "HOSTED_WORKFORCE_APPLICATION_BASELINE_CHANGED",
  );
  invariant(
    JSON.stringify(sql("select id::text from auth.users order by id;")) ===
      JSON.stringify(realAuthBefore),
    "HOSTED_WORKFORCE_REAL_ACCOUNTS_CHANGED",
  );
  invariant(
    sql(
      "select tgenabled='O' as enabled from pg_trigger where tgname='workforce_context_selection_immutable';",
    )[0]?.enabled === true,
    "HOSTED_WORKFORCE_GUARD_NOT_RESTORED",
  );
  checkpoint("cleaned");
  console.log(
    JSON.stringify({
      exercise: "hosted-workforce-cleanup",
      exactApplicationBaseline: true,
      realAccountsPreserved: 4,
      immutableGuardRestored: true,
    }),
  );
}
invariant(completed, "HOSTED_WORKFORCE_ACCEPTANCE_INCOMPLETE");
