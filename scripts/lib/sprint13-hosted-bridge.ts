import { randomUUID } from "node:crypto";
import { completeSyntheticAnswers } from "../../contracts/fixtures/medical-intake-synthetic";
import { portalViewSchema } from "../../src/domain/identity/patient-portal";

type Actor = { id: string; subjectId?: string; email: string };
export type HostedBridgePorts = {
  tenant: string;
  caseId: string;
  actors: ReadonlyMap<string, Actor>;
  request(
    path: string,
    body: Record<string, unknown>,
    role?: string,
    form?: boolean,
  ): Promise<Response>;
  portalRead(): Promise<Response>;
  sql(query: string, readOnly?: boolean): Promise<Record<string, unknown>[]>;
  manifest(stage: string): void;
};
function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
const id = (suffix: number) => `e1350000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;
const intakeId = id(3),
  publicationId = id(2);
export function buildHostedBridgeSetup(source: string) {
  const start = source.indexOf("-- Declared submitted-intake prerequisite");
  const end = source.indexOf("insert into commerce_private.prices", start);
  invariant(start >= 0 && end > start, "BRIDGE_FIXTURE_BOUNDARY_INVALID");
  let result = (source.slice(0, start) + source.slice(end))
    .replaceAll("e1340000", "e1350000")
    .replaceAll("synthetic-sprint13-payment", "synthetic-sprint13-bridge")
    .replaceAll("SYNTHETIC DEPOSIT ONLY", "SYNTHETIC PAID BRIDGE ONLY");
  const caseFixture =
    /insert into public\.operations_cases\(id,tenant_id,subject_id\) values\s*\('e1350000-0000-4000-8000-000000000010','e1350000-0000-4000-8000-000000000001','[^']+'\);/;
  invariant(caseFixture.test(result), "BRIDGE_CASE_FIXTURE_MISSING");
  result = result.replace(caseFixture, "");
  const columns = "effective_at,expires_at,status)";
  invariant(result.includes(columns), "BRIDGE_PUBLICATION_COLUMNS_MISSING");
  result = result.replace(columns, "effective_at,expires_at,status,transfer_notice)");
  const value = "now()-interval '1 minute',now()+interval '2 hours','published');";
  invariant(result.includes(value), "BRIDGE_PUBLICATION_VALUE_MISSING");
  result = result.replace(
    value,
    "now()-interval '1 minute',now()+interval '2 hours','published','SYNTHETIC TEST ONLY manual transfer notice');",
  );
  invariant(
    !/insert\s+into\s+intake_private\.(intakes|snapshots|transfers|transfer_preparations)/i.test(
      result,
    ),
    "BRIDGE_INTAKE_OR_TRANSFER_FACTS_SEEDED",
  );
  return result;
}
let snapshotId: string | undefined;
async function recorded(response: Response, code: string) {
  invariant(response.status === 200, `${code}_${response.status}`);
  const body = (await response.json()) as { reference: string; outcome: string };
  invariant(/^[a-f0-9-]{36}$/.test(body.reference) && body.outcome === "recorded", code);
  return body.reference;
}
export async function submitHostedBridgeIntake(p: HostedBridgePorts): Promise<string> {
  invariant(p.tenant === id(1), "BRIDGE_SCOPE_INVALID");
  const draft = await p.request(
    "/portal/intake/command",
    {
      action: "save",
      intakeId,
      publicationId,
      privacyAcknowledged: true,
      expectedVersion: 0,
      requestKey: randomUUID(),
      answers: completeSyntheticAnswers,
    },
    "patient",
  );
  invariant(draft.status === 200, "BRIDGE_DRAFT_FAILED");
  const draftBody = (await draft.json()) as { version: number; state: string };
  invariant(draftBody.version === 1 && draftBody.state === "draft", "BRIDGE_DRAFT_VERSION_INVALID");
  const submitted = await p.request(
    "/portal/intake/command",
    {
      action: "submit",
      intakeId,
      publicationId,
      privacyAcknowledged: true,
      expectedVersion: 1,
      requestKey: randomUUID(),
      answers: completeSyntheticAnswers,
    },
    "patient",
  );
  invariant(submitted.status === 200, `BRIDGE_SUBMISSION_${submitted.status}`);
  const body = (await submitted.json()) as {
    caseId: string;
    snapshotId: string;
    state: string;
    version: number;
  };
  invariant(
    /^[a-f0-9-]{36}$/.test(body.snapshotId) && body.state === "submitted" && body.version === 2,
    "BRIDGE_SNAPSHOT_INVALID",
  );
  snapshotId = body.snapshotId;
  invariant(/^[a-f0-9-]{36}$/.test(body.caseId), "BRIDGE_CASE_ID_INVALID");
  const linkage = await p.sql(`select exists(select 1 from intake_private.intakes i
    join public.operations_cases c on c.id=i.case_id
    where i.id='${intakeId}' and i.tenant_id='${p.tenant}' and i.subject_id='${p.actors.get("patient")!.subjectId}'
    and i.case_id='${body.caseId}' and c.tenant_id=i.tenant_id and c.subject_id=i.subject_id
    and c.version=1 and c.state='onboarding_pending') as linked`);
  invariant(linkage[0]?.linked === true, "BRIDGE_CASE_LINKAGE_INVALID");
  p.manifest("routed-submission-created-own-case");
  return body.caseId;
}
export async function prepareHostedBridgeIntake(p: HostedBridgePorts) {
  invariant(p.tenant === id(1) && snapshotId, "BRIDGE_SCOPE_INVALID");
  invariant(
    (
      await p.request(
        "/staff/intake/command",
        { action: "read", intakeId, purpose: "medical_transfer" },
        "operations",
      )
    ).status === 403,
    "BRIDGE_ORDINARY_OPERATIONS_READ_ALLOWED",
  );
  const grant = await recorded(
    await p.request(
      "/staff/intake/command",
      {
        action: "approve_grant",
        intakeId,
        snapshotId,
        targetSubjectId: p.actors.get("operations")!.subjectId,
        purpose: "medical_transfer",
        fields: ["full_name", "sex"],
        rosterReference: randomUUID(),
        expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
        requestKey: randomUUID(),
      },
      "clinician",
    ),
    "BRIDGE_GRANT_APPROVAL",
  );
  await recorded(
    await p.request(
      "/staff/intake/command",
      { action: "activate_grant", approvalId: grant, requestKey: randomUUID() },
      "admin",
    ),
    "BRIDGE_GRANT_ACTIVATION",
  );
  const read = await p.request(
    "/staff/intake/command",
    { action: "read", intakeId, purpose: "medical_transfer" },
    "operations",
  );
  invariant(read.status === 200, `BRIDGE_GRANTED_READ_STATUS_${read.status}`);
  const view = (await read.json()) as { snapshotId: string; fields: Record<string, unknown> };
  invariant(
    view.snapshotId === snapshotId &&
      Object.keys(view.fields).sort().join(",") === "full_name,sex" &&
      view.fields.full_name === completeSyntheticAnswers.full_name &&
      view.fields.sex === completeSyntheticAnswers.sex,
    "BRIDGE_FIELD_SCOPE_INVALID",
  );
  await recorded(
    await p.request(
      "/portal/intake/command",
      {
        action: "authorise_transfer",
        intakeId,
        snapshotId,
        publicationId,
        requestKey: randomUUID(),
      },
      "patient",
    ),
    "BRIDGE_CLIENT_AUTHORISATION",
  );
  invariant(
    (
      await p.request(
        "/staff/intake/command",
        {
          action: "prepare_transfer",
          intakeId,
          snapshotId,
          caseVersion: 6,
          requestKey: randomUUID(),
        },
        "operations",
      )
    ).status === 412,
    "BRIDGE_UNPAID_PREPARATION_ALLOWED",
  );
  p.manifest("routed-submission-field-grant-consent-unpaid-denial-passed");
}
export async function runHostedPaidBridge(p: HostedBridgePorts) {
  invariant(snapshotId, "BRIDGE_SUBMISSION_MISSING");
  const command = {
    action: "prepare_transfer",
    intakeId,
    snapshotId,
    caseVersion: 6,
    requestKey: randomUUID(),
  };
  invariant(
    (await p.request("/staff/intake/command", { ...command, caseVersion: 999 }, "operations"))
      .status === 409,
    "BRIDGE_STALE_PREPARATION_ACCEPTED",
  );
  const preparation = await recorded(
    await p.request("/staff/intake/command", command, "operations"),
    "BRIDGE_PREPARATION",
  );
  invariant(
    (await recorded(
      await p.request("/staff/intake/command", command, "operations"),
      "BRIDGE_PREPARATION_REPLAY",
    )) === preparation,
    "BRIDGE_PREPARATION_REPLAY_CHANGED",
  );
  invariant(
    (await p.request("/staff/intake/command", { ...command, caseVersion: 7 }, "operations"))
      .status === 409,
    "BRIDGE_CHANGED_PREPARATION_REPLAY_ACCEPTED",
  );
  const status = await p.portalRead();
  invariant(status.status === 200, "BRIDGE_PATIENT_PROJECTION_FAILED");
  const portal = portalViewSchema.parse(await status.json());
  invariant(
    portal.account.operationsCases.length === 1 &&
      portal.account.operationsCases[0]?.status === "handoff_pending",
    "BRIDGE_PREPARED_PROJECTION_INVALID",
  );
  const transfer = {
    action: "record_transfer",
    intakeId,
    snapshotId,
    caseVersion: 7,
    externalReference: randomUUID(),
    requestKey: randomUUID(),
  };
  invariant(
    (await p.request("/staff/intake/command", { ...transfer, caseVersion: 999 }, "operations"))
      .status === 409,
    "BRIDGE_STALE_RECORD_ACCEPTED",
  );
  // Faults are rollback-only SQL against genuine manifested Auth/AAL2 identities, not HTTP claims.
  const actor = p.actors.get("operations")!;
  invariant(
    /^[a-f0-9-]{36}$/.test(actor.subjectId!) && /^[a-z0-9-]+@example\.invalid$/.test(actor.email),
    "BRIDGE_ACTOR_INVALID",
  );
  const sessions = await p.sql(
    `select id,provider_session_id from public.identity_sessions where subject_id='${actor.subjectId}' and status='active'`,
  );
  invariant(
    sessions.length === 1 &&
      [sessions[0]?.id, sessions[0]?.provider_session_id].every((v) =>
        /^[a-f0-9-]{36}$/.test(String(v)),
      ),
    "BRIDGE_SESSION_SCOPE_CHANGED",
  );
  const context = {
    tenantId: p.tenant,
    subjectId: actor.subjectId,
    sessionId: sessions[0]!.id,
    providerSubject: actor.id,
    providerSessionId: sessions[0]!.provider_session_id,
    verifiedEmail: actor.email,
    purpose: "operations",
  };
  for (const mutation of [
    `update intake_private.intakes set state='restricted' where id='${intakeId}';`,
    `update intake_private.intakes set safety_hold=true where id='${intakeId}';`,
    `update intake_private.access_grants set revoked_at=clock_timestamp() where intake_id='${intakeId}' and actor_subject_id='${actor.subjectId}' and revoked_at is null;`,
    `update public.operations_claims set released_at=clock_timestamp() where case_id='${p.caseId}' and workforce_subject_id='${actor.subjectId}' and released_at is null;`,
  ]) {
    await p.sql(
      `begin;set local statement_timeout='15s';set local lock_timeout='5s';${mutation}
      do $$begin begin perform public.record_medical_transfer('${JSON.stringify(context)}'::jsonb,
        '${JSON.stringify(transfer)}'::jsonb);raise exception 'BRIDGE_FAULT_NOT_DENIED';
        exception when insufficient_privilege then null;end;end$$;rollback;select true as fault_denied;`,
      false,
    );
  }
  const stable =
    await p.sql(`select (select count(*)=1 from intake_private.transfer_preparations where intake_id='${intakeId}') as one_intent,
    (select count(*)=0 from intake_private.transfers where intake_id='${intakeId}') as no_transfer,
    (select state='ready_for_handoff' and version=7 from public.operations_cases where id='${p.caseId}') as unchanged_case`);
  invariant(
    Object.values(stable[0]!).every((v) => v === true),
    "BRIDGE_DENIAL_STATE_CHANGED",
  );
  const reference = await recorded(
    await p.request("/staff/intake/command", transfer, "operations"),
    "BRIDGE_SYNTHETIC_TRANSFER_RECORD",
  );
  invariant(
    (await recorded(
      await p.request("/staff/intake/command", transfer, "operations"),
      "BRIDGE_RECORD_REPLAY",
    )) === reference,
    "BRIDGE_RECORD_REPLAY_CHANGED",
  );
  invariant(
    (
      await p.request(
        "/staff/intake/command",
        { ...transfer, externalReference: randomUUID() },
        "operations",
      )
    ).status === 409,
    "BRIDGE_CHANGED_RECORD_REPLAY_ACCEPTED",
  );
  const reconcile = {
    action: "reconcile_transfer",
    transferId: reference,
    evidenceReference: randomUUID(),
    requestKey: randomUUID(),
  };
  invariant(
    (await p.request("/staff/intake/command", reconcile, "operations")).status === 403,
    "BRIDGE_SELF_RECONCILIATION_ALLOWED",
  );
  const evidence = await recorded(
    await p.request("/staff/intake/command", reconcile, "alternate"),
    "BRIDGE_INDEPENDENT_RECONCILIATION",
  );
  invariant(
    (await recorded(
      await p.request("/staff/intake/command", reconcile, "alternate"),
      "BRIDGE_RECONCILIATION_REPLAY",
    )) === evidence,
    "BRIDGE_RECONCILIATION_REPLAY_CHANGED",
  );
  invariant(
    (
      await p.request(
        "/staff/intake/command",
        { ...reconcile, evidenceReference: randomUUID() },
        "alternate",
      )
    ).status === 409,
    "BRIDGE_CHANGED_RECONCILIATION_ACCEPTED",
  );
  invariant(
    (
      await p.request(
        "/staff/intake/command",
        { action: "read", intakeId, purpose: "medical_transfer" },
        "alternate",
      )
    ).status === 403,
    "BRIDGE_NONCLINICAL_RECONCILER_READ_ALLOWED",
  );
  const proof = await p.sql(`select
    (select count(*)=1 from intake_private.transfers where intake_id='${intakeId}') as one_transfer,
    (select count(*)=1 from intake_private.transfer_preparation_receipts where transfer_id='${reference}') as preparation_bound,
    (select count(*)=1 from intake_private.reconciliations where transfer_id='${reference}' and actor_subject_id='${p.actors.get("alternate")!.subjectId}') as independent_receipt,
    (select state='provider_acknowledged' and version=9 from public.operations_cases where id='${p.caseId}') as reconciled_case,
    (select envelope->>'algorithm'='AES-256-GCM' from intake_private.intakes where id='${intakeId}') as encrypted_intake,
    (select count(*)=0 from public.fulfilment_cases where tenant_id='${p.tenant}') as no_supply`);
  invariant(
    Object.values(proof[0]!).every((v) => v === true),
    "BRIDGE_DURABLE_PROOF_FAILED",
  );
  const final = await p.portalRead();
  invariant(
    final.status === 200 &&
      portalViewSchema.parse(await final.json()).account.operationsCases[0]?.status ===
        "handoff_recorded",
    "BRIDGE_RECONCILED_PROJECTION_INVALID",
  );
  p.manifest("paid-preparation-bound-synthetic-transfer-independent-reconciliation-passed");
  console.log(
    JSON.stringify({
      exercise: "sprint13-hosted-bridge",
      providerContacted: false,
      externalDataTransferred: false,
      providerAcknowledgementEvidence: "synthetic-Meneer-only",
      genuineSignedPayment: true,
      medicalAnswersLogged: false,
      routedConsentGrantsPreparationReplay: true,
      rollbackFaultDenials: true,
      independentNonclinicalReconciliation: true,
    }),
  );
}
