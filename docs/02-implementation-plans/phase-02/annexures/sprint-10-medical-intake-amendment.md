---
plan_id: phase-02-sprint-10-medical-intake-amendment
status: local-implementation-hosted-verification-pending
last_updated: 2026-10-05
depends_on: [DR-018, phase-02-sprint-09, phase-02-sprint-10-task-06]
primary_debt: [TD-009, TD-037, TD-038, TD-043]
source_commit: b2a3a1e
---

# Sprint 10 Amendment — First Party Medical Questionnaire

## Mission and Scope

Implement the owner's revised onboarding direction under [DR-018](../../../07-decisions/DR-018-meneer-hosted-medical-intake.md):
clients complete Mikhail's clinician-approved questionnaire inside Meneer; explicitly authorised
staff manually enter required information into the external protocol generator. Preserve the
questionnaire's narrative-first wording and the existing brand messaging. Do not build an AI
prescriber, dosing engine, provider API, automatic clinical assessment or ordinary-email transfer.

This is **additional planned work**, not evidence that Task 10.6 already hosts medical intake.
Dr Zee's question approval is confirmed by the owner, with no amendments. Blood results are not a
submission/onboarding prerequisite; no mandatory upload or invented normal result is permitted.
Later clinician-requested tests remain possible. Blood-upload implementation is not in this packet.

## Source and Field Inventory

The source is `Meneer_Medical_History_Questionnaire_Draft.docx`, identified by the SHA-256 in DR-018.
Task I1 must freeze a versioned question catalogue using its exact patient prompts; the filename's
draft label and owner-attested approval both remain provenance. Do not publish the clinician review
notes or the final “Questions for you” section as patient questions.

| Section                 | Source content                                                                                         | Implementation boundary                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| About you               | Full name, DOB, ID/passport number, contact/email, height/weight, optional GP contact                  | Reuse verified identity for display where appropriate; medical/identity fields stay outside the account profile. Units, validation and requiredness need an explicit field contract.  |
| Health today            | Narrative history; explicit medications/dose/frequency, allergies/reaction and six-condition checklist | Preserve direct questions; support an explicit negative answer rather than interpreting an empty answer as “none”.                                                                    |
| Family history          | Narrative including relevant conditions and known age of onset                                         | Preserve uncertainty; never infer family history.                                                                                                                                     |
| Lifestyle               | Narrative smoking, alcohol, exercise, recreational drugs and unsupervised steroid/peptide use          | Store as protected medical content, not behavioural or marketing data.                                                                                                                |
| Mental wellbeing        | Narrative plus drafted two-week Yes/No safety question                                                 | Record exact source question; escalation controls pending I1/I5, no invented screening score or additional tool.                                                                      |
| Sexual health and STIs  | Narrative history plus explicit current-symptom Yes/No question                                        | Retain source; settle its proposed hold/referral handling before activation.                                                                                                          |
| Conditional categories  | ED, hair, weight, TRT and peptides narrative prompts                                                   | Source allows conditional display; settle multiple selections and answer preservation on branch changes. No automatic product recommendation.                                         |
| Declaration and consent | Accuracy declaration, doctor-review/prescribing consent, signature/date                                | Separate exact-version declaration and submission receipt from account terms, marketing and treatment approval. Signature capture format and clinician-party wording need resolution. |

## Commit Sized Tasks and Sequence

Use `2.10.I1`–`2.10.I8` to identify this added intake stream without renumbering committed 10.1–10.6
or disguising additional work as 10.7. Each task requires its own tests/evidence and owner commit.
Continue 10.7 audit/alerts, then 10.8 nonclinical status as already planned. Complete I1–I8 before
10.9's expanded full-journey rehearsals and 10.10 closure. Contract questions may be settled while
10.7/10.8 proceed; they do not require reopening completed historical tasks.

| Task    | Commit sized outcome                                                                                                                                                                       | Acceptance evidence                                                                                                                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.10.I1 | Freeze exact versioned questions/field contract, conditional rules, requiredness, medical access actors, generator mapping, escalation actions and revised instruments/retention contract. | Source wording comparison and explicit unresolved-decision checklist; no invented clinical rules or asserted provider compatibility.                                                                     |
| 2.10.I2 | Add separate private intake/version/submission persistence and strict framework-neutral contracts.                                                                                         | Migration replay, ownership/tenant denials, bounded payloads, draft concurrency, immutable submitted snapshots and atomic payload-free audit.                                                            |
| 2.10.I3 | Implement server-authorised patient draft/save/resume/submit commands.                                                                                                                     | Own-subject scope, current session/instruments, request-size/rate/origin guards, idempotency, expiry/revocation and durable-success tests.                                                               |
| 2.10.I4 | Build accessible first-party questionnaire, branching, review and confirmation inside the authenticated portal.                                                                            | Exact-copy tests, clear error/focus handling, desktop/mobile keyboard/axe checks; no answers in URL, browser storage, analytics, console or telemetry.                                                   |
| 2.10.I5 | Implement approved safety escalation holds and private routed handling.                                                                                                                    | Synthetic affirmative answers, missing/unknown answers, receipt/acknowledgement, unavailable owner, after-hours and failed notification/fallback tests; no false promise of instant human response.      |
| 2.10.I6 | Implement purpose-bound medical-answer access and deliberate manual-transfer reconciliation with the existing queue.                                                                       | Assigned/approved actor AAL2 access; routine operations/admin/support denials; manual transfer reference/version evidence; independent verification; no provider automation or external-link dependency. |
| 2.10.I7 | Implement version-aware amendment and governed medical-intake rights/lifecycle handling.                                                                                                   | Correction history, own export, restriction/deletion/holds, draft/submitted retention and recovery reconciliation; no premature claim that a rights request fulfilled itself.                            |
| 2.10.I8 | Verify isolated hosted synthetic intake and reconcile activation/rollback evidence.                                                                                                        | Owner-approved migrations/fixtures, real Auth/browser checks, manual generator walkthrough, scoped cleanup and revised runbook/RAG; no patient data, real charge or pilot activation.                    |

## Dependencies and Acceptance

Use the existing identity, assignment, receipt, private audit and operational-state foundations.
Do not grant clinical answer access just because a role can claim a queue item. I1 must freeze the
minimum new authority contract rather than quietly widening existing `operations` permissions.
I6 must separate medical-answer access from independent nonclinical verification and define
permitted roles/assignment combinations explicitly. Staff entry alone is not access authority.

Submission must commit a versioned questionnaire snapshot and exact declaration receipt before
success. Subsequent corrections create attributed versions; staff transfer references the actual
reviewed snapshot. Payload-free events record access/transfer/result, never questionnaire text.
Questionnaire submission, a safety flag, deposit payment, provider receipt and treatment approval
remain distinct facts. No bloods-required transition blocks initial submission.

The deposit/order timing relative to draft/submission and manual transfer must be reconciled in
I1 with DR-013 and Sprint 11. Do not make an unapproved financial dependency or fake paid state.
Protect supported free-text answers with explicit size limits and safe rendering; never place them
in the general operational queue. Define a secure mapping to the generator and recipient-specific
disclosure/authorisation before transfer; the DOCX alone does not prove all generator inputs exist.

Apply the normal unit, database, authorisation, type/lint/build and desktop/mobile browser matrix.
Serialize database/build gates. Hosted writes, emails, fixtures and cleanup need explicit approval;
the repository owner retains staging, commit, push and deployment control.

## Outstanding Inputs and Closure

Task I1's [frozen engineering contract](sprint-10-i1-medical-intake-contract.md) and
[source catalogue](sprint-10-i1-question-catalogue-v1.json) now verify all eight sections and 24 source
items against the original DOCX hash and three rendered pages. They preserve the approved prompts,
separate reviewer notes and freeze owner-approved field/branch/access/safety/lifecycle defaults.
On 5 October the owner authorised an additional Meneer-side sex field and approved the remaining
recommendations. Collection version 1.1.0 adds that explicit unselected field without rewriting the
24 original items or claiming Dr Zee approved the addition. No automatic male answer or gender
identity inference. Private clinical appointments, safety response configuration and domain
publication/retention/processing evidence remain pre-launch gates. I1 is complete at contract level;
I2 may implement synthetic local persistence/contracts. No live collection or provider-code change.

I1 freezes field/branch/signature/grant/hold semantics and retention engineering baselines. Remaining
operational inputs are private reviewer/transcriber and primary/fallback appointments, safety-response
configuration and reviewed publications/processing schedules. The owner-approved sex extension needs
clinical publication review; the original question wording is not reopened. Public copy is unchanged.

I2–I7 now have accepted local implementation and controlled evidence (including the full 180-case
desktop/mobile browser matrix) in the
[progress record](sprint-10-intake-implementation-progress.md); I8 hosted release/rehearsal and
acceptance remain open. All seven approved prerequisite/intake migrations are applied hosted, with
no seed or activation. Owner deployment, dedicated-key provisioning and isolated provider-backed
rehearsal remain pending; fresh generator access currently reaches the subscription gate. This does
not claim that every task or the expanded sprint is closed.
Existing TD-009/TD-037/TD-038/TD-043 cover its hand-off,
rights, accessibility and routed-support obligations; no new defect or debt ID is asserted merely
because scope expanded. Any discovered implementation defect is recorded during the relevant task.
Sprint 10 cannot close at the revised scope while hosted acceptance is outstanding. Sprint 11 sandbox payment,
Sprint 12 support and Sprint 13 go/no-go remain required; real Stripe charges are separately approved.
