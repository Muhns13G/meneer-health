---
evidence_id: phase-02-sprint-10-intake-task-01
task: 2.10.I1
status: completed-contract-frozen-release-gated
question_version: 1.0.0
collection_version: 1.1.0
control_version: 1.0.0
last_updated: 2026-10-05
related_debt: [TD-009, TD-037, TD-038, TD-043]
---

# Task 2.10.I1 — Medical Intake Field and Authority Contract

## Outcome and Authority

The source catalogue is verified and the engineering contract is frozen for local I2 implementation.
On 5 October 2026 the owner approved the remaining recommendations and explicitly authorised a
Meneer-side sex input for generator mapping. This does not modify the provider's source code or
extend Dr Zee's original approval to the added field. Clinical/privacy publication and private
appointment evidence remain pre-launch gates, not ambiguous schema decisions.
DR-018 approves first-party collection and preserves Dr Zee's owner-attested question approval.
The controls below distinguish owner-approved implementation decisions from outstanding
clinical/operational appointments. No questionnaire, schema, role grant or hosted collection is
activated by this document. Task 10.8 is committed and locally verified; its hosted release gate
remains separate. I1–I8 precede 10.9/10.10.

Authority: DR-005, DR-007, DR-013, DR-014, DR-015, DR-016 and DR-018. DR-018 overrides the old
external-only intake scope, not clinical authority or least-privilege account/queue boundaries.

## Versioned Source and Copy Fidelity

Source: privately retained `Meneer_Medical_History_Questionnaire_Draft.docx`, SHA-256
`76d412344cd59d1ae66c7a0fb97a58e41f0802467f094a18ae8df8c1443d467a`.
All three rendered pages were inspected. There are no tracked insertions/deletions; the comments
part contains no comment text. This is owner-attested approval, not a privately verified signed
professional appointment. The document's original draft title remains provenance.

The [question catalogue](sprint-10-i1-question-catalogue-v1.json) captures **24 source items in eight
sections**, with zero-based source paragraph locators, original text and exact patient-facing text.
It includes all five conditional categories. Narrative wrapper labels/quotation marks are separated
from the quoted patient prompt. Mental/STI Yes/No options are separated from reviewer routing notes;
the condition checklist's implementation note is also retained separately. Reviewer notes, cover
material and “Questions for you” are never patient questions. No PHQ-9, scoring or diagnostic question
is added. Source publication still requires the controls and reviewing-party instrument below.

Original question text is immutable at `1.0.0`; changed questions require a new version and domain review.
Collection version `1.1.0` adds one separately attributed owner-approved sex field; the 24 original
source items remain unchanged. It requires clinical review before live publication, not a claim
that Dr Zee already approved it. The frozen control contract is `1.0.0` so units or access policy cannot
silently change the approved question text. All submission receipts bind both versions and hashes.
This JSON is a planning/source artifact, not imported by the application or a live publication.

## Owner Approved Field Contract

Drafts may be partial. Empty/missing answers never mean “No”, “none” or clinically normal. The
submission requirements below are owner-approved engineering defaults, not source-derived clinical rules.
Each narrative response records an explicit answer disposition (`provided`, `none`, `unknown` or
`declined`) where appropriate; applicability and patient labels require clinical/owner approval.
No invented negative answer fills a missing field. Direct safety questions retain the exact Yes/No
choices; unresolved responses require clarification rather than introducing an unapproved third option.

| Catalogue ID                                                                           | Approved representation and bound                                                        | Approved submission requirement                                                             |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `full_name`                                                                            | Plain Unicode text, 200 characters; prefill profile name with its version                | Required; snapshot does not mutate account profile                                          |
| `date_of_birth`                                                                        | Valid calendar date `YYYY-MM-DD`, no future date                                         | Required; no fabricated age, eligibility policy still separately approved                   |
| `identity_document`                                                                    | ID/passport type and number, at most 64 characters; encrypted medical identity field     | Optional pending demonstrated recipient need; no document upload                            |
| `contact`                                                                              | Verified account email displayed read-only; mobile E.164 snapshot from profile           | Required existing values; no implied mobile verification or recovery authority              |
| `measurements`                                                                         | Positive finite decimals: height in cm and weight in kg, each at most two decimal places | Required; no clinical ranges, BMI interpretation or default values                          |
| `gp_contact`                                                                           | Optional GP name/contact plain text, 500 characters                                      | Optional as explicitly stated in source                                                     |
| `health_history`                                                                       | Plain text, 4,000 characters plus explicit disposition                                   | Required response/disposition; never inferred from checklist                                |
| `medications`                                                                          | Plain text, 4,000 characters; preserves name/dose/frequency narrative                    | Explicit response/disposition; no drug normalisation, recommendation or invented dose       |
| `allergies`                                                                            | Plain text, 4,000 characters; preserves allergy/reaction narrative                       | Explicit response/disposition; empty is not no allergy                                      |
| `diagnosed_conditions`                                                                 | Only the six source conditions; explicit completion/none/unknown, no duplicate flags     | Explicit response; preserve uncertainty, do not diagnose                                    |
| `family_history`                                                                       | Plain text, 4,000 characters plus disposition                                            | Explicit response/disposition; no inferred ages of onset                                    |
| `lifestyle`                                                                            | Plain text, 4,000 characters plus disposition                                            | Explicit response/disposition; not marketing/behavioural analytics                          |
| `mental_history`                                                                       | Plain text, 4,000 characters plus disposition                                            | Explicit response/disposition; not a screening score                                        |
| `mental_safety`                                                                        | Source Yes/No, no preselected answer                                                     | Explicit response; affirmative/unknown cannot auto-clear safety review                      |
| `sexual_history`                                                                       | Plain text, 4,000 characters plus disposition                                            | Explicit response/disposition                                                               |
| `sti_symptoms`                                                                         | Source Yes/No, no preselected answer                                                     | Explicit response; affirmative cannot auto-continue standard processing                     |
| `category_ed`, `category_hair`, `category_weight`, `category_trt`, `category_peptides` | Each selected category has its own plain text response, 4,000 characters                 | At least one category; explicit response/disposition for each selected branch               |
| `accuracy_declaration`                                                                 | Exact source text; unchecked boolean                                                     | Affirmative separate action required for submission                                         |
| `doctor_review_consent`                                                                | Exact source text retained, but not publishable until reviewing relationship is verified | Separate unchecked action; no implied treatment approval                                    |
| `signature`                                                                            | Typed full name, 200 characters, plus server-generated UTC timestamp                     | Required submission attestation; no signature image/biometric or asserted legal sufficiency |

Engineering limits: decoded JSON maximum 64 KiB; reject unknown keys, unsupported versions,
invalid UTF-8/control characters and over-limit values server-side. HTML is never accepted as markup;
plain text is escaped when rendered. Do not truncate submitted answers. Boundaries are resource
controls, not medical decision thresholds. No uploads, reports, blood values or protocol fields.

Additional field `sex`: label **Sex**, required on submission with no default/preselection. Values
are `male`, `female`, `intersex`, `prefer_not_to_say`, displayed as the corresponding observed generator
labels. The patient must actively choose; draft absence is allowed. Do not infer male from the men's
health positioning, name, ID, selected category or account. Do not equate this with gender identity,
add a gender-identity question, infer anatomy/pregnancy or add automatic clinical eligibility rules.
It remains in the protected medical snapshot, not the minimum profile, general queue or analytics.
The reviewer reconciles the explicit answer with the generator; any required clarification remains
unresolved rather than becoming a guessed value. Provider field changes require a new mapping review.

## Branches, Versions and Commercial Timing

Approved multi-select uses exactly ED, hair, weight, TRT and peptides; all selected source branches
remain accessible. Treatment-category selection is not product selection or suitability approval.
Keep deselected answers only in the restricted private draft with an explicit inactive marker so
switching back does not lose work. Exclude inactive branches from submitted/transfer snapshots;
confirm this exclusion on the review screen. Never silently delete a submitted branch or reuse an
old answer as a newly submitted response. A changed submitted answer creates an attributed amendment
linked to the original version; a materially changed questionnaire requires explicit reconfirmation.

Existing approved boundaries: initial intake is free, bloods are not a submission prerequisite,
and no product charge occurs without clinical approval. Approved implementation sequencing is draft → submitted
snapshot/declaration receipt → safety/clinical review readiness → applicable R999 deposit gate before
provider review/manual transfer. Sprint 11 must reconcile the exact paid-review trigger and refund
policy; no fake paid flag or deposit prerequisite is added to draft/submission. Later requested blood
tests can pause clinical progression but never rewrite initial submission requirements.

## Generator Mapping and Missing Input

This is based on the 2 October synthetic portal investigation, not a new compatibility assertion.
No private endpoint, provider webhook or automated portal control is used.

| Observed generator input                      | Source mapping                                                            | Required disposition                                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| First name, last name, patient email, consent | Profile snapshots and separate source declaration/recipient authorisation | Reconcile name split manually; account receipt is not provider consent                                                     |
| Optional phone                                | Profile mobile snapshot                                                   | Preserve unverified status; no contact export beyond approved purpose                                                      |
| Required age                                  | DOB                                                                       | Clinician/manual calculation as of review date; retain calculation date, never alter DOB                                   |
| Required height/weight                        | cm/kg measurements                                                        | Verify displayed units before manual entry; never guess conversion                                                         |
| **Required sex**                              | **Owner-approved Meneer extension, absent from original source**          | **Explicit unselected patient input; clinical review before publication. Never infer male or change the provider's code.** |
| Optional goals                                | Category narratives                                                       | Not equivalent; clinician chooses only genuinely supported goals, without automatic mapping                                |
| Conditions, medication/supplements, allergies | Direct responses plus narrative                                           | Manual professional reconciliation; unmatched or uncertain content is not “none”                                           |
| Pregnancy/breastfeeding                       | Absent from source                                                        | No inferred negative; responsible reviewer resolves if required for the case, new Meneer question needs review             |
| Optional reports/lab values                   | No intake mapping in this packet                                          | Leave unavailable; no mandatory blood upload or invented normal results                                                    |
| Additional notes and review                   | Relevant source narratives only                                           | Minimum authorised manual entry; no copying unrelated branches or queue notes                                              |

The generator's previously observed inconsistent rounding and dashboard/library counts remain
provider-review gates. No generated protocol is returned to Meneer or treated as a clinical decision
until the responsible professional reviews it independently.

## Owner Approved Medical Access Contract

Reuse individual Auth identities and DR-007 session maxima. Medical grants are separate from an
operations assignment and have tenant, subject/intake version, purpose, allowed actions, approver,
start/expiry and revocation. An administrator provisions reviewed grants without reading answers
or approving their own access. Approved grants expire after seven days, are rechecked on every use
and end immediately on case closure, removal, restriction or safety reassignment where applicable.
The owner approved the seven-day maximum and separate grants. For implementation, medical review
requires the existing `clinician` role; manual transcription permits `clinician` or `operations` only
with a separately approved medical-transfer grant. Routine operations assignment still grants no
answer access. Domain appointments and field-specific roster approval are release gates before I6
is enabled. Private grants cannot be self-approved or inferred from an administrator's privileges.

| Actor                                             | Approved implementation permission                                         | Exclusions                                                                             |
| ------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Patient                                           | Own version-aware draft/read/submit/amend; governed own export             | No other subject, clinical decision, transfer acknowledgement or unrestricted download |
| Assigned `clinician` reviewer                     | AAL2, active professional appointment, medical-review purpose/grant        | No payment mutation or automatic prescribing                                           |
| Separately approved manual transcriber            | AAL2 plus explicit purpose/field/version grant and clinical owner approval | No routine `operations` access; no diagnosis/changes/approval or bulk export           |
| Independent nonclinical reconciler                | Existing assigned queue and opaque transfer/version/evidence facts         | No medical answers or protocol content                                                 |
| Routine admin/support/operations/finance/pharmacy | Administrative statuses only under their existing authority                | No answer/ID/DOB access through role alone                                             |
| Privacy/auditor                                   | Case-scoped reviewed rights/evidence process                               | No unrestricted medical browse; no silent history edits                                |

Manual transcriber access is an owner-approved explicit DR-007 refinement, not an existing permission.
Use no new broad role or shared provider login. Private roster identifiers and appointment evidence
stay outside Git; role titles can be approved here. No break glass. No answer in URLs, browser storage,
email/alerts, telemetry, Stripe metadata, general queue or analytics. Private no-store responses,
bound requests, safe errors, encrypted recovery and payload-free access/transfer audit are mandatory.

## Safety Contract and Pre Launch Appointments

Retain the exact mental-health/STI questions. The owner approves the following implementation
response for synthetic/local work; responsible clinical endorsement and appointments remain gates
before collection. This is not a diagnosis, screening score or verified clinical service promise:

- Affirmative mental-health answer: immediately show clinician-approved urgent guidance using the
  existing verified emergency routes; do not promise instant Meneer response. Persist a private
  safety-review hold and notify only generic review-required intent to the appointed responder.
- Affirmative STI answer: pause the standard pathway for an authorised clinician to determine the
  appropriate consultation/referral. Do not diagnose an STI or automatically reject the account.
  The standard processing hold is the conservative implementation default; the clinician determines
  consultation/referral and must endorse patient guidance before publication.
- Missing direct safety answers never become negative or clear a hold. Partial draft save remains
  possible; submission requires explicit Yes/No. An unresolved draft retains clarification state,
  and a recorded affirmative flag retains its hold even if later answers change, until reviewed.
- Questionnaire receipt can be recorded without claiming clinical clearance. A hold prevents manual
  transfer/paid-review progression until the approved professional records an attributed outcome.
  Flags received during draft work also need the approved safety pathway; do not wait for a final
  submit before showing guidance or silently discard a flagged draft.
- Appoint primary clinical responder and fallback, acknowledgement deadline and after-hours path.
  DR-016's `clinical@meneerhealth.co.za` alias alone is not that appointment. Its qualified 24-hour
  general response target is not an urgent clinical SLA. If delivery/owner/acknowledgement fails,
  retain the hold and route a generic failure to the accountable escalation owner; never auto-clear.

Named private roster references may remain confidential, but accountable role, fallback and response
rules must be explicit. A general support mailbox or administrator cannot replace clinical review.
Only the approved professional can release a safety hold; their authority, rationale/evidence and
snapshot version must be recorded privately with non-content audit. I5 tests all failure paths.
For implementation, primary and fallback are independently appointed `clinician` reviewers with
active medical-safety grants. No named person, mailbox recipient or response deadline is invented.
These are explicit versioned deployment configuration: primary roster reference, fallback roster
reference, acknowledgement deadline, after-hours route and reviewed guidance version. Missing or
expired configuration means **safety service unavailable**, not activation with a 24-hour default.
Only synthetic fixtures may exercise that unavailable state before appointment/configuration approval.

## Instruments, Processing and Retention

Before collection publish separately reviewed versions of: medical-intake privacy/processing notice;
exact accuracy declaration; clinically reviewed doctor-review declaration identifying the actual
reviewing arrangement; and recipient-specific manual-transfer authorisation with minimum fields,
purpose, private method, responsible party, refusal/withdrawal consequences and destination version.
These actions are separate from account terms, marketing, payment and treatment approval. No new
agreement is inferred from old receipts. The source's “Meneer-affiliated doctor” wording is preserved
in the catalogue but cannot assert an unverified relationship in an acceptable publication.

The amended data map must cover OCTOTHORP ZA/Meneer custody and the actual provider/clinical roles,
Supabase London storage, Cloudflare processing, EU R2 encrypted recovery, Brevo payload-free alerts,
the manual provider destination and the incident/exit chain. Health data is not sent to Stripe.
Medical payloads and identity numbers use a separate versioned medical envelope: AES-256-GCM,
fresh 96-bit nonce per write, authenticated tenant/intake/snapshot/question/control-version binding,
key identifier and ciphertext only in private persistence. A separate 32-byte server-only key is
managed under existing secret/key-custody governance, never reused from session/journey/recovery
keys. Synthetic local keys only in I2; hosted provisioning requires explicit authorisation later.
Rotation retains reviewed old-key decryption until governed re-encryption/retention completes.
No clinical search index or plaintext answer metadata. A general service credential is not answer-read authority.

Approved unsubmitted ordinary-draft expiry: 30 days after last patient save, with advance in-portal
notice and an explicit expiry timestamp. A safety/clinical/rights/dispute hold overrides ordinary
draft deletion; a flagged draft is not disposed of as an abandoned blank form. Submitted and
clinically material records follow DR-005's minimum six-year dormancy/last-treatment baseline and
longer applicable exceptions, subject to the actual clinical/privacy custodian confirming the trigger.
Do not reuse the profile's 90-day closure rule or claim indefinite retention. Corrections are new
versions; export is scoped and authenticated, deletion/restriction requires governed review, and
provider copies need independent reconciliation. Backups remain rolling 35 days; restored records
must reapply current deletion/restriction/hold dispositions before access. I7 proves these operations.

The baseline is not a universal legal conclusion. [HPCSA recordkeeping guidance](https://www.hpcsa-blogs.co.za/guidelines-on-patient-recordkeeping/)
distinguishes health-record dormancy and professional recordkeeping; DR-005 retains responsible
clinical/privacy confirmation rather than guessing which schedule applies to each incomplete draft.

## Approval and Remaining Pre Launch Gates

| Area                      | Frozen engineering decision                                                                                                                                     | Remaining release evidence                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Fields/branches/signature | Owner-approved field bounds, explicit dispositions, cm/kg, multiple categories, draft-only inactive answers, typed name/server timestamp; ID and GP optional    | Domain review of rendered collection/declaration                                                                 |
| Generator mapping         | Explicit unselected sex extension; no inferred pregnancy/sex/goals or altered provider code; manual name/age/unit reconciliation                                | Clinician review of added field and recipient compatibility                                                      |
| Safety                    | Affirmative hold, no automatic clearance, missing-answer clarification; only appointed clinical grant holders can resolve                                       | Primary/fallback private roster, acknowledgement deadline, after-hours route and reviewed guidance configuration |
| Medical access            | Existing clinical reviewer; clinical/operations transcriber only with separate approved field/version/purpose grant; seven-day maximum                          | Professional appointment, independent grant approval and recipient authorisation                                 |
| Instruments/processing    | Separate versioned privacy, declaration, review and manual-transfer actions; no reuse of account/marketing receipt                                              | Actual reviewing/provider contracts, custodian allocation and reviewed publications                              |
| Lifecycle/encryption      | 30-day ordinary draft expiry with hold override; submitted medical baseline/longer exceptions; versioned separate-key envelope; no automatic profile-rule reuse | Custodian confirmation, authorised hosted key custody and tested I7 disposition/recovery                         |
| Commercial timing         | Free draft/submission; no mandatory blood/deposit prerequisite; paid review gate separate                                                                       | Sprint 11 exact deposit/manual-transfer trigger and release evidence                                             |

The table above distinguishes frozen engineering decisions from remaining release evidence. Owner approval on 5 October settles technical
requiredness/dispositions/bounds, branches/signature representation, draft/submission timing,
role/grant semantics and retention engineering baseline. Sex is resolved through the explicit Meneer
extension; pregnancy/breastfeeding is not newly collected or inferred and remains professional
reconciliation where required. The six-year baseline remains subject to applicable longer exceptions.
Clinical/privacy/legal publication endorsement, named roster evidence, response configuration,
provider agreements and final commercial release remain pre-launch gates; none is asserted complete.
This bounds implementation without manufacturing appointments or changing clinical question approval.
Task I1 is **completed-contract-frozen-release-gated**; next is I2 local persistence/contracts.
No new debt ID. Existing intake/rights/accessibility/escalation debts retain their scope.

## Evidence and Files

Source hash, 24-item/eight-section exact-text comparison and three-page visual inspection passed.
No completed answers, provider credentials, private roster or original DOCX binary was added to Git.
New files: this contract and `sprint-10-i1-question-catalogue-v1.json`. Existing plan/amendment and RAG
files record the frozen engineering contract and retained release gates. No runtime, schema, hosting,
staging, branch or commit change. The original source catalogue was rechecked after the extension:
all 24 original items remain exact; the new field has distinct non-source provenance.
