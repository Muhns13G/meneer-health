import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { readSupabaseIntegrationEnvironment } from "./lib/supabase-integration-environment";
import { createSupabaseManagedIdentityProvider } from "../src/adapters/identity/supabase/supabase-managed-identity-provider";
import { SupabaseIdentitySessionRepository } from "../src/adapters/identity/supabase/supabase-identity-session-repository";
import { SupabaseWorkforceContextRepository } from "../src/adapters/identity/supabase/supabase-workforce-context-repository";
import { WorkforceSessionService } from "../src/application/identity/workforce-session-service";
import {
  sealWorkforceProof,
  openWorkforceProof,
} from "../src/server/identity/workforce-session-cookie";

function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function localSql(sql: string) {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_meneer-health-local",
      "psql",
      "-U",
      "postgres",
      "-X",
      "-qAt",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    {
      input: sql,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  ).trim();
}
function totp(secret: string) {
  let bits = "";
  for (const c of secret.replaceAll("=", "").toUpperCase()) {
    const n = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c);
    invariant(n >= 0, "WORKFORCE_TEST_FACTOR_INVALID");
    bits += n.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  const offset = digest[digest.length - 1]! & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
}
async function denied(action: () => Promise<unknown>) {
  let rejected = false;
  try {
    await action();
  } catch {
    rejected = true;
  }
  invariant(rejected, "WORKFORCE_TEST_EXPECTED_DENIAL");
}
const environment = readSupabaseIntegrationEnvironment();
invariant(environment.target === "local", "WORKFORCE_EXERCISE_LOCAL_ONLY");
const client = createClient(environment.API_URL, environment.SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const provider = createSupabaseManagedIdentityProvider({
  url: environment.API_URL,
  secretKey: environment.SECRET_KEY,
});
const service = new WorkforceSessionService(
  provider,
  new SupabaseWorkforceContextRepository(client),
  new SupabaseIdentitySessionRepository(client),
);
const email = `synthetic-workforce-${crypto.randomUUID()}@example.invalid`;
let providerId: string | undefined;
let subjectId: string | undefined;
try {
  const created = await client.auth.admin.createUser({ email, email_confirm: true });
  invariant(!created.error && created.data.user, "WORKFORCE_TEST_CREATE_FAILED");
  providerId = created.data.user.id;
  invariant(/^[a-f0-9-]{36}$/.test(providerId), "WORKFORCE_TEST_ID_INVALID");
  subjectId = localSql(
    `select subject_id from public.external_identities where provider='supabase' and provider_subject='${providerId}';`,
  );
  invariant(/^[a-f0-9-]{36}$/.test(subjectId), "WORKFORCE_TEST_MAPPING_INVALID");
  localSql(`insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
    values('10000000-0000-4000-8000-000000000001','${subjectId}','operations','active',now(),now()+interval '1 hour','20000000-0000-4000-8000-000000000003');`);
  const link = await client.auth.admin.generateLink({ type: "magiclink", email });
  invariant(!link.error, "WORKFORCE_TEST_CODE_FAILED");
  const pending = await service.verifyCode(email, link.data.properties.email_otp);
  invariant(pending.enrollment && !pending.proof.sessionId, "WORKFORCE_TEST_EMAIL_GRANTED_ACCESS");
  await denied(() => service.authorise(pending.proof));
  const complete = await service.completeMfa(pending.proof, totp(pending.enrollment.secret));
  const cookieKey = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64");
  const cookie = await sealWorkforceProof(
    complete.proof,
    complete.session.absoluteExpiresAt,
    cookieKey,
  );
  invariant(
    (
      await openWorkforceProof(
        new Request("https://example.invalid/staff/session", {
          headers: { cookie: cookie.split(";", 1)[0]! },
        }),
        cookieKey,
      )
    )?.sessionId === complete.session.id,
    "WORKFORCE_TEST_REAL_COOKIE_FAILED",
  );
  invariant(
    complete.session.assurance === "aal2" && complete.session.sessionClass === "workforce",
    "WORKFORCE_TEST_AAL2_FAILED",
  );
  invariant(
    (await provider.listWorkforceTotp(complete.proof.providerSession)).length === 1,
    "WORKFORCE_TEST_FACTOR_NOT_VERIFIED",
  );
  invariant(
    (await service.authorise(complete.proof)).context.role === "operations",
    "WORKFORCE_TEST_CONTEXT_FAILED",
  );
  const renewed = await service.renew(complete.proof);
  invariant(
    renewed.session.id === complete.session.id &&
      renewed.session.absoluteExpiresAt.getTime() === complete.session.absoluteExpiresAt.getTime(),
    "WORKFORCE_TEST_RENEW_EXTENDED_SESSION",
  );
  await denied(() =>
    service.invite(renewed.proof, "unapproved@example.invalid", crypto.randomUUID()),
  );
  localSql(
    `update public.tenant_memberships set status='revoked' where subject_id='${subjectId}';`,
  );
  await denied(() => service.authorise(renewed.proof));
  localSql(`update public.tenant_memberships set status='active' where subject_id='${subjectId}';`);
  await service.signOut(renewed.proof);
  await denied(() => service.authorise(renewed.proof));
} finally {
  // Only this generated .invalid fixture is removed; no hosted target is permitted.
  if (providerId) {
    localSql(`begin;
      delete from public.identity_sessions where subject_id=(select subject_id from public.external_identities where provider='supabase' and provider_subject='${providerId}');
      delete from public.tenant_memberships where subject_id=(select subject_id from public.external_identities where provider='supabase' and provider_subject='${providerId}');
      delete from public.subject_contacts where subject_id=(select subject_id from public.external_identities where provider='supabase' and provider_subject='${providerId}');
      delete from public.external_identities where provider='supabase' and provider_subject='${providerId}';
      delete from auth.users where id='${providerId}' and email like 'synthetic-workforce-%@example.invalid';
      ${subjectId ? `delete from public.subjects where id='${subjectId}';` : ""}
      commit;`);
  }
}
console.log(
  "Synthetic local workforce email/TOTP/context/renewal/revocation proof passed; fixture removed.",
);
