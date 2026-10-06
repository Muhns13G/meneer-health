---
plan_id: phase-02-sprint-12-4
title: Staff Support Follow-up and Governed Delivery Review
status: completed-local
last_updated: 2026-10-06
owner: "@Muhns13G"
depends_on: [phase-02-sprint-12-3]
---

# Task 2.12.4 — Staff Follow-up and Failed Delivery

## Outcome and boundary

Implemented on `itws-I` against committed Task 12.3 baseline `6296c93`. `/staff/support` provides
purpose-scoped support acknowledgement/resolution, private notification delivery review and
administrator-only coverage review. Existing staff operations/alert pages link to it. No public
marketing, clinical, emergency or privacy wording changed; no dependency or environment variable
was added. This completes the engineering/local slice, not hosted operational acceptance.

No hosted migration, secret transmission, provider configuration, actual email, Git staging,
branch change, push or deployment occurred. Transport remains default-disabled and the real
pilot remains governed by existing activation gates. Task 12.7 owns complete released staff
accessibility review; 12.8 owns authorised hosted inbox/failure/acknowledgement/fallback proof.
TD-037, TD-038 and TD-043 stay Open; no new debt ID accrued.

## Implemented behaviour

| Boundary                      | Implemented behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staff authority               | Sealed staff proof, fresh provider/app session and AAL2, current tenant/role/purpose and private primary/alternate coverage. Clinical cases/receipts stay with clinical owners; operations cannot read privacy or clinical support. Administrators see unavailable purpose coverage only, without client cases or transport details. Missing, revoked and ambiguous coverage remains unavailable.                                                                       |
| Support queue                 | Reuse 12.3's immutable case and human-response commands. Current purpose owners can acknowledge and then resolve. An overdue primary cannot override alternate escalation. The private queue shows minimal purpose, state, timestamp and allowed action; no medical answers, complaint body, client profile or payment details.                                                                                                                                         |
| Delivery queue                | Up to 20 scoped items, failures/deferred work first. Show pending, leased, retryable, accepted-unconfirmed, attributed-delivered, failed, uncertain, suppressed and budget-deferred evidence separately. Provider soft/error delivery failures remain visible. No address, provider message identifier, diagnostic, source payload or financial amount is exposed.                                                                                                      |
| Review journal                | New forced-RLS append-only actions record actor, tenant, notification, fixed reason, stable request key and observed transport revision. Reading is not acknowledgement. Review resolution confirms secure follow-up, not email delivery, clinical clearance or a refund. A later transport/provider revision reopens review without rewriting prior resolution.                                                                                                        |
| Resend                        | AAL2 owner acknowledgement first, exact fixed reason and stable replay key. Requeue only definite non-acceptance or independently reconciled uncertain transport, with fresh verified recipient/profile/membership/channel, unchanged destination, no suppression, no accepted/delivery evidence and remaining shared budget/three-attempt capacity. Requeue does not send immediately or reset attempts; the existing sender rechecks recipient authority and backoff. |
| Independent uncertainty proof | A separate private immutable record identifies the exact last lease, evidence hash, approval reference, independent current administrator reviewer and expiry of at most 24 hours. No browser/service setter can fabricate it. The purpose owner cannot self-approve uncertainty. Missing/expired/revoked proof leaves resend unavailable. This is an engineering gate, not a claim that a provider has supplied non-acceptance evidence.                               |
| Late evidence                 | The existing sender is wrapped under its shared advisory lock. A late accepted/delivery fact or expired uncertain-send proof contains the requeue before another claim. The retired inner sender cannot be called by the service role. No second sender, quota or provider idempotency key is introduced.                                                                                                                                                               |
| Replay/rate                   | Identical action replay returns the original receipt; changed action/reference/reason conflicts. Distinct repeated resend of already pending work fails. Mutation rate is bounded at 30 actions per actor/hour alongside existing request limits. Suppression cannot be removed by staff UI.                                                                                                                                                                            |
| UI lifecycle                  | Explicit load after staff MFA; no automatic mutation. Clear old private data before each refresh/action and on denied, malformed or uncertain response. Preserve the same key for an uncertain action retry after reload. Abort on unmount and hide queues at the exact fresh-session deadline. Keyboard controls/status focus, responsive layout and hydration-disabled load prevent false pre-hydration interaction. No browser storage or query-string identifiers.  |

The new queues do not ingest mailbox bodies. Ordinary email transport remains the existing generic
client notice and operations/safety mechanisms; no staff recipient is invented. Staff follow-up is
performed in this authenticated queue, not by treating an inbound email as clinical/payment authority.
Missing/expired policy versions require approved coverage restoration; the interface never silently
reassigns historical cases to a newly appointed owner or grants administrators clinical access.

## Migration and files

The CLI created the migration at `20261006151433`; its new, unapplied timestamp was ordered to
`20261006152001` so replay follows the already committed `20261006152000` prerequisite. No committed
filename or hosted migration-history row was modified. New audit tables are within existing
recovery schema coverage. Queue/join indexes support the implemented bounded reads.

| Kind                 | Files                                                                                                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New runtime          | `src/components/StaffSupportPage.tsx`; `src/routes/staff.support.tsx`; `src/domain/support/staff-followup.ts`; `supabase/migrations/20261006152001_staff_support_followup.sql`                                  |
| New tests            | `src/components/StaffSupportPage.test.tsx`; `src/domain/support/staff-followup.test.ts`; `supabase/tests/database/staff_support_followup.test.sql`; `e2e/staff-support.spec.ts`                                 |
| Modified integration | `src/server/support/support-http.ts` and its tests; `src/server.ts`; request-security registration; `src/components/StaffQueuePage.tsx`; `src/components/StaffAlertsPage.tsx`; generated `src/routeTree.gen.ts` |
| Documentation        | This packet; Sprint 12 plan; Phase 02 overview; RAG current state/limitations/index; debt registry; Cloudflare release runbook                                                                                  |

## Verification

Local fresh-schema replay, pgTAP, strict payload/HTTP/component tests and desktop/mobile browser
checks verify the implemented boundaries. Positive browser queue data is intercepted synthetic
data; it is not evidence of hosted Auth, provider delivery or a real owner appointment. Actual SQL
packets independently verify current authority, role/tenant denial, immutable facts, replay,
suppression, quota and late-evidence containment.

- Fresh migration replay passed all 33 database suites/1,550 assertions, including 70 new follow-up
  assertions. SQL lint and local security advisors at error level passed without findings.
- Existing shared-budget race passed eight concurrent claims/one winner, capacity 50 and baseline
  restoration. Identity security passed five suites/168 assertions; operations rehearsal passed
  nine suites/513 assertions, rollback-only with unchanged payment adapters and no emails.
- Targeted application checks passed 16 component, strict-payload and HTTP tests. Desktop/mobile
  Playwright/axe passed ten staff/patient/public-support checks, including anonymous denial,
  keyboard acknowledgement, stale-data clearing and absent resend controls for uncertainty.
- Node 22 production build, client-bundle/MCP-absence and generated Worker type check passed.

- Final full application suite passed 128 files/825 tests; typecheck, ESLint, portability and
  public-discovery checks passed. All 184 indexed paths and 276 relative links across the seven
  changed Markdown documents resolve; frontmatter parses successfully. Formatting and diff
  whitespace checks passed.
- Local Supabase was stopped after the completed matrix, retaining its development backup.
  Owner commit and remote CI remain owner-controlled; no hosted operational proof is claimed.

Screenshots were inspected at desktop/mobile widths. Axe and keyboard checks supplement, not
replace, manual assistive-technology acceptance. `agent-browser` is unavailable on this workstation;
the existing managed Playwright browsers provided the visual/console/interaction verification.
The Supabase security review verifies restricted execution and empty search paths, consistent with
the [database function guidance](https://supabase.com/docs/guides/database/functions).
Email-reliability guidance informs stable retries/suppression, while the approved 12.1 contract
retains stricter uncertain-send containment instead of blindly retrying generic timeouts/5xx.

## Release and next task

After owner approval, apply notification, purpose-routing and staff-follow-up migrations in order;
deploy through the repository owner. This task neither checked nor changed hosted migration state.
Keep notification transport disabled until the separately authorised isolated 12.8 rehearsal.
Privately verify primary/alternate roster and independent review authority before populating any
policy/evidence. Never copy local seeds, self-certify uncertainty from a browser click, bypass
suppression, upgrade a quota automatically or activate the real pilot from local evidence.

Before permitting an uncertain resend, obtain independently reviewed provider evidence proving
the exact attempt was not accepted. Record its hash/reference, independent administrator and
short expiry through the approved privileged migration/operations process, with explicit owner
approval. If that evidence is unavailable, leave the item uncertain and use approved secure
follow-up; do not improvise an email resend or delete immutable facts.

Next: Task 12.5's client-form accessibility checks, followed by 12.6/12.7 live flow review and
12.8's operational rehearsal. Phase 02 and Sprint 12 are not closed by this task.
