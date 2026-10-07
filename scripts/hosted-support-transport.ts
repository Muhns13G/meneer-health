import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  notificationClaimSchema,
  type NotificationClaim,
} from "../src/application/notifications/transactional-notifications";
import { sendTransactionalNotification } from "../src/server/notifications/notification-dispatch";

type Actor = { id: string; subject: string; email: string; cookie?: string };
type Binding = { name: string; type: string; [key: string]: unknown };
function requireProof(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

// Only called inside the expressly authorised disposable support rehearsal.
export async function exerciseSupportTransport(input: {
  client: SupabaseClient;
  tenant: string;
  patient: Actor;
  alternate: Actor;
  wrong: Actor;
  sql: (query: string) => Record<string, unknown>[];
  request: (
    path: string,
    body: Record<string, unknown>,
    actor?: Actor,
    form?: boolean,
  ) => Promise<Response>;
}) {
  const { client, tenant, patient, alternate, wrong, sql, request } = input;
  const apiKey = process.env.BREVO_API_KEY?.trim();
  requireProof(apiKey && apiKey.startsWith("xkeysib-"), "BREVO_API_KEY_REQUIRED");
  async function rpc(name: string, args: Record<string, unknown>) {
    const { data, error } = await client.rpc(name, args).abortSignal(AbortSignal.timeout(20000));
    requireProof(!error, `TRANSPORT_RPC_FAILED_${name}`);
    return data;
  }
  async function claim() {
    return notificationClaimSchema.parse(
      await rpc("claim_transactional_notification", { p_tenant_id: tenant }),
    );
  }
  async function finish(c: NotificationClaim, outcome: string) {
    requireProof(
      (await rpc("finish_transactional_notification", {
        p_tenant_id: tenant,
        p_notification_id: c.notificationId,
        p_lease_id: c.leaseId,
        p_outcome: outcome,
      })) === true,
      "TRANSPORT_FINISH_FAILED",
    );
  }
  async function follow(c: NotificationClaim, action: string, actor = alternate) {
    return request(
      "/staff/support/followup",
      {
        action,
        reference: c.notificationId,
        requestKey: crypto.randomUUID(),
        reason:
          action === "acknowledged"
            ? "review_started"
            : action === "resolved"
              ? "secure_followup_completed"
              : "confirmed_non_acceptance",
      },
      actor,
    );
  }
  const retry = await claim();
  const retryOutcome = await sendTransactionalNotification(
    apiKey,
    retry,
    async () => new Response(null, { status: 429 }),
  );
  requireProof(retryOutcome === "retryable", "FAULT_RETRY_CLASSIFICATION_FAILED");
  await finish(retry, retryOutcome);
  const uncertain = await claim();
  requireProof(uncertain.notificationId !== retry.notificationId, "BACKOFF_BYPASSED");
  await finish(
    uncertain,
    await sendTransactionalNotification(apiKey, uncertain, async () => {
      throw new Error("SYNTHETIC_TRANSPORT_TIMEOUT");
    }),
  );
  const failed = await claim();
  await finish(
    failed,
    await sendTransactionalNotification(
      apiKey,
      failed,
      async () => new Response(null, { status: 400 }),
    ),
  );
  requireProof((await follow(failed, "resolved")).status === 409, "FOLLOWUP_ORDER_FAILED");
  requireProof(
    (await follow(failed, "acknowledged", wrong)).status === 403,
    "FOLLOWUP_PURPOSE_FAILED",
  );
  requireProof((await follow(uncertain, "acknowledged")).status === 200, "UNCERTAINTY_ACK_FAILED");
  requireProof((await follow(uncertain, "resend")).status === 409, "UNCERTAINTY_RESENT");
  requireProof((await follow(uncertain, "resolved")).status === 200, "UNCERTAINTY_REVIEW_FAILED");
  requireProof((await follow(failed, "acknowledged")).status === 200, "FAILURE_ACK_FAILED");
  // Explicit synthetic suppression fixture; never fabricate a provider callback or live consent.
  sql(
    `insert into audit_private.transactional_suppressions(tenant_id,subject_id,reason) values('${tenant}','${patient.subject}','recipient_requested'); select true as prepared;`,
  );
  requireProof((await follow(failed, "resend")).status === 409, "SUPPRESSION_OVERRIDDEN");
  sql(`begin; lock table audit_private.transactional_suppressions in exclusive mode;
    alter table audit_private.transactional_suppressions disable trigger transactional_suppressions_immutable;
    delete from audit_private.transactional_suppressions where tenant_id='${tenant}' and subject_id='${patient.subject}' and reason='recipient_requested';
    alter table audit_private.transactional_suppressions enable trigger transactional_suppressions_immutable;
    commit; select true as removed;`);
  requireProof((await follow(failed, "resend")).status === 200, "BOUNDED_RESEND_FAILED");

  function cloudflareToken() {
    const authFile = readFileSync(
      "/Users/mansoergallie/Library/Preferences/.wrangler/config/default.toml",
      "utf8",
    );
    const token = authFile.match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
    requireProof(token, "CLOUDFLARE_AUTH_REQUIRED");
    return token;
  }
  const cfUrl =
    "https://api.cloudflare.com/client/v4/accounts/b45542b7bab5ef436344304eee963358/workers/scripts/meneer-health/settings";
  async function cf(method: string, body?: FormData, url = cfUrl) {
    const send = () =>
      fetch(url, {
        method,
        headers: { Authorization: `Bearer ${cloudflareToken()}` },
        body,
        signal: AbortSignal.timeout(30000),
      });
    let response = await send();
    if (response.status === 401) {
      await response.body?.cancel();
      // Refresh existing authorised OAuth credentials, never initiate a new login.
      execFileSync("bunx", ["wrangler", "whoami"], { stdio: "pipe", timeout: 30000 });
      response = await send();
    }
    const parsed = (await response.json()) as {
      success: boolean;
      result: { bindings: Binding[] };
      errors?: { code: number }[];
    };
    requireProof(
      response.ok && parsed.success,
      `CLOUDFLARE_SETTINGS_FAILED_${response.status}_${parsed.errors?.[0]?.code ?? "unknown"}`,
    );
    return parsed.result;
  }
  const original = await cf("GET");
  requireProof(
    original.bindings.find((b) => b.name === "TRANSACTIONAL_NOTIFICATIONS_MODE")?.text ===
      "disabled" &&
      !original.bindings.some((b) =>
        [
          "TRANSACTIONAL_NOTIFICATIONS_TENANT_ID",
          "TRANSACTIONAL_NOTIFICATION_WEBHOOK_SECRET",
        ].includes(b.name),
      ),
    "NOTIFICATION_CONFIGURATION_BASELINE_CHANGED",
  );
  const inherited = original.bindings.map((b) =>
    b.type === "secret_text" ? { name: b.name, type: "inherit" } : b,
  );
  const webhookKey = randomBytes(32).toString("base64url");
  async function settings(bindings: Binding[]) {
    const form = new FormData();
    form.set("settings", JSON.stringify({ bindings }));
    await cf("PATCH", form);
  }
  let configurationAttempted = false;
  try {
    const deliveryPayloads: Record<string, unknown>[] = [];
    const acceptedReferences = new Set<string>();
    async function callback(payload: Record<string, unknown>, authenticated = true) {
      return fetch("https://meneerhealth.co.za/api/notifications/brevo/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authenticated ? { "x-meneer-notification-secret": webhookKey } : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });
    }
    for (let index = 0; index < 2; index++) {
      // Wait for the real 60-second retry deadline; never rewrite the cursor or bypass backoff.
      let data = await rpc("claim_transactional_notification", { p_tenant_id: tenant });
      for (let wait = 0; data === null && wait < 7; wait++) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        data = await rpc("claim_transactional_notification", { p_tenant_id: tenant });
      }
      requireProof(data !== null, "RETRY_CLAIM_NOT_AVAILABLE_AFTER_BACKOFF");
      const c = notificationClaimSchema.parse(data);
      requireProof(c.recipient === "support@meneerhealth.co.za", "RECIPIENT_OUT_OF_SCOPE");
      let providerMessage = "";
      const outcome = await sendTransactionalNotification(
        apiKey,
        c,
        async (url, options) => {
          const response = await fetch(url, options);
          if (response.status === 201) {
            providerMessage = ((await response.clone().json()) as { messageId: string }).messageId;
          }
          return response;
        },
        async (messageHash) => {
          requireProof(
            (await rpc("bind_transactional_message", {
              p_tenant_id: tenant,
              p_notification_id: c.notificationId,
              p_lease_id: c.leaseId,
              p_message_hash: messageHash,
            })) === true,
            "MESSAGE_BINDING_FAILED",
          );
        },
      );
      await finish(c, outcome);
      requireProof(outcome === "accepted" && providerMessage, "REAL_PROVIDER_SEND_FAILED");
      const acceptedReference = providerMessage.trim().replace(/^<|>$/g, "");
      requireProof(!acceptedReferences.has(acceptedReference), "PROVIDER_REFERENCE_REUSED");
      acceptedReferences.add(acceptedReference);
      await finish(c, "accepted");
      const changedFinish = await client
        .rpc("finish_transactional_notification", {
          p_tenant_id: tenant,
          p_notification_id: c.notificationId,
          p_lease_id: c.leaseId,
          p_outcome: "failed",
        })
        .abortSignal(AbortSignal.timeout(15000));
      requireProof(
        changedFinish.status === 409 && changedFinish.error?.code === "PT409",
        "COMPLETION_CONFLICT_RETRIED",
      );
      const changedBinding = await client
        .rpc("bind_transactional_message", {
          p_tenant_id: tenant,
          p_notification_id: c.notificationId,
          p_lease_id: c.leaseId,
          p_message_hash: "b".repeat(64),
        })
        .abortSignal(AbortSignal.timeout(15000));
      requireProof(
        changedBinding.status === 409 && changedBinding.error?.code === "PT409",
        "BINDING_CONFLICT_RETRIED",
      );
      type Delivery = { event: string; messageId: string; date: string; email: string };
      let delivery: Delivery | undefined;
      for (let attempt = 0; attempt < 36 && !delivery; attempt++) {
        const url = new URL("https://api.brevo.com/v3/smtp/statistics/events");
        url.search = new URLSearchParams({
          // Bound the provider's eventually indexed report to this accepted reference.
          // A mailbox confirmation alone must never manufacture an attributed receipt.
          email: "support@meneerhealth.co.za",
          messageId: providerMessage,
          days: "1",
          limit: "100",
          sort: "desc",
        }).toString();
        const response = await fetch(url, {
          headers: { "api-key": apiKey, "Cache-Control": "no-cache" },
          signal: AbortSignal.timeout(15000),
        });
        requireProof(response.ok, "PROVIDER_DELIVERY_QUERY_FAILED");
        const events = (await response.json()) as { events?: Delivery[] };
        delivery = events.events?.find(
          (e) =>
            e?.event === "delivered" &&
            e.messageId.trim().replace(/^<|>$/g, "") ===
              providerMessage.trim().replace(/^<|>$/g, "") &&
            e.email === patient.email,
        );
        if (!delivery && attempt === 0) {
          console.log(
            JSON.stringify({
              stage: "delivery-report-projection",
              index,
              recentEventCount: events.events?.length ?? 0,
              exactReferencePresent:
                events.events?.some(
                  (e) =>
                    e.messageId.trim().replace(/^<|>$/g, "") ===
                    providerMessage.trim().replace(/^<|>$/g, ""),
                ) ?? false,
              recipientMatches: events.events?.some((e) => e.email === patient.email) ?? false,
              identifiersLogged: false,
            }),
          );
        }
        if (!delivery && attempt > 0 && attempt % 6 === 0) {
          console.log(
            JSON.stringify({
              stage: "provider-index-wait",
              index,
              elapsedSeconds: attempt * 5,
              matchingAcceptance:
                events.events?.some(
                  (e) =>
                    e.event === "requests" &&
                    e.messageId.trim().replace(/^<|>$/g, "") === acceptedReference,
                ) ?? false,
              identifiersLogged: false,
            }),
          );
        }
        if (!delivery) await new Promise((resolve) => setTimeout(resolve, 5000));
      }
      requireProof(delivery, "PROVIDER_DELIVERY_NOT_CONFIRMED");
      const payload = {
        event: "delivered",
        "message-id": providerMessage,
        ts_event: Math.floor(Date.parse(delivery.date) / 1000),
      };
      deliveryPayloads.push(payload);
      console.log(JSON.stringify({ stage: "provider-support-delivery", index, delivered: true }));
    }
    // All sends are settled before enabling callbacks: the cron has nothing to race for.
    configurationAttempted = true;
    await settings([
      ...inherited.filter((b) => b.name !== "TRANSACTIONAL_NOTIFICATIONS_MODE"),
      { name: "TRANSACTIONAL_NOTIFICATIONS_MODE", type: "plain_text", text: "brevo" },
      { name: "TRANSACTIONAL_NOTIFICATIONS_TENANT_ID", type: "plain_text", text: tenant },
      { name: "TRANSACTIONAL_NOTIFICATION_WEBHOOK_SECRET", type: "secret_text", text: webhookKey },
    ]);
    const enabled = await cf("GET");
    requireProof(
      enabled.bindings.find((b) => b.name === "TRANSACTIONAL_NOTIFICATIONS_MODE")?.text ===
        "brevo" &&
        enabled.bindings.find((b) => b.name === "TRANSACTIONAL_NOTIFICATIONS_TENANT_ID")?.text ===
          tenant,
      "NOTIFICATION_CONFIG_ENABLE_FAILED",
    );
    console.log(JSON.stringify({ stage: "synthetic-notification-config", enabled: true }));
    let readiness = await callback({}, false);
    // A published binding version can precede propagation to the canonical origin.
    // Probe only the unauthenticated denial; do not ingest evidence until it is ready.
    for (let attempt = 0; readiness.status === 404 && attempt < 18; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      readiness = await callback({}, false);
      if (attempt % 6 === 0) {
        console.log(JSON.stringify({ stage: "callback-propagation", status: readiness.status }));
      }
    }
    requireProof(readiness.status === 401, `CALLBACK_AUTH_STATUS_${readiness.status}`);
    requireProof((await callback({ event: "opened" })).status === 400, "TRACKING_EVENT_ACCEPTED");
    for (const payload of deliveryPayloads) {
      requireProof((await callback(payload)).status === 204, "HOSTED_DELIVERY_RECEIPT_FAILED");
      requireProof((await callback(payload)).status === 204, "HOSTED_DELIVERY_REPLAY_FAILED");
    }
    const view = await request("/staff/support/followup", { action: "read" }, alternate);
    requireProof(view.status === 200, "FOLLOWUP_READ_FAILED");
    const notices = ((await view.json()) as { notifications: { state: string }[] }).notifications;
    requireProof(
      notices.filter((n) => n.state === "delivered").length === 2,
      "DELIVERY_VIEW_FAILED",
    );
    const facts = sql(
      `select count(*)::int as facts from audit_private.transactional_provider_deliveries p join audit_private.transactional_attempts a on a.lease_id=p.lease_id join audit_private.transactional_notifications n on n.id=a.notification_id where n.tenant_id='${tenant}';`,
    );
    requireProof(facts[0]?.facts === 2, "DELIVERY_FACT_REPLAY_DUPLICATED");
    console.log(
      JSON.stringify({
        exercise: "hosted-support-transport",
        injectedFailures: true,
        backoffRetained: true,
        uncertaintyResendDenied: true,
        staffFollowup: true,
        realProviderDeliveries: 2,
        attributedReceiptReplay: true,
        automaticProviderWebhookConfigured: false,
      }),
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        stage: "transport-boundary-failed",
        code:
          error instanceof Error
            ? error.message.replace(/[^A-Z0-9_]/g, "").slice(0, 120)
            : "UNKNOWN",
      }),
    );
    throw error;
  } finally {
    if (configurationAttempted) {
      await settings(inherited);
      // Settings PATCH preserves omitted secrets; explicitly remove only our new secret.
      const state = await cf("GET");
      if (state.bindings.some((b) => b.name === "TRANSACTIONAL_NOTIFICATION_WEBHOOK_SECRET")) {
        await cf(
          "DELETE",
          undefined,
          cfUrl.replace(/\/settings$/, "/secrets/TRANSACTIONAL_NOTIFICATION_WEBHOOK_SECRET"),
        );
      }
      const restored = await cf("GET");
      requireProof(
        JSON.stringify(restored.bindings.map((b) => [b.name, b.type]).sort()) ===
          JSON.stringify(original.bindings.map((b) => [b.name, b.type]).sort()) &&
          restored.bindings.find((b) => b.name === "TRANSACTIONAL_NOTIFICATIONS_MODE")?.text ===
            "disabled",
        "NOTIFICATION_CONFIG_RESTORE_FAILED",
      );
      console.log(
        JSON.stringify({ stage: "synthetic-notification-config", restoredDisabled: true }),
      );
    }
  }
}
