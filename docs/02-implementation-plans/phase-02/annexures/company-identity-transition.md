---
title: Meneer Health legal-entity replacement
status: source-ready-owner-deployment-and-publication-pending
last_updated: 2026-10-13
audience: internal
sensitivity: internal
---

# Approved legal-entity replacement

The owner confirms Meneer Health (Pty) Ltd is operator, seller and responsible party; its registered
office is the service address. VAT registration is undisclosed. Octothorp LLC remains the payment
collector on behalf of this company. Existing support/privacy email and telephone remain unchanged.
This supersedes current Octothorp ZA disclosure facts, not historical receipts or Stripe ownership.

## Public facts and evidence

- Legal name: **Meneer Health (Pty) Ltd**.
- Registration: **2026/652695/07**.
- Registered office: **14 College Road, Rondebosch, Western Cape, 7700, South Africa**.
- Incorporation: **17 August 2026**.
- The ten-page CIPC certificate was read and visually reviewed; its In Business status is as at
  issue date, not a live registry check. It is not evidence of VAT, clinical licence or Stripe approval.
- Keep the original certificate private. Do not commit it, director identity numbers or personal
  certificate contacts. Only approved public company facts belong in source.

## Implemented locally

`content/company-profile.ts` centralises current facts. Public terms/privacy, support ownership,
campaign operator lines and the compliance profile reference it. The old VAT property is removed,
not transferred or replaced by a false non-registration claim. Public website document dates and
versions advance; stale informational-only boundary wording is reconciled to enabled private
journeys and separate clinical/payment/consent controls. No provider account/key/tax setting,
financial transaction, clinical grant or hosting mode is changed.

Historical terms, approval packets and empty-baseline preparation scripts remain intact as evidence,
not current new-company publication authority. Do not rerun original preparation on the live pilot.

## Read-only hosted predecessor review

`prepare-company-notices.mjs` defaults to no-network. Explicit `--inspect` reads only published
documents and prepares ignored `.company-identity-publication.local`, with no publication or send.
The exact inventory is two account/privacy documents at 1.1, one deposit publication at 1.0.0,
and one medical-intake publication at 1.1.0. Account hashes use body SHA-256; commerce checks its
native JSONB version/locale/supplier/body hash. Medical answers are not read.

| Successor copy     | Proposed version                    | Body SHA-256                                                       |
| ------------------ | ----------------------------------- | ------------------------------------------------------------------ |
| Account terms      | 1.2                                 | `9512a91164aa8383b874a19f23c11c57bc0b74155aab1673d1333e93d8e2c961` |
| Account privacy    | 1.2                                 | `3cd2a8868280c339f2f7d7d966d6a6a68f2ab985baa7e982f4325bd517307f08` |
| Deposit terms      | 1.1.0                               | `4c5b326c52e390342ad2cd87a8833b3834dc7c08a42c1ed898844853f2a8f22c` |
| Intake privacy     | New publication, same questionnaire | `1b281fcf674e4af60de082a429b1c5914adf4361f287b8735aed14a1f31f03ea` |
| Intake declaration | Same successor publication          | `6b783684e127aaa50bbeeaf3e432b1ed78787710c0604d820ff64621c34a5d53` |

These are preview-copy hashes, not proof that successors are published. Commerce's final native
hash includes its additional fields. R999 price, deadlines, credit/refund promises, questionnaire
catalogue and professional/recipient/transfer restrictions are unchanged.

## Required coordinated hosted transition

1. Inventory original receipts, clients, pending admissions, drafts/snapshots and financial offers.
   Preserve concurrent genuine activity and accepted documents exactly.
2. Implement an authenticated re-acknowledgement screen for otherwise valid existing clients.
   Keep provider/session/contact/membership/quarantine checks; pre-ack access must be limited to
   document review/actions, not ordinary medical/financial access.
3. Write new receipts only after genuine client actions, with idempotent retries. Do not extend
   the narrow 1.0 → 1.1 staff-invitation compatibility registry to a different legal company, invent
   consent or reset its approved deadlines.
4. Publish new account/privacy/intake/deposit documents only after migration/source readiness and
   bounded acceptance prove existing clients are not stranded. New accounts use successors;
   existing medical collection uses actual applicable notices/actions, never rewritten snapshots.
5. Preserve accepted orders/payments and their original seller/version evidence. Revalidate
   unaccepted pending offers without changing prices, creating charges or altering refunds.
6. Any new hosted migration/publication needs its explicit approved packet, rollback rehearsal
   and independent readback. Owner controls source deployment; verify binding retention and
   production readiness afterward. Corporate-fact approval does not silently publish a draft.

Do not deploy company-facing public pages alone as proof private documents have changed. Hosted
publication and existing-client re-acknowledgement remain release dependencies. Current accepted
production signup and all real records are unchanged; no account reset or deletion occurs here.

## Validation and handoff

Three focused suites pass ten tests: shared facts, VAT omission, historical source preservation,
collector wording and both public disclosure pages. Strict TypeScript, scoped ESLint and Node22
production build/client-bundle/MCP checks pass. Route tests use the required `-` prefix. React
review retains derived text without new effects, dependencies or provider code in public content.
Previously staged changes belong to the owner and were neither staged nor unstaged here.
The company-source edits are unstaged. No deployment, publication, real receipt mutation, email or charge.

## Genuine account acknowledgement foundation — 13 October

The owner-approved `20261012224238_account_document_reacknowledgement.sql` is applied to hosted
Supabase. Its automatically assigned history version `20261012231425` was corrected to the canonical
filename under separate explicit approval. Forced RLS, immutable/orphan guards and service-only RPC
permissions passed readback. The service role has no direct journal insert privilege; anonymous and
authenticated roles cannot call these functions. Existing 11 Auth users, four profiles and eight
original receipts remain the baseline. No successor document is published by this migration.

The local `/account/documents` flow uses a dedicated ten-minute sealed review cookie, not an ordinary
patient session. Provider contact/session, active membership, genuine prior activation/receipts and
retirement quarantine are rechecked. Two unchecked current-version actions create new receipts;
exact retries do not duplicate them. Normal access starts only after current evidence passes, without
a second email code. The page GET/HEAD exception does not relax protected POST or body-framing checks.

Validation: 58 local SQL suites/2,863 assertions, 71 focused application tests before the final route
regression addition, then 55 tests across the six affected suites including that addition. Four new
desktop/Pixel browser checks pass with axe, keyboard, reflow, enlarged text, forced colours, explicit
actions, uncertain retry and expiry. Node 22 production build and strict TypeScript pass. Automated
checks are not a new manual spoken-screen-reader acceptance claim. React review retains aborted
read cleanup, explicit submit actions, a stable retry key, semantic labels and no added dependencies.

`rehearse-company-acknowledgement.mjs --sql` prepares a bounded rollback-only packet from the 22
account-review assertions, with fresh synthetic IDs and no full seed. Its native Auth fixtures are
SQL-only and do not prove hosted OTP delivery. Fixture changes are undone inside a subtransaction;
an internal all-row comparison then checks restoration before the outer ROLLBACK. Only booleans
leave PostgreSQL, never row contents or fingerprints. This packet passes locally and, following
separate explicit approval for the internal comparison, hosted. Hosted returned
`assertions_passed=true` and `full_row_baseline_restored=true`; all 22 cases passed. The first hosted
attempt found global version uniqueness still applies to superseded publications; the packet now
uses fresh synthetic version numbers instead of reusing real 1.1/1.2 versions. That failed transaction
rolled back. Successful proof retained no fixtures/publications and rewrote no real receipts.

## Medical and financial preservation implemented

The separately approved `20261012232415_company_document_preservation.sql` is hosted and
history-aligned (the provider-assigned `20261012233504` was corrected under explicit approval).
Default questionnaire reads select the client's original episode before selecting any new blank
episode. No publication ID, encrypted envelope, answer or snapshot is rewritten. A same-catalogue,
same-control/version/recipient/transfer successor adds a distinct privacy acknowledgement and
clinical-review consent, both unchecked initially. Their private immutable journal binds the intake,
subject, successor publication, hashes and retry key. Further writes and ordinary medical review/
transfer fail closed until these genuine actions exist. Medical-safety and rights safeguards are
retained, not converted into ordinary review permission. More extensive catalogue/recipient/transfer
changes fail closed and require their own migration, not this company-only compatibility path.

Accepted deposit offers continue to project their actual original seller/publication and acceptance;
new unaccepted offers bind the newest terms. No receipt, offer snapshot, settlement, amount, key,
refund or tax setting changes. Issued product quotes retain their existing exact-publication and
current-evidence gates; superseded unaccepted quotes require normal staff replacement, never silent
rewriting. This does not activate products or the generator. The published intake currently has no
transfer notice; its disabled transfer boundary remains unchanged.

The approved hosted preservation rehearsal passed with `preservation_checks_passed=true` and
`full_row_baseline_restored=true`. It used only an isolated synthetic tenant, SQL-only Auth/session,
opaque synthetic questionnaire envelopes and uncharged offers. All fixtures rolled back; current
account documents were read only, not superseded. Independent readback retained 11 Auth users,
four profiles, eight original receipts and zero new medical actions/test users. SQL-only Auth
fixtures are not a claim of fresh OTP/provider-delivery acceptance.

The approved follow-up `20261012234348_collection_notice_withdrawal_boundary.sql` is hosted and
history-aligned. It makes withdrawal/expiry of the latest effective medical notice a stop rather
than a fallback to the old company's notice. The hosted preservation/restoration rehearsal also
passes with this guard applied; no real records or publications changed.
Final local SQL proof passes 58 suites/2,882 assertions. Six account/medical browser cases pass on
desktop and Pixel with axe, keyboard, reflow, explicit actions, retained identity and safe retry.
No spoken-screen-reader claim is inferred. Background autosave failures retain the local answers
and draft warning without stealing focus; manual failures retain explicit status feedback.
The controlled notice browser tests isolate external fonts and await their mocked initial reads
before checking the rendered state. Their extended test budget covers four display/axe passes;
it changes no production session, request or authentication deadline.

The full Vitest suite passes 195 files/1,616 tests. Strict TypeScript, Node 22 production build,
client-bundle/MCP absence, discovery/portability and scoped ESLint pass. The final old public-content
version expectation was updated to the approved 2026.10.13.1 runtime source. Security advisors
report the established deny-by-default RLS/no-policy informational notices, including the new
private journals; do not add permissive policies to silence them. The pre-existing leaked-password
warning is unrelated to this passwordless client/email-OTP and workforce-TOTP transition. No Auth
configuration was changed. See the [advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
and [password-security guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Owner commit/deployment handoff

1. Manually stage and commit the complete diff, including all new migrations, tests, generated
   route tree and operation scripts. Existing staged work was preserved. No secrets, ignored local
   previews, CIPC original/director identifiers or clinical data belong in the commit.
2. Push/deploy the commit through the owner-controlled Cloudflare build. Preserve existing
   public-registration secret bindings, identity/medical keys and payment modes. No new secret,
   broad `keep_vars` change, rehearsal tenant switch or deployment rollback is required here.
3. Verify the deployed source/version: public terms/privacy show the new company, `/account/documents`
   serves its page, unproved review endpoints deny access, and public signup readiness remains
   enabled for the real tenant. Do not reuse a previously prepared Worker version from older source.
4. Refresh the read-only predecessor preview. `prepare-company-publication-sql.mjs` defaults to
   preparation only; its explicit `--sql` mode only prints the guarded transaction and executes
   nothing. It checks the canonical preservation/withdrawal migrations, exact predecessor hashes,
   owner subject and inventory. It prepares account/privacy 1.2, deposit 1.1.0 and a new medical
   publication with the same questionnaire/control versions and clinical/recipient/guidance facts.
   Old commerce/medical publications remain available for original contracts/episodes. Account
   predecessors become superseded; genuine new actions, not compatibility extension, restore access.
5. Obtain explicit approval for the exact publication packet and execute it only after deployment
   readback. First exercise that transaction with ROLLBACK and internal record comparisons. Then
   publish atomically and verify hashes, metadata and unchanged original records independently.
6. Verify one current account-action path, retained medical history/new notice actions and new
   financial disclosure; use expressly approved disposable fixtures if provider emails are needed.
   No real charge, SMS, extra client invitation or generator activation is authorised by this packet.

The source is prepared for owner deployment; **notice publication and routed post-deployment
acceptance remain release steps**, not claims of already released company documents. Production
continues on its prior notices until the guarded publication is approved and executed. Do not
disable the live cohort or replace production with an isolated rehearsal configuration.
