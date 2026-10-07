import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Explicitly authorised disposable rehearsal; credentials remain in memory.
const origin = "https://meneerhealth.co.za";
const project = "https://gibfpolrdjotwvewgfsz.supabase.co";
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
invariant(
  process.env.HOSTED_SUPPORT_REHEARSAL_CONFIRM === "isolated-synthetic-with-cleanup" &&
    process.env.SUPABASE_URL === project &&
    process.env.SUPABASE_SECRET_KEY,
  "HOSTED_SUPPORT_REHEARSAL_GUARD_REQUIRED",
);
const client = createClient(project, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const tenant = crypto.randomUUID();
const approver = crypto.randomUUID();
const publications = [crypto.randomUUID(), crypto.randomUUID()];
type Actor = { id: string; subject: string; email: string; cookie?: string };
const actors = new Map<string, Actor>();
function sql(query: string): Record<string, unknown>[] {
  let output: string;
  try {
    output = execFileSync("bunx", ["supabase", "db", "query", "--linked", query], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1024 * 1024,
    });
  } catch (error) {
    const stderr =
      error && typeof error === "object" && "stderr" in error ? String(error.stderr) : "";
    const stdout =
      error && typeof error === "object" && "stdout" in error ? String(error.stdout) : "";
    const diagnostic = (stderr + stdout)
      .replace(/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/gi, "[uuid]")
      .replace(/[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+/g, "[email]")
      .slice(-1500);
    const constraint = diagnostic
      .replaceAll("\\", "")
      .match(/constraint ["']([a-z0-9_]+)["']/i)?.[1];
    const code = stderr.match(/(?:SQLSTATE|code)["':\s]+([0-9A-Z]{5})/)?.[1];
    throw new Error(
      `HOSTED_SUPPORT_SQL_FAILED${constraint ? `_${constraint}` : ""}${code ? `_${code}` : ""}`,
    );
  }
  const start = output.indexOf("{");
  invariant(start >= 0, "HOSTED_SUPPORT_SQL_RESULT_INVALID");
  return (JSON.parse(output.slice(start)) as { rows: Record<string, unknown>[] }).rows;
}
function totp(secret: string) {
  let bits = "";
  for (const c of secret.replaceAll("=", "").toUpperCase()) {
    const n = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c);
    invariant(n >= 0, "FACTOR_INVALID");
    bits += n.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  return ((digest.readUInt32BE(digest[digest.length - 1]! & 15) & 0x7fffffff) % 1000000)
    .toString()
    .padStart(6, "0");
}
async function request(path: string, body: Record<string, unknown>, actor?: Actor, form = false) {
  const response = await fetch(origin + path, {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
    headers: {
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
      "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json",
      ...(actor?.cookie ? { Cookie: actor.cookie } : {}),
      ...(body.requestKey ? { "Idempotency-Key": String(body.requestKey) } : {}),
    },
    body: form ? new URLSearchParams(body as Record<string, string>) : JSON.stringify(body),
  });
  invariant(response.headers.get("cache-control")?.includes("no-store"), "CACHE_POLICY_FAILED");
  invariant(!response.headers.has("access-control-allow-origin"), "CORS_POLICY_FAILED");
  return response;
}
function remember(response: Response, actor: Actor) {
  const cookie = response.headers.get("set-cookie");
  invariant(
    cookie &&
      cookie.includes("HttpOnly") &&
      cookie.includes("Secure") &&
      cookie.includes("SameSite=Strict"),
    "COOKIE_INVALID",
  );
  actor.cookie = cookie.split(";", 1)[0];
}
async function login(role: string) {
  console.log(
    JSON.stringify({ stage: "hosted-sign-in", actorClass: role, credentialsLogged: false }),
  );
  const actor = actors.get(role)!;
  const link = await client.auth.admin.generateLink({ type: "magiclink", email: actor.email });
  invariant(!link.error && link.data.user.id === actor.id, "CODE_FAILED");
  const response = await request(
    role === "patient" ? "/account/sign-in" : "/staff/sign-in",
    { action: "verify", email: actor.email, code: link.data.properties.email_otp },
    undefined,
    true,
  );
  invariant(
    response.status === (role === "patient" ? 204 : 200),
    `LOGIN_STATUS_${response.status}`,
  );
  remember(response, actor);
  if (role !== "patient") {
    const result = (await response.json()) as { enrollment?: { secret: string } };
    invariant(result.enrollment?.secret, "MFA_ENROLLMENT_MISSING");
    const denied = await request("/staff/support/command", { action: "read" }, actor);
    invariant(denied.status === 401, "EMAIL_ONLY_ACCESS_GRANTED");
    const mfa = await request("/staff/mfa", { code: totp(result.enrollment.secret) }, actor, true);
    invariant(mfa.status === 204, `MFA_STATUS_${mfa.status}`);
    remember(mfa, actor);
  }
  console.log(
    JSON.stringify({
      stage: "hosted-sign-in-complete",
      actorClass: role,
      totp: role !== "patient",
    }),
  );
}
let prepared = false;
let completed = false;
try {
  const baseline = sql(
    "select (select count(*) from auth.users)=0 and (select count(*) from public.tenants)=1 and exists(select 1 from public.tenants where slug='meneer-pilot' and status='suspended') and (select count(*) from identity_private.support_cases)=0 and (select count(*) from audit_private.transactional_notifications)=0 as clean;",
  );
  invariant(baseline[0]?.clean === true, "HOSTED_BASELINE_CHANGED");
  for (const role of ["patient", "primary", "alternate", "wrong-purpose"]) {
    const email =
      role === "patient"
        ? "support@meneerhealth.co.za"
        : `s12-${role}-${crypto.randomUUID()}@example.invalid`;
    const created = await client.auth.admin.createUser({ email, email_confirm: true });
    invariant(!created.error && created.data.user, "CREATE_FAILED");
    actors.set(role, { id: created.data.user.id, email, subject: "" });
    const rows = sql(
      `select subject_id from public.external_identities where provider='supabase' and provider_subject='${created.data.user.id}';`,
    );
    invariant(typeof rows[0]?.subject_id === "string", "SUBJECT_MISSING");
    actors.get(role)!.subject = rows[0].subject_id;
  }
  const patient = actors.get("patient")!;
  const primary = actors.get("primary")!;
  const alternate = actors.get("alternate")!;
  sql(`begin;
    insert into public.tenants(id,slug,display_name) values('${tenant}','s12-support-${tenant}','Synthetic support rehearsal');
    insert into public.subjects(id) values('${approver}');
    insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id) values('${tenant}','${approver}','admin','active',now()-interval '1 hour',now()+interval '1 hour','${primary.subject}');
    ${[...actors].map(([role, a]) => `insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id) values('${tenant}','${a.subject}','${role === "patient" ? "patient" : role === "wrong-purpose" ? "auditor" : "operations"}','active',now()-interval '1 hour',now()+interval '1 hour','${approver}');`).join("\n")}
    insert into public.client_profiles(tenant_id,subject_id,given_name,family_name,mobile_e164) values('${tenant}','${patient.subject}','Synthetic','Support','+27820000128');
    insert into public.identity_invitations(tenant_id,contact_digest,intended_role,provider_subject,status,expires_at,accepted_by_subject_id,accepted_at,issued_by_subject_id,purpose,request_key,delivery_status,delivered_at) values('${tenant}',encode(extensions.digest(convert_to('${patient.email}','UTF8'),'sha256'),'hex'),'patient','${patient.id}','accepted',now()+interval '1 hour','${patient.subject}',now(),'${approver}','operations',gen_random_uuid(),'delivered',now());
    insert into public.pilot_account_lifecycle_events(tenant_id,subject_id,event_type,actor_subject_id,reason_code,idempotency_key,correlation_id) values('${tenant}','${patient.subject}','activated','${patient.subject}','synthetic_rehearsal',gen_random_uuid(),'synthetic-support');
    ${publications
      .map(
        (
          id,
          i,
        ) => `insert into public.pilot_instrument_publications(id,instrument_id,instrument_version,document_body,content_sha256,rendered_locator,approval_reference,approved_by_subject_id,approved_at,published_at,effective_at,expires_at) values('${id}','${i === 0 ? "pilot-account-terms" : "pilot-privacy-notice"}','128.0','Synthetic rehearsal only',repeat('0',64),'/account/activate','synthetic-not-legal-approval','${approver}',now()-interval '2 minutes',now()-interval '1 minute',now()-interval '1 minute',now()+interval '1 hour');
    insert into public.pilot_instrument_receipts(tenant_id,subject_id,publication_id,instrument_id,instrument_version,locale,content_sha256,action,assurance,idempotency_key,correlation_id) select '${tenant}','${patient.subject}',id,instrument_id,instrument_version,locale,content_sha256,'${i === 0 ? "accepted" : "acknowledged"}','aal1',gen_random_uuid(),'synthetic-support' from public.pilot_instrument_publications where id='${id}';`,
      )
      .join("\n")}
    insert into identity_private.support_routes(tenant_id,purpose,primary_subject_id,alternate_subject_id,starts_at,expires_at,roster_reference,mailbox_control_reference,receipt_reference,absence_reference,failure_reference,approved_by_subject_id,approval_reference,acknowledgement_minutes) values('${tenant}','complaint','${primary.subject}','${alternate.subject}',now()-interval '1 minute',now()+interval '1 hour',gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),'${approver}',gen_random_uuid(),1440);
    commit; select true as prepared;`);
  prepared = true;
  for (const role of actors.keys()) await login(role);
  const urgent = await request(
    "/portal/support/command",
    { action: "request", purpose: "clinical", urgent: true, requestKey: crypto.randomUUID() },
    patient,
  );
  invariant(
    urgent.status === 200 && ((await urgent.json()) as { outcome: string }).outcome === "emergency",
    "EMERGENCY_BOUNDARY_FAILED",
  );
  const empty = sql(
    `select (select count(*) from identity_private.support_cases where tenant_id='${tenant}')=0 and (select count(*) from audit_private.transactional_notifications where tenant_id='${tenant}')=0 as empty;`,
  );
  invariant(empty[0]?.empty === true, "EMERGENCY_CREATED_CASE_OR_NOTICE");
  const command = {
    action: "request",
    purpose: "complaint",
    urgent: false,
    requestKey: crypto.randomUUID(),
  };
  const submit = await request("/portal/support/command", command, patient);
  invariant(submit.status === 200, `SUBMIT_STATUS_${submit.status}`);
  const received = (await submit.json()) as { outcome: string; reference: string };
  invariant(received.outcome === "received", "SUPPORT_NOT_RECEIVED");
  const replay = await request("/portal/support/command", command, patient);
  invariant(
    replay.status === 200 &&
      ((await replay.json()) as { reference: string }).reference === received.reference,
    "REPLAY_FAILED",
  );
  const action = {
    action: "acknowledged",
    reference: received.reference,
    requestKey: crypto.randomUUID(),
  };
  const wrong = await request("/staff/support/command", action, actors.get("wrong-purpose"));
  invariant(wrong.status === 403, "WRONG_PURPOSE_GRANTED");
  const premature = await request(
    "/staff/support/command",
    { ...action, action: "resolved", requestKey: crypto.randomUUID() },
    primary,
  );
  if (premature.status !== 409) {
    const session = await fetch(origin + "/staff/session", {
      headers: { Cookie: primary.cookie! },
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
    });
    console.log(
      JSON.stringify({
        stage: "unexpected-resolution-diagnostic",
        httpStatus: premature.status,
        staffSessionStatus: session.status,
      }),
    );
    const probe =
      sql(`create function pg_temp.support_probe() returns text language plpgsql as $$declare c jsonb;begin
      select jsonb_build_object('tenantId','${tenant}','subjectId',s.subject_id,'sessionId',s.id,'providerSubject','${primary.id}','providerSessionId',s.provider_session_id,'verifiedEmail','${primary.email}','purpose','operations') into c from public.identity_sessions s where subject_id='${primary.subject}' order by issued_at desc limit 1;
      begin perform public.staff_support_command(c,jsonb_build_object('action','resolved','reference','${received.reference}','requestKey',gen_random_uuid()));
        raise exception using errcode='P0001',message='REHEARSAL_ROLLBACK';
      exception when others then return SQLSTATE;end;
    end$$; select pg_temp.support_probe() as guard_code;`);
    console.log(
      JSON.stringify({ stage: "database-guard-diagnostic", guardCode: probe[0]?.guard_code }),
    );
    const contexts = sql(
      `select jsonb_build_object('tenantId','${tenant}','subjectId',s.subject_id,'sessionId',s.id,'providerSubject','${primary.id}','providerSessionId',s.provider_session_id,'verifiedEmail','${primary.email}','purpose','operations') as context from public.identity_sessions s where subject_id='${primary.subject}' order by issued_at desc limit 1;`,
    );
    const rpc = await client.rpc("staff_support_command", {
      p_context: contexts[0]?.context,
      p_command: {
        action: "resolved",
        reference: received.reference,
        requestKey: crypto.randomUUID(),
      },
    });
    console.log(
      JSON.stringify({
        stage: "provider-rpc-diagnostic",
        rpcErrorCode: rpc.error?.code,
        rpcStatus: rpc.status,
      }),
    );
  }
  invariant(premature.status === 409, `PREMATURE_RESOLUTION_STATUS_${premature.status}`);
  sql(
    `update public.tenant_memberships set status='revoked' where tenant_id='${tenant}' and subject_id='${primary.subject}' and role='operations'; select true as revoked;`,
  );
  const ack = await request("/staff/support/command", action, alternate);
  invariant(ack.status === 200, `ALTERNATE_ACK_STATUS_${ack.status}`);
  const resolve = await request(
    "/staff/support/command",
    { ...action, action: "resolved", requestKey: crypto.randomUUID() },
    alternate,
  );
  invariant(resolve.status === 200, `RESOLVE_STATUS_${resolve.status}`);
  completed = true;
  console.log(
    JSON.stringify({
      exercise: "hosted-support-authenticated",
      realTotp: true,
      emergencyNoCaseOrNotice: true,
      replayDeduped: true,
      wrongPurposeDenied: true,
      resolutionRequiresAcknowledgement: true,
      alternateEscalation: true,
      resolved: true,
      notificationTransportProved: false,
      payloadLogged: false,
    }),
  );
} finally {
  for (const [role, actor] of actors) {
    if (!actor.cookie) continue;
    const response = await request(
      role === "patient" ? "/account/sign-out" : "/staff/sign-out",
      { action: "sign-out" },
      actor,
      true,
    );
    invariant(response.status === 204, "SESSION_REVOKE_FAILED");
  }
  const subjects = [...actors.values()].map((a) => a.subject).filter(Boolean);
  if (prepared) {
    const tables = [
      "audit_private.transactional_notifications",
      "identity_private.support_routes",
      "identity_private.support_cases",
      "identity_private.support_responses",
      "public.pilot_instrument_receipts",
      "public.pilot_account_lifecycle_events",
      "public.pilot_instrument_publications",
    ];
    const tableSql = tables.map((t) => `'${t}'::regclass`).join(",");
    sql(`begin;
      lock table ${tables.join(",")} in exclusive mode;
      create temporary table rehearsal_triggers as select tgrelid,tgname from pg_trigger
        where tgrelid in(${tableSql}) and not tgisinternal and (tgtype::int & 8)=8 and tgenabled='O';
      do $$declare r record;begin for r in select * from rehearsal_triggers loop
        execute format('alter table %s disable trigger %I',r.tgrelid::regclass,r.tgname);end loop;end$$;
      delete from audit_private.transactional_notifications where tenant_id='${tenant}';
      delete from identity_private.support_responses where case_id in(select id from identity_private.support_cases where tenant_id='${tenant}');
      delete from identity_private.support_cases where tenant_id='${tenant}';
      delete from identity_private.support_routes where tenant_id='${tenant}';
      delete from public.pilot_instrument_receipts where tenant_id='${tenant}';
      delete from public.pilot_account_lifecycle_events where tenant_id='${tenant}';
      delete from public.pilot_instrument_publications where id in('${publications[0]}','${publications[1]}');
      do $$declare r record;begin for r in select * from rehearsal_triggers loop
        execute format('alter table %s enable trigger %I',r.tgrelid::regclass,r.tgname);end loop;end$$;
      delete from public.client_profiles where tenant_id='${tenant}';
      delete from public.identity_invitations where tenant_id='${tenant}';
      delete from public.tenant_memberships where tenant_id='${tenant}';
      delete from public.tenants where id='${tenant}';
      delete from public.subjects where id='${approver}';
      commit; select true as cleaned;`);
  }
  if (subjects.length) {
    sql(`delete from public.identity_sessions where subject_id in(${subjects.map((s) => `'${s}'`).join(",")});
      delete from public.subjects where id in(${subjects.map((s) => `'${s}'`).join(",")}); select true as removed;`);
  }
  for (const actor of actors.values()) {
    const result = await client.auth.admin.deleteUser(actor.id);
    invariant(!result.error, "AUTH_CLEANUP_FAILED");
  }
  const restored = sql(
    "select (select count(*) from auth.users)=0 and (select count(*) from public.tenants)=1 and exists(select 1 from public.tenants where slug='meneer-pilot' and status='suspended') and (select count(*) from identity_private.support_cases)=0 and (select count(*) from audit_private.transactional_notifications)=0 as restored;",
  );
  invariant(restored[0]?.restored === true, "HOSTED_SUPPORT_BASELINE_NOT_RESTORED");
  console.log(
    JSON.stringify({ exercise: "hosted-support-cleanup", restored: true, sessionsRevoked: true }),
  );
}
invariant(completed, "HOSTED_SUPPORT_INCOMPLETE");
