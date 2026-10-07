---
title: Protocol Generator Reactivation and Compatibility Checklist
status: planned-pre-launch-dependency
last_updated: 2026-10-05
owner: "@Muhns13G"
related_tasks: [2.8.8, 2.10.I8, 2.10.9]
related_debt: [TD-009, TD-043]
---

# Protocol Generator Reactivation and Compatibility Checklist

## Purpose and Current Boundary

Complete the deferred external-provider checks once the owner restores access to
`https://protocols.meneerhealth.co.za`. On 5 October, authenticated access reached `/subscribe`;
current generation and compatibility could not be verified. I8's non-generator work is closed with
the owner's explicit exception. This checklist does not reopen I8 or prevent Task 10.9; it must be
resolved before real client information is manually transferred to the generator.

The [Task 8.8 investigation](../02-implementation-plans/phase-02/annexures/sprint-08-8-protocol-portal-capability-evidence.md)
is historical evidence, not proof of today's provider behaviour. The intended flow is Meneer
questionnaire → authorised, paid-review-ready manual transfer → professional review in the provider
portal → separately reconciled non-clinical status. Subscription restoration alone activates none
of those Meneer permissions or workflows.

## 1. Restore Entitlement and Verify Access

- [ ] Owner renews the intended account/plan and confirms billing, renewal date and service access.
      Do not purchase or accept a new recurring commitment through an engineering rehearsal.
- [ ] Verify login, dashboard, intake, protocol library and logout in a fresh browser session;
      confirm `/subscribe` no longer blocks the required functions.
- [ ] Confirm named reviewer/transcriber access, individual accounts, available MFA and revocation.
      Resolve previously disclosed/shared credentials through the owner before pilot use; do not
      treat a working shared login as acceptable access governance.
- [ ] Confirm the actual provider/recipient, processing arrangement, support contact and outage path
      in private operating records. Keep credentials and private appointments out of Git.

## 2. Recheck Every Input Against Meneer's Submitted Snapshot

Use the [I1 mapping contract](../02-implementation-plans/phase-02/annexures/sprint-10-i1-medical-intake-contract.md),
not a remembered portal layout. Record current requiredness, units, options and changes.

| Provider input                                       | Required reconciliation                                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Names, email, phone and consent                      | Manually reconcile name splitting and verified email; preserve unverified mobile status. Account terms are not provider/disclosure consent.             |
| Age                                                  | Calculate from DOB as of the review date; retain that date. Never alter DOB to fit an age field.                                                        |
| Height and weight                                    | Check cm/kg and any provider conversions; do not silently round or invent measurements.                                                                 |
| Sex                                                  | Transfer the explicit patient choice only. Confirm current options and clinician review of Meneer's separately added field; never assume male.          |
| Goals and treatment categories                       | Categories are not equivalent to provider goals or product eligibility. The responsible reviewer resolves the mapping.                                  |
| Conditions, medication, allergies and narratives     | Preserve uncertainty and explicit dispositions. Missing, declined or unknown responses are not “none”.                                                  |
| Pregnancy/breastfeeding or newly mandatory questions | Do not infer negatives or invent answers. Obtain professional clarification; new Meneer questions require reviewed, versioned changes.                  |
| Reports and laboratory values                        | Initial questionnaire submission remains possible without bloods. Leave absent results unavailable; later clinical requirements are clinician-directed. |

Record minimum-field, purpose and recipient mappings. Exclude inactive questionnaire branches and
unrelated account/queue information. If the portal requires unsupported data, resolve the mapping
before transfer rather than bypassing the requirement.

## 3. Perform a Bounded Synthetic End-to-End Rehearsal

- [ ] Obtain approval for a clearly labelled dummy record and any provider notifications. Use only
      synthetic answers and `.invalid` contact fixtures; no real client, charge or dispensing.
- [ ] Exercise the current intake steps, validation, draft/resume where supported, review and final
      generation. Confirm one persistent pending protocol and its attributable version/reference.
- [ ] Inspect Summary, Dosing, Safety and Delivery views. Verify the reviewer can distinguish pending,
      approved and sent states; do not approve, send, order or dispense during this rehearsal.
- [ ] Check amended-input/version handling and duplicate submission behaviour without creating
      untracked duplicates. Record what the provider actually supports, including limitations.
- [ ] Ask the provider to remove the identified dummy record, or record its retained test status if
      deletion is unavailable. Do not delete unrelated records.

## 4. Resolve Historical Output and Workflow Findings

- [ ] Have the responsible clinician/provider investigate the previously inconsistent rounded dose
      values across dosing fields and explanatory text. Obtain documented resolution or a defined
      professional checking procedure before clinical reliance; engineering does not approve doses.
- [ ] Reconfirm the stated dependence on Precise Wellness pen concentrations. Different products or
      concentrations require professional reconciliation, not an automatic Meneer conversion.
- [ ] Compare library states with dashboard totals; the previous investigation found contradictory
      pending counts. Keep authoritative manual record-level reconciliation if totals remain unreliable.
- [ ] Download both short and full synthetic PDFs and inspect their actual contents and rendering:
      identity/version, units, warnings, monitoring and correspondence with the reviewed protocol.
      A download-success toast alone is insufficient proof.
- [ ] If uploads/extraction become required, separately approve synthetic-file testing of formats,
      size limits, extraction accuracy and provider handling. Those capabilities remain unverified;
      they are not part of the current no-upload Meneer questionnaire.

## 5. Verify the Governed Manual Bridge and Failure Paths

- [ ] Use the first-party preparation command from Task 13.5 only after its schema/runtime release
      and hosted acceptance. It binds current snapshot, client authorisation, medical grant, claim,
      paid readiness and finite expiry before external work; it sends nothing. Refresh case version
      before recording; expired or uncertain preparation is not permission to resend automatically.
- [ ] Rehearse exact submitted-version/field/purpose grants, independent approval, AAL2, recipient
      authorisation, transfer receipt and independent reconciliation. Routine operations assignment
      must not confer medical access.
- [ ] Demonstrate denial for restriction, unresolved safety hold, expired/revoked grant, changed
      snapshot, wrong assignment and unavailable provider. Do not silently clear a hold or retry a
      transfer whose delivery is uncertain.
- [ ] Preserve the Sprint-11 authoritative R999 deposit requirement before paid provider review/manual
      transfer. Until its adapter is implemented and verified, use explicitly synthetic proof only;
      questionnaire receipt is never evidence of payment.
- [ ] Record opaque reference, actor, version, time and acknowledgement in Meneer. No answers, dosing
      or protocol PDFs belong in the general queue, ordinary email, logs, analytics or Stripe metadata.
- [ ] Ask for documented supported API/webhook/export capabilities if available. Do not reverse-engineer
      private browser endpoints; keep the manual bridge unless a separately approved integration replaces it.

## Acceptance, Evidence and Launch Decision

Save a dated, redacted evidence annexure with the account entitlement outcome, portal changes,
mapping version, synthetic scenarios/results, PDF inspection, provider/clinical follow-ups,
failure paths and test-record disposition. Record accountable owners privately where appropriate.
Update this checklist, the intake runbook, RAG and applicable TD-009/TD-043 evidence; do not close
those broader debts merely because the subscription works.

Close this dependency only when current access and input/output compatibility are demonstrated and
material findings are resolved or explicitly accepted by the responsible owner/professional.
Keep collection/transfer disabled if a required condition is unresolved. Real pilot activation still
requires approved publications, appointments, safety configuration, payment evidence and owner
release approval under the [intake runbook](../06-operations/medical-intake-release-recovery-runbook.md).
