import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { refundViewSchema } from "../../src/domain/payments/refund";
import type { HostedBridgePorts } from "./sprint13-hosted-bridge";
import { notificationClaimSchema } from "../../src/application/notifications/transactional-notifications";
import { sendTransactionalNotification } from "../../src/server/notifications/notification-dispatch";
import { supportResultSchema } from "../../src/domain/support/support";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

// Called only inside the freshly authorised recovery scenario after genuine signed funding.
// These financial authority/evidence rows are declared synthetic review prerequisites,
// never fake provider captures, refund receipts or real clinical judgements.
export async function runHostedRecoveryRefund(p: HostedBridgePorts, offerId: string) {
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
  invariant(
    p.tenant === "e1360000-0000-4000-8000-000000000001" &&
      uuid.test(offerId) &&
      uuid.test(p.caseId) &&
      ["patient", "operations", "alternate", "admin"].every((role) =>
        uuid.test(p.actors.get(role)?.subjectId ?? ""),
      ),
    "RECOVERY_SCOPE_INVALID",
  );
  async function command(body: Record<string, unknown>, role: string) {
    return p.request(
      role === "patient" ? "/portal/payments/refund" : "/staff/payments/refund",
      { offerId, ...body },
      role,
    );
  }
  const request = { action: "request", requestKey: randomUUID() };
  for (let i = 0; i < 2; i++) {
    const response = await command(request, "patient");
    invariant(response.status === 200, `RECOVERY_REQUEST_STATUS_${response.status}`);
    const view = refundViewSchema.parse(await response.json());
    invariant(
      view.requestState === "requested" && view.refunds.length === 0,
      "RECOVERY_REQUEST_FALSE_REFUND",
    );
  }
  const authority = randomUUID(),
    evidence = randomUUID();
  invariant(
    (
      await command(
        { action: "review", reason: "no_review", evidenceId: evidence, requestKey: randomUUID() },
        "alternate",
      )
    ).status === 403,
    "RECOVERY_UNGRANTED_FINANCE_ALLOWED",
  );
  await p.sql(
    `begin;
    insert into commerce_private.refund_authorities
      (case_id,actor_id,approval_reference,approved_by,expires_at)
    values('${p.caseId}','${p.actors.get("operations")!.subjectId}','${authority}',
      '${p.actors.get("admin")!.subjectId}',now()+interval '15 minutes');
    insert into commerce_private.refund_evidence
      (id,case_id,reason,source_reference,verified_by,verified_at,expires_at)
    values('${evidence}','${p.caseId}','no_review','${randomUUID()}',
      '${p.actors.get("admin")!.subjectId}',now(),now()+interval '15 minutes');
    commit;`,
    false,
  );
  const review = {
    action: "review",
    reason: "no_review",
    evidenceId: evidence,
    requestKey: randomUUID(),
  };
  let refundId: string | undefined;
  for (let i = 0; i < 2; i++) {
    const response = await command(review, "operations");
    invariant(response.status === 200, `RECOVERY_REVIEW_STATUS_${response.status}`);
    const view = refundViewSchema.parse(await response.json());
    invariant(
      view.requestState === "queued" &&
        view.refunds.length === 1 &&
        view.refunds[0]!.amountMinor === 99900 &&
        view.refunds[0]!.state === "queued",
      "RECOVERY_REVIEW_ALLOCATION_INVALID",
    );
    if (refundId) invariant(refundId === view.refunds[0]!.reference, "RECOVERY_REPLAY_DUPLICATED");
    refundId = view.refunds[0]!.reference;
  }
  invariant(refundId, "RECOVERY_REFUND_ID_MISSING");
  const response = await command(
    { action: "dispatch", refundId, requestKey: randomUUID() },
    "operations",
  );
  invariant(response.status === 200, `RECOVERY_DISPATCH_STATUS_${response.status}`);
  const submitted = refundViewSchema.parse(await response.json());
  invariant(
    submitted.refunds.length === 1 && submitted.refunds[0]!.amountMinor === 99900,
    "RECOVERY_DISPATCH_ALLOCATION_CHANGED",
  );
  // Only a separately ingested genuine Stripe event may establish a terminal refund.
  let confirmed = false;
  for (let attempt = 0; attempt < 18; attempt++) {
    const result = await p.sql(`select exists(select 1 from commerce_private.refund_jobs j
      join commerce_private.refund_provider_facts f on f.job_reference=j.id
        and f.payment_intent_id=j.payment_intent_id and f.account_id=j.account_id
      where j.id='${refundId}' and j.amount_minor=99900 and j.state='confirmed'
        and f.amount_minor=99900 and f.currency='zar' and f.status='succeeded') as confirmed`);
    if (result[0]?.confirmed === true) {
      confirmed = true;
      break;
    }
    await delay(5000);
  }
  invariant(confirmed, "RECOVERY_SIGNED_REFUND_MISSING");
  const held = await p.sql(
    `select not commerce_private.deposit_ready('${p.caseId}') as held,
    (select count(*)=1 from commerce_private.cancellation_requests where offer_id='${offerId}') as one_request,
    (select state='onboarding_pending' and version=6 from public.operations_cases where id='${p.caseId}') as no_clinical_advance`,
    false,
  );
  invariant(
    Object.values(held[0]!).every((v) => v === true),
    "RECOVERY_FINAL_STATE_INVALID",
  );
  const final = await command({ action: "read" }, "patient");
  invariant(
    final.status === 200 &&
      refundViewSchema.parse(await final.json()).refunds[0]?.state === "confirmed",
    "RECOVERY_CLIENT_REFUND_PROJECTION_FAILED",
  );
  p.manifest("routed-cancellation-signed-refund-confirmed");
}

// Hosted journals and routed ownership, with explicitly injected transport failures.
// No Brevo request, callback, delivery evidence or generator request is fabricated.
export async function runHostedRecoverySupport(
  p: HostedBridgePorts,
  rpc: (name: string, args: Record<string, unknown>) => Promise<unknown>,
) {
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
  invariant(
    p.tenant === "e1360000-0000-4000-8000-000000000001" &&
      ["patient", "operations", "alternate", "admin"].every((role) =>
        uuid.test(p.actors.get(role)?.subjectId ?? ""),
      ),
    "RECOVERY_SUPPORT_SCOPE_INVALID",
  );
  await p.sql(
    `insert into identity_private.support_routes
    (tenant_id,purpose,primary_subject_id,alternate_subject_id,starts_at,expires_at,
    roster_reference,mailbox_control_reference,receipt_reference,absence_reference,failure_reference,
    approved_by_subject_id,approval_reference,acknowledgement_minutes)
    values('${p.tenant}','complaint','${p.actors.get("operations")!.subjectId}',
    '${p.actors.get("alternate")!.subjectId}',now()-interval '1 minute',now()+interval '30 minutes',
    '${randomUUID()}','${randomUUID()}','${randomUUID()}','${randomUUID()}','${randomUUID()}',
    '${p.actors.get("admin")!.subjectId}','${randomUUID()}',1440);`,
    false,
  );
  const references: string[] = [];
  for (let i = 0; i < 3; i++) {
    const response = await p.request(
      "/portal/support/command",
      {
        action: "request",
        purpose: "complaint",
        urgent: false,
        requestKey: randomUUID(),
      },
      "patient",
    );
    invariant(response.status === 200, `RECOVERY_SUPPORT_REQUEST_${response.status}`);
    const body = supportResultSchema.parse(await response.json());
    invariant(body.outcome === "received", "RECOVERY_SUPPORT_NOT_RECORDED");
    references.push(body.reference);
  }
  const failed: string[] = [],
    uncertain: string[] = [];
  let exhausted = false;
  for (let i = 0; i < 12; i++) {
    const value = await rpc("claim_transactional_notification", { p_tenant_id: p.tenant });
    if (value === null) {
      exhausted = true;
      break;
    }
    const claim = notificationClaimSchema.parse(value);
    invariant(claim.recipient.endsWith("@example.invalid"), "RECOVERY_NOTIFICATION_REAL_RECIPIENT");
    const owned = await p.sql(`select exists(select 1 from audit_private.transactional_notifications
      where id='${claim.notificationId}' and tenant_id='${p.tenant}' and source_kind='support'
      and source_id in(${references.map((ref) => `'${ref}'`).join(",")})) as owned`);
    const isSupport = owned[0]?.owned === true;
    const injectTimeout = isSupport && failed.length > 0;
    const outcome = await sendTransactionalNotification(
      "synthetic-fault-only-no-provider-key",
      claim,
      async () => {
        if (injectTimeout) throw new Error("SYNTHETIC_TRANSPORT_TIMEOUT");
        return new Response(null, { status: 400 });
      },
    );
    invariant(
      outcome === (injectTimeout ? "uncertain" : "failed"),
      "RECOVERY_FAULT_CLASSIFICATION_INVALID",
    );
    invariant(
      (await rpc("finish_transactional_notification", {
        p_tenant_id: p.tenant,
        p_notification_id: claim.notificationId,
        p_lease_id: claim.leaseId,
        p_outcome: outcome,
      })) === true,
      "RECOVERY_FAULT_JOURNAL_FAILED",
    );
    if (isSupport) (injectTimeout ? uncertain : failed).push(claim.notificationId);
  }
  invariant(
    exhausted && failed.length === 1 && uncertain.length === 2,
    "RECOVERY_FAULT_COVERAGE_INCOMPLETE",
  );
  async function follow(reference: string, action: string) {
    return p.request(
      "/staff/support/followup",
      {
        action,
        reference,
        requestKey: randomUUID(),
        reason: action === "acknowledged" ? "review_started" : "confirmed_non_acceptance",
      },
      "alternate",
    );
  }
  invariant(
    (await follow(uncertain[0]!, "acknowledged")).status === 200,
    "RECOVERY_UNCERTAINTY_ACK_FAILED",
  );
  invariant((await follow(uncertain[0]!, "resend")).status === 409, "RECOVERY_UNCERTAINTY_RESENT");
  invariant(
    (await follow(failed[0]!, "acknowledged")).status === 200,
    "RECOVERY_FAILURE_ACK_FAILED",
  );
  await p.sql(
    `insert into audit_private.transactional_suppressions(tenant_id,subject_id,reason)
    values('${p.tenant}','${p.actors.get("patient")!.subjectId}','recipient_requested');`,
    false,
  );
  invariant((await follow(failed[0]!, "resend")).status === 409, "RECOVERY_SUPPRESSION_OVERRIDDEN");
  // Revoke only the synthetic primary's membership to drive actual alternate escalation.
  await p.sql(
    `update public.tenant_memberships set status='revoked'
    where tenant_id='${p.tenant}' and subject_id='${p.actors.get("operations")!.subjectId}' and role='operations';`,
    false,
  );
  const read = await p.request("/portal/support/command", { action: "read" }, "patient");
  invariant(read.status === 200, "RECOVERY_ESCALATION_READ_FAILED");
  const view = supportResultSchema.parse(await read.json());
  invariant(
    view.outcome === "view" &&
      view.requests.filter((r) => references.includes(r.reference)).length === references.length &&
      view.requests
        .filter((r) => references.includes(r.reference))
        .every((r) => r.state === "escalated"),
    "RECOVERY_ALTERNATE_ESCALATION_MISSING",
  );
  invariant(
    (
      await p.request(
        "/staff/support/command",
        { action: "acknowledged", reference: references[0], requestKey: randomUUID() },
        "operations",
      )
    ).status === 401,
    "RECOVERY_REVOKED_PRIMARY_ALLOWED",
  );
  for (const action of ["acknowledged", "resolved"]) {
    invariant(
      (
        await p.request(
          "/staff/support/command",
          { action, reference: references[0], requestKey: randomUUID() },
          "alternate",
        )
      ).status === 200,
      "RECOVERY_ALTERNATE_RESPONSE_FAILED",
    );
  }
  // Membership remains revoked for the session-denial proof; cleanup removes the exact actor.
  p.manifest("hosted-injected-notification-faults-suppression-alternate-escalation-passed");
}
