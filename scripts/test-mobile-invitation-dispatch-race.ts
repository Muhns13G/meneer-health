import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { readSupabaseIntegrationEnvironment } from "./lib/supabase-integration-environment";
import {
  assertLocalMobileEnvironment,
  mobileSecurityBaselineSql,
  validateMobileSecurityBaseline,
} from "./lib/sprint14-security";
import { dispatchMobileInvitation } from "../src/server/identity/mobile-invitation-delivery-service";
import { mobileDeliveryClaimSchema } from "../src/application/identity/mobile-invitation-delivery";
assertLocalMobileEnvironment(process.env);
const environment = readSupabaseIntegrationEnvironment();
if (environment.target !== "local" || new URL(environment.API_URL).hostname !== "127.0.0.1")
  throw new Error("MOBILE_DISPATCH_LOCAL_ONLY");
const client = createClient(environment.API_URL, environment.SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
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
      { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], timeout: 60000 },
    ).trim();
  } catch {
    throw new Error("MOBILE_DISPATCH_SQL_FAILED");
  }
}
function invariant(value: unknown): asserts value {
  if (!value) throw new Error("MOBILE_DISPATCH_ASSERTION_FAILED");
}
invariant(
  sql(
    "select (select count(*) from auth.users)+(select count(*) from identity_private.mobile_invitations);",
  ) === "0",
);
const baseline = validateMobileSecurityBaseline(sql(mobileSecurityBaselineSql));
const tenant = crypto.randomUUID();
const reservationRequestKey = crypto.randomUUID();
let subject = "",
  invitation = "",
  prepared = false,
  calls = 0;
const source = readFileSync(
  "supabase/tests/database/mobile_invitation_delivery_intents.test.sql",
  "utf8",
);
const boundary = source.indexOf("select ok(relrowsecurity");
invariant(boundary > 0 && source.startsWith("begin;"));
const fixture = source
  .slice(0, boundary)
  // This committed fixture setup uses only its helpers, not TAP. Do not persist a test extension.
  .replace(/^create extension if not exists pgtap with schema extensions;\s*$/m, "")
  .replace(/^select no_plan\(\);\s*$/m, "")
  .replaceAll("10000000-0000-4000-8000-000000000001", tenant);
invariant(!/\bpgtap\b|\bno_plan\(/i.test(fixture));
const tables = [
  "identity_private.mobile_invitation_delivery_intents",
  "identity_private.mobile_invitation_send_reservations",
  "identity_private.mobile_invitation_commands",
  "identity_private.mobile_invitation_events",
  "identity_private.mobile_invitation_tokens",
  "identity_private.mobile_invitation_contacts",
  "identity_private.mobile_invitations",
  "identity_private.mobile_invitation_policies",
  "public.audit_events",
  "public.audit_chain_heads",
  "public.identity_sessions",
  "public.access_assignments",
  "public.tenant_memberships",
  "public.subject_contacts",
  "public.external_identities",
  "public.subjects",
  "public.tenants",
];
const guards = [
  ["identity_private.mobile_invitation_delivery_intents", "mobile_delivery_immutable"],
  ["identity_private.mobile_invitation_send_reservations", "mobile_reservations_immutable"],
  ["identity_private.mobile_invitation_commands", "mobile_commands_immutable"],
  ["identity_private.mobile_invitation_events", "mobile_event_immutable"],
  ["identity_private.mobile_invitation_tokens", "mobile_token_guard"],
  ["identity_private.mobile_invitation_contacts", "mobile_contact_guard"],
  ["identity_private.mobile_invitations", "mobile_invitation_guard"],
];
const auditGuard = sql(
  "select tgname from pg_trigger where tgrelid='public.audit_events'::regclass and not tgisinternal and tgfoid='audit_private.reject_append_only_mutation()'::regprocedure;",
);
invariant(/^[a-z_]+$/.test(auditGuard));
guards.push(["public.audit_events", auditGuard]);
try {
  const result = sql(
    fixture.replace(
      "begin;",
      `begin; insert into public.tenants(id,slug,display_name) values('${tenant}','synthetic-race-${tenant}','Synthetic dispatch race');`,
    ) +
      `
    insert into target_mobile(id) select (pg_temp.mobile_command(jsonb_build_object('action','create','requestKey',gen_random_uuid(),
      'givenName','Synthetic','familyName','Participant','phone','+27000000001','provenanceReference',gen_random_uuid(),'contactAuthorityReference',gen_random_uuid()))->>'invitationId')::uuid;
    do $$begin perform pg_temp.change_mobile('review',1,1); end$$;
    insert into identity_private.mobile_invitation_policies(tenant_id,daily_reservation_limit,sending_enabled,delivery_ready,provider_profile_id,from_phone,per_segment_usd_micros,per_message_usd_micros,daily_usd_micros)
      values('${tenant}',10,true,true,'a1440000-0000-4000-8000-000000000010','+999000000001',40000,80000,80000);
    do $$begin perform pg_temp.mobile_command(jsonb_build_object('action','send','requestKey','${reservationRequestKey}'::uuid,'invitationId',(select id from target_mobile),'expectedVersion',1)); end$$;
    select (select subject_id from mobile_actor)::text||':'||(select id from target_mobile)::text;
    commit;`,
  );
  [subject, invitation] = result.split(":");
  prepared = true;
  invariant(/^[a-f0-9-]{36}$/.test(subject) && /^[a-f0-9-]{36}$/.test(invitation));
  const authority = {
    p_provider_subject: "a1440000-0000-4000-8000-000000000001",
    p_provider_session_id: "a1440000-0000-4000-8000-000000000002",
    p_verified_email: "mobile-delivery@example.invalid",
    p_session_id: "a1440000-0000-4000-8000-000000000003",
    p_subject_id: subject,
    p_tenant_id: tenant,
  };
  const request = {
    invitationId: invitation,
    expectedVersion: 1,
    reservationRequestKey,
  };
  const configuration = {
    MOBILE_INVITATIONS_MODE: "telnyx" as const,
    MOBILE_INVITATIONS_US_DELIVERY_READY: "false" as const,
    MOBILE_INVITATIONS_DELIVERY_READY: "true" as const,
    MOBILE_INVITATIONS_TENANT_ID: tenant,
    TELNYX_API_KEY: "synthetic-unused-key-only",
    TELNYX_MESSAGING_PROFILE_ID: "a1440000-0000-4000-8000-000000000010",
    TELNYX_FROM_NUMBER: "+999000000001",
  };
  const repository = {
    async prepare(_request: typeof request, digest: string) {
      const { data, error } = await client.rpc("prepare_mobile_invitation_delivery", {
        ...authority,
        p_invitation_id: invitation,
        p_expected_version: 1,
        p_reservation_request_key: request.reservationRequestKey,
        p_token_digest: digest,
        p_profile_id: configuration.TELNYX_MESSAGING_PROFILE_ID,
        p_from_phone: configuration.TELNYX_FROM_NUMBER,
      });
      invariant(!error);
      return data === null ? null : mobileDeliveryClaimSchema.parse(data);
    },
    async finish(attemptId: string) {
      const { data, error } = await client.rpc("finish_mobile_invitation_delivery", {
        ...authority,
        p_attempt_id: attemptId,
        p_outcome: "uncertain",
        p_provider_message_id: null,
      });
      invariant(!error && data === true);
    },
  };
  const sender = {
    async send() {
      calls++;
      return { outcome: "uncertain" as const, providerMessageId: null };
    },
  };
  // Drain every request even on a failed assertion before locking tables for cleanup.
  const settled = await Promise.allSettled(
    Array.from({ length: 8 }, () =>
      dispatchMobileInvitation(request, configuration, repository, sender),
    ),
  );
  invariant(settled.every((result) => result.status === "fulfilled"));
  const results = settled.map((result) => {
    if (result.status !== "fulfilled") throw new Error("MOBILE_DISPATCH_RPC_FAILED");
    return result.value;
  });
  invariant(
    calls === 1 &&
      results.filter((r) => r.outcome === "uncertain").length === 1 &&
      results.filter((r) => r.outcome === "already_attempted").length === 7,
  );
  invariant(
    sql(
      `select count(*)::text||':'||sum(reserved_usd_micros)::text from identity_private.mobile_invitation_delivery_intents where tenant_id='${tenant}';`,
    ) === "1:80000",
  );
  invariant(
    (await dispatchMobileInvitation(request, configuration, repository, sender)).outcome ===
      "already_attempted" && calls === 1,
  );
} finally {
  if (prepared) {
    sql(`begin; lock table ${tables.join(",")} in access exclusive mode;
      ${guards.map(([t, g]) => `alter table ${t} disable trigger ${g};`).join("\n")}
      delete from identity_private.mobile_invitation_delivery_intents where tenant_id='${tenant}';
      delete from identity_private.mobile_invitation_send_reservations where tenant_id='${tenant}';
      delete from identity_private.mobile_invitation_commands where tenant_id='${tenant}';
      delete from identity_private.mobile_invitation_events where tenant_id='${tenant}';
      delete from identity_private.mobile_invitation_tokens where tenant_id='${tenant}';
      delete from identity_private.mobile_invitation_contacts where tenant_id='${tenant}';
      delete from identity_private.mobile_invitations where tenant_id='${tenant}';
      delete from identity_private.mobile_invitation_policies where tenant_id='${tenant}';
      delete from public.audit_events where tenant_id='${tenant}';
      ${guards.map(([t, g]) => `alter table ${t} enable trigger ${g};`).join("\n")}
      delete from public.audit_chain_heads where tenant_id='${tenant}';
      delete from public.access_assignments where tenant_id='${tenant}';
      delete from public.tenant_memberships where tenant_id='${tenant}';
      delete from public.identity_sessions where subject_id='${subject}';
      update auth.sessions set not_after=clock_timestamp() where user_id='a1440000-0000-4000-8000-000000000001';
      delete from auth.users where id='a1440000-0000-4000-8000-000000000001';
      delete from public.subject_contacts where subject_id='${subject}';
      delete from public.external_identities where subject_id='${subject}';
      delete from public.subjects where id='${subject}';
      delete from public.tenants where id='${tenant}'; commit;`);
    invariant(validateMobileSecurityBaseline(sql(mobileSecurityBaselineSql)) === baseline);
  }
}
console.log(
  JSON.stringify({
    exercise: "local-mobile-dispatch-race",
    competingRequests: 8,
    transportCalls: 1,
    spendReservations: 1,
    uncertainHeld: true,
    blindRetry: false,
    baselineRestored: true,
    smsSent: 0,
    hosted: false,
  }),
);
