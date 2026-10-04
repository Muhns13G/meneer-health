# Private Portal Hand-off Runbook

Task 2.10.6 implements this path locally under DR-017. It is not enabled for real clients. No
questionnaire answer, protocol, prescription, PDF, patient name or provider URL belongs in queue
notes, logs, payment metadata, ordinary email or this document.

## Configuration and Activation

1. Obtain the actual provider patient-intake URL privately; the staff login is not an intake URL.
   Verify recipient identity, privacy allocation, consent instruments and the intended workflow.
2. The repository owner configures server-only `HANDOFF_INTAKE_URL`, `HANDOFF_DESTINATION_ID`
   (opaque UUID) and `HANDOFF_DESTINATION_VERSION` (positive integer). Never use `VITE_*` or commit
   the URL. The server validates HTTPS and derives a digest of the exact configured URL.
3. A current AAL2 administrator in `security_administration` reviews the destination and records an
   opaque approval reference through the private workforce panel. Approval is tenant-bound and
   expires after 30 days. A changed URL requires a new approved version and updated authorisation;
   a higher version invalidates the older one. No approval is seeded or inferred from configuration.
4. Obtain separate approval to apply all six Sprint-10 migrations hosted and exercise only an
   isolated synthetic tenant/identity. Never copy the full local seed. Verify success, expired or
   withdrawn authority, wrong roles/assignments, audit failure and uncertainty before activation.
5. Sprint 11 must supply the authoritative deposit adapter and positive payment proof. Its current
   false result blocks real issuance. Final recipient instruments, clinical responsibilities and
   commercial/operational approvals remain required; this task does not publish them.

## Deliver, Inspect and Reconcile

1. The assigned claimant prepares an attempt and begins delivery. This persists intent only.
2. The patient opens the provider intake through the authenticated portal. The protected endpoint
   checks live account/session, current instruments and recipient authorisation, destination,
   assignment/claim and payment readiness. A private issuance event commits before URL disclosure.
   The response is no-store/private; the client navigates without retaining the URL in its projection
   or browser storage. Five-minute same-key replay rechecks authority; blind reissue is rejected.
3. A **different**, currently assigned AAL2 operations reviewer inspects the actual external record.
   The reviewer submits only the observed administrative state, opaque external-record/observation
   UUID references and observation timestamp. Never infer receipt from opening a link or aggregate
   dashboard totals. Keep any mapping needed to inspect a provider record in approved private
   operational evidence, not public documentation or queue fields.
4. Give the returned evidence UUID to the claimant, who reconciles through the existing command
   controls. Delivery, provider acknowledgement, review-pending and administrative outcome are
   separate facts. Evidence expires after 24 hours and must match the same external record.
   No administrative outcome authorises treatment, dispensing, payment or product selection.

## Uncertainty and Revocation

On timeout, record uncertainty and inspect the provider record before retrying. Do not automatically
resend. A definite non-delivery requires independently verified evidence and immutable exception
resolution before a linked retry. Cancellation of uncertain work also requires appropriate evidence.
Cancellation preserves prior delivery; it cannot retract externally received information or revoke
a reusable provider URL already disclosed. Provider-side access revocation requires its own approved
procedure. Expired/revoked sessions, withdrawal, recipient revocation and failed audit deny new
disclosure; prior external disclosure cannot be undone by these local controls.

## Local Evidence

`bun run db:reset`, `bun run db:test`, `bun run db:lint` and
`bun run test:identity:security` run sequentially against disposable local Supabase. The private
channel packet substitutes payment readiness only for its rollback-bound synthetic case; it is not
Stripe or hosted delivery proof. Run unit, type, lint, build and desktop/mobile E2E checks, then
`bun run db:stop`. Repository owner retains staging, commits, pushes and deployment control.
