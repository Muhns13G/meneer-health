import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { readSupabaseIntegrationEnvironment } from "./lib/supabase-integration-environment";
import { createSupabaseManagedIdentityProvider } from "../src/adapters/identity/supabase/supabase-managed-identity-provider";
import { SupabaseIdentitySessionRepository } from "../src/adapters/identity/supabase/supabase-identity-session-repository";
import { SupabaseWorkforceContextRepository } from "../src/adapters/identity/supabase/supabase-workforce-context-repository";
import { WorkforceSessionService } from "../src/application/identity/workforce-session-service";
import { workforceEnrollmentView } from "../src/lib/workforce-enrollment-view";
import { SupabaseQueueRepository } from "../src/adapters/persistence/supabase/supabase-queue-repository";
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
const caseId = crypto.randomUUID();
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
  invariant(
    workforceEnrollmentView.safeParse({
      enrollment: { qrCode: pending.enrollment.qrCode, secret: pending.enrollment.secret },
    }).success,
    "WORKFORCE_TEST_BROWSER_ENROLLMENT_RESPONSE_REJECTED",
  );
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
  localSql(`insert into public.operations_cases(id,tenant_id,subject_id)
    values('${caseId}','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001');
    insert into public.operations_assignments(tenant_id,case_id,subject_id,workforce_subject_id,granted_by_subject_id,starts_at,expires_at)
    values('10000000-0000-4000-8000-000000000001','${caseId}','20000000-0000-4000-8000-000000000001',
      '${subjectId}','20000000-0000-4000-8000-000000000003',now(),now()+interval '1 hour');`);
  const queue = new SupabaseQueueRepository(client);
  const identity = (await service.authorise(renewed.proof)).identity;
  const candidates = [crypto.randomUUID(), crypto.randomUUID()].map((requestKey) => ({
    action: "claim" as const,
    caseId,
    expectedVersion: 1,
    requestKey,
  }));
  const claims = await Promise.allSettled(
    candidates.map((command) => queue.command(identity, renewed.proof, command)),
  );
  invariant(
    claims.filter((result) => result.status === "fulfilled").length === 1 &&
      claims.filter((result) => result.status === "rejected").length === 1,
    "WORKFORCE_TEST_CONCURRENT_CLAIM_FAILED",
  );
  const winningIndex = claims.findIndex((result) => result.status === "fulfilled");
  const replays = await Promise.all([
    queue.command(identity, renewed.proof, candidates[winningIndex]!),
    queue.command(identity, renewed.proof, candidates[winningIndex]!),
  ]);
  invariant(
    replays.every((result) => result.version === 2 && result.claim === "yours"),
    "WORKFORCE_TEST_CONCURRENT_REPLAY_FAILED",
  );
  invariant(
    localSql(`select count(*) from public.operations_events where case_id='${caseId}';`) === "1",
    "WORKFORCE_TEST_DUPLICATE_AUDIT",
  );
  await denied(() =>
    queue.command(identity, renewed.proof, {
      action: "mark_ready",
      caseId,
      expectedVersion: 2,
      requestKey: crypto.randomUUID(),
    }),
  );
  await denied(() =>
    queue.handoff(identity, renewed.proof, {
      action: "prepare",
      caseId,
      expectedVersion: 2,
      requestKey: crypto.randomUUID(),
      authorisationId: crypto.randomUUID(),
    }),
  );
  await queue.command(identity, renewed.proof, {
    action: "release",
    caseId,
    expectedVersion: 2,
    requestKey: crypto.randomUUID(),
  });
  invariant(
    (await queue.detail(identity, renewed.proof, caseId)).claim === "unclaimed",
    "WORKFORCE_TEST_RELEASE_FAILED",
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

  // A second reviewed membership must not inherit the previous application's authority.
  localSql(`insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
    values('10000000-0000-4000-8000-000000000001','${subjectId}','auditor','active',now(),now()+interval '1 hour','20000000-0000-4000-8000-000000000003');`);
  const secondLink = await client.auth.admin.generateLink({ type: "magiclink", email });
  invariant(!secondLink.error, "WORKFORCE_TEST_SECOND_CODE_FAILED");
  const multiple = await service.verifyCode(email, secondLink.data.properties.email_otp);
  invariant(
    multiple.proof.contextChoiceRequired && !multiple.enrollment && !multiple.proof.sessionId,
    "WORKFORCE_TEST_MULTI_ROLE_GRANTED_ACCESS",
  );
  await denied(() => service.completeMfa(multiple.proof, "123456"));
  const choice = await service.completeMfaForContextChoice(
    multiple.proof,
    totp(pending.enrollment.secret),
  );
  invariant(
    choice.contexts.length === 2 && choice.proof.contextChoiceReady && !choice.proof.sessionId,
    "WORKFORCE_TEST_CONTEXT_CHOICES_FAILED",
  );
  await denied(() => service.authorise(choice.proof));
  await denied(() => service.selectContext(choice.proof, crypto.randomUUID(), "auditor"));
  // Competing selections for this exact provider session must bind only one membership.
  const selections = await Promise.allSettled([
    service.selectContext(choice.proof, choice.contexts[0]!.tenantId, "auditor"),
    service.selectContext(choice.proof, choice.contexts[0]!.tenantId, "operations"),
  ]);
  const successes = selections.filter((result) => result.status === "fulfilled");
  invariant(successes.length === 1, "WORKFORCE_TEST_CONTEXT_RACE_FAILED");
  const selected = successes[0]!;
  invariant(selected.status === "fulfilled", "WORKFORCE_TEST_CONTEXT_RESULT_FAILED");
  const selectedProof = selected.value.proof;
  invariant(
    (await service.authorise(selectedProof)).context.role === selectedProof.context.role,
    "WORKFORCE_TEST_SELECTED_CONTEXT_FAILED",
  );
  await denied(() => service.authorise(renewed.proof));
  await denied(() => service.selectContext(choice.proof, choice.contexts[0]!.tenantId, "admin"));
  await service.signOut(selectedProof);
  await denied(() => service.authorise(selectedProof));
} finally {
  // Only this generated .invalid fixture is removed; no hosted target is permitted.
  if (providerId) {
    localSql(`begin;
      -- Local-only, generated synthetic case cleanup; append-only definitions remain intact.
      lock table identity_private.operations_commands,public.operations_events in access exclusive mode;
      alter table identity_private.operations_commands disable trigger operations_commands_append_only;
      alter table public.operations_events disable trigger operations_events_append_only;
      delete from identity_private.operations_commands where case_id='${caseId}';
      delete from public.operations_events where case_id='${caseId}';
      alter table identity_private.operations_commands enable trigger operations_commands_append_only;
      alter table public.operations_events enable trigger operations_events_append_only;
      delete from public.operations_claims where case_id='${caseId}';
      delete from public.operations_assignments where case_id='${caseId}';
      delete from public.operations_cases where id='${caseId}';
      lock table identity_private.workforce_context_selections in access exclusive mode;
      alter table identity_private.workforce_context_selections disable trigger workforce_context_selection_immutable;
      delete from identity_private.workforce_context_selections where subject_id='${subjectId}';
      alter table identity_private.workforce_context_selections enable trigger workforce_context_selection_immutable;
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
  "Synthetic local workforce AAL2/session, concurrent context selection and queue claim/replay/release proof passed; fixtures removed.",
);
