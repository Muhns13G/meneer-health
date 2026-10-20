---
packet_id: phase-02-sprint-15-10-file-inventory
status: closure-workspace-inventory
last_updated: 2026-10-21
owner: "@Muhns13G"
---

# Sprint 15 Closure — Net File Accounting

Baseline: `8211bf35ff9e38e16e589bea89b4cd8a61712442` (parent of 15.1's `1102d11`).
Snapshot: the historical 15.10 validation handoff's tracked staged/unstaged workspace plus
non-ignored closure documents, before owner commit. HEAD at that snapshot was
`ab649ca8c08a36e265931745ca3bbc520a6f8165`; the agent preserved the existing index.
The owner subsequently committed the batch as `f3e392dbe0036b45565d5cde8b288ca8d3e140c0`, with
green exact-commit CI and owner-confirmed deployment. The working tree was clean before the
documentation-only release-evidence amendment. This inventory is not a staging instruction;
the evidence amendment requires no application redeployment.

**273 net paths: 163 added, 110 modified, 0 deleted.**
No rename inference is used. This inventory includes itself and the completion report.

This wider interval includes owner-approved interleaved SMS/US delivery, email fallback,
resumable/public onboarding and company-notice changes. Those paths are explicitly accounted
for, not misrepresented as all being product-fulfilment implementation. The completion report
and individual task packets identify accepted boundaries. Generated route/binding files are
identified by name below and must be produced by their tools, not manually edited.
Ignored secrets, environment files, manifests, build outputs, browser results and temporary
validation configuration are deliberately excluded. Real price PDFs and practitioner costs
are not deliverables. The inventory is a net source snapshot, not a secrets scan or a billable
work/time reconstruction.

## Distribution

| Area        | Paths |
| ----------- | ----: |
| .github     |     1 |
| config      |     1 |
| content     |     7 |
| contracts   |     1 |
| docs        |    30 |
| e2e         |    20 |
| operations  |    13 |
| root        |     9 |
| scripts     |    24 |
| src         |   135 |
| supabase    |    31 |
| third-party |     1 |

## Paths

A = added; M = modified; D = deleted relative to the stated baseline.

| Change | Path                                                                                        |
| ------ | ------------------------------------------------------------------------------------------- |
| M      | `.env.example`                                                                              |
| M      | `.github/workflows/ci.yml`                                                                  |
| M      | `.gitignore`                                                                                |
| M      | `.prettierignore`                                                                           |
| M      | `bun.lock`                                                                                  |
| M      | `config/environment-catalogue.ts`                                                           |
| A      | `content/company-notice-transition.ts`                                                      |
| A      | `content/company-profile.test.ts`                                                           |
| A      | `content/company-profile.ts`                                                                |
| A      | `content/company-publication-plan.test.ts`                                                  |
| M      | `content/public-content-governance.test.ts`                                                 |
| M      | `content/public-content.test.ts`                                                            |
| M      | `content/public-content.ts`                                                                 |
| M      | `contracts/observability.ts`                                                                |
| A      | `docs/02-implementation-plans/phase-02/annexures/company-identity-transition.md`            |
| M      | `docs/02-implementation-plans/phase-02/annexures/live-payment-activation.md`                |
| A      | `docs/02-implementation-plans/phase-02/annexures/mobile-invitation-us-extension.md`         |
| A      | `docs/02-implementation-plans/phase-02/annexures/pilot-email-invitation-fallback.md`        |
| M      | `docs/02-implementation-plans/phase-02/annexures/pilot-sandbox-acceptance-2026-10-09.md`    |
| A      | `docs/02-implementation-plans/phase-02/annexures/public-onboarding-notice-update-draft.md`  |
| A      | `docs/02-implementation-plans/phase-02/annexures/public-onboarding-release.md`              |
| A      | `docs/02-implementation-plans/phase-02/annexures/sprint-15-1-product-order-contract.md`     |
| A      | `docs/02-implementation-plans/phase-02/annexures/sprint-15-10-closure-file-inventory.md`    |
| A      | `docs/02-implementation-plans/phase-02/annexures/sprint-15-2-private-product-catalogue.md`  |
| A      | `docs/02-implementation-plans/phase-02/annexures/sprint-15-3-client-catalogue.md`           |
| A      | `docs/02-implementation-plans/phase-02/annexures/sprint-15-4-staff-quote-drafts.md`         |
| A      | `docs/02-implementation-plans/phase-02/annexures/sprint-15-5-product-evidence.md`           |
| A      | `docs/02-implementation-plans/phase-02/annexures/sprint-15-6-issued-product-quotes.md`      |
| A      | `docs/02-implementation-plans/phase-02/annexures/sprint-15-6-product-terms-review-draft.md` |
| A      | `docs/02-implementation-plans/phase-02/annexures/sprint-15-7-manual-product-fulfilment.md`  |
| A      | `docs/02-implementation-plans/phase-02/annexures/sprint-15-8-order-next-actions.md`         |
| A      | `docs/02-implementation-plans/phase-02/annexures/sprint-15-9-hosted-product-rehearsal.md`   |
| M      | `docs/02-implementation-plans/phase-02/README.md`                                           |
| M      | `docs/02-implementation-plans/phase-02/sprint-14-mobile-pilot-invitations.md`               |
| A      | `docs/02-implementation-plans/phase-02/sprint-15-product-orders-manual-fulfilment.md`       |
| M      | `docs/03-completion-reports/phase-02/phase-02-minimum-pilot-enablement.md`                  |
| A      | `docs/03-completion-reports/phase-02/sprint-15-product-orders-manual-fulfilment.md`         |
| M      | `docs/04-technical-debt/technical-debt-registry-v1.md`                                      |
| M      | `docs/06-operations/cloudflare-environments-release-runbook.md`                             |
| M      | `docs/06-operations/medical-intake-release-recovery-runbook.md`                             |
| M      | `docs/RAG/02-current-state.md`                                                              |
| M      | `docs/RAG/05-decision-register.md`                                                          |
| M      | `docs/RAG/06-known-limitations.md`                                                          |
| M      | `docs/RAG/07-index.json`                                                                    |
| A      | `e2e/account-documents.spec.ts`                                                             |
| M      | `e2e/boundaries.spec.ts`                                                                    |
| M      | `e2e/client-form-accessibility.spec.ts`                                                     |
| M      | `e2e/client-form-checks.ts`                                                                 |
| A      | `e2e/client-products.spec.ts`                                                               |
| M      | `e2e/fixtures.ts`                                                                           |
| M      | `e2e/identity-activation.spec.ts`                                                           |
| M      | `e2e/medical-intake.spec.ts`                                                                |
| A      | `e2e/medical-notice-transition.spec.ts`                                                     |
| M      | `e2e/navigation.spec.ts`                                                                    |
| A      | `e2e/pilot-email-invitations.spec.ts`                                                       |
| A      | `e2e/product-evidence.spec.ts`                                                              |
| A      | `e2e/product-fulfilment.spec.ts`                                                            |
| A      | `e2e/product-quote-issue.spec.ts`                                                           |
| A      | `e2e/public-registration.spec.ts`                                                           |
| M      | `e2e/site-health.spec.ts`                                                                   |
| M      | `e2e/staff-accessibility.spec.ts`                                                           |
| A      | `e2e/staff-product-quotes.spec.ts`                                                          |
| M      | `e2e/support.spec.ts`                                                                       |
| M      | `e2e/workforce.spec.ts`                                                                     |
| M      | `eslint.config.js`                                                                          |
| A      | `operations/pilot-launch/cleanup-public-registration.mjs`                                   |
| A      | `operations/pilot-launch/finish-sandbox-cleanup.mjs`                                        |
| A      | `operations/pilot-launch/prepare-company-notices.mjs`                                       |
| A      | `operations/pilot-launch/prepare-company-publication-sql.d.mts`                             |
| A      | `operations/pilot-launch/prepare-company-publication-sql.mjs`                               |
| A      | `operations/pilot-launch/prepare-live-refresh.mjs`                                          |
| A      | `operations/pilot-launch/publish-review-deposit.sql`                                        |
| A      | `operations/pilot-launch/rehearse-company-acknowledgement.mjs`                              |
| A      | `operations/pilot-launch/rehearse-company-preservation.mjs`                                 |
| A      | `operations/pilot-launch/release-public-registration.mjs`                                   |
| A      | `operations/product-rehearsal/README.md`                                                    |
| A      | `operations/product-rehearsal/vite.config.ts`                                               |
| A      | `operations/product-rehearsal/wrangler.jsonc`                                               |
| M      | `package.json`                                                                              |
| A      | `scripts/build-product-rehearsal.ts`                                                        |
| A      | `scripts/cleanup-hosted-product-journey.ts`                                                 |
| A      | `scripts/diagnose-product-cleanup.ts`                                                       |
| A      | `scripts/finalize-hosted-product-rehearsal.ts`                                              |
| A      | `scripts/import-product-catalogue.ts`                                                       |
| M      | `scripts/lib/live-commerce-rehearsal.test.ts`                                               |
| M      | `scripts/lib/live-commerce-rehearsal.ts`                                                    |
| A      | `scripts/lib/product-catalogue-import.test.ts`                                              |
| A      | `scripts/lib/product-catalogue-import.ts`                                                   |
| A      | `scripts/lib/product-order-recovery.test.ts`                                                |
| A      | `scripts/lib/product-order-recovery.ts`                                                     |
| A      | `scripts/lib/product-rehearsal-cleanup.test.ts`                                             |
| A      | `scripts/lib/product-rehearsal-cleanup.ts`                                                  |
| A      | `scripts/lib/product-rehearsal-preparation.test.ts`                                         |
| A      | `scripts/lib/product-rehearsal-preparation.ts`                                              |
| A      | `scripts/prepare-hosted-product-rehearsal.ts`                                               |
| A      | `scripts/rehearse-pilot-email-invitation.ts`                                                |
| A      | `scripts/sql/pilot-email-rehearsal-cleanup.sql`                                             |
| A      | `scripts/test-hosted-product-journey.ts`                                                    |
| M      | `scripts/test-mobile-invitation-conversion.ts`                                              |
| M      | `scripts/test-mobile-invitation-dispatch-race.ts`                                           |
| A      | `scripts/test-product-order-recovery.ts`                                                    |
| A      | `scripts/test-public-registration-worker-runtime.mjs`                                       |
| A      | `scripts/verify-hosted-product-records.ts`                                                  |
| A      | `src/adapters/identity/supabase/public-auth-settings-request.ts`                            |
| M      | `src/adapters/identity/supabase/supabase-managed-identity-provider.test.ts`                 |
| M      | `src/adapters/identity/supabase/supabase-managed-identity-provider.ts`                      |
| A      | `src/adapters/identity/supabase/supabase-pilot-email-invitation-repository.test.ts`         |
| A      | `src/adapters/identity/supabase/supabase-pilot-email-invitation-repository.ts`              |
| A      | `src/adapters/identity/supabase/supabase-public-registration-repository.ts`                 |
| M      | `src/adapters/identity/telnyx/telnyx-mobile-invitation-sender.test.ts`                      |
| M      | `src/adapters/identity/telnyx/telnyx-mobile-invitation-sender.ts`                           |
| M      | `src/adapters/intake/supabase-intake-repository.ts`                                         |
| M      | `src/adapters/persistence/supabase/supabase-access-repository.test.ts`                      |
| M      | `src/adapters/persistence/supabase/supabase-access-repository.ts`                           |
| M      | `src/application/identity/managed-identity-provider.ts`                                     |
| A      | `src/application/identity/mobile-invitation-destination.test.ts`                            |
| A      | `src/application/identity/mobile-invitation-destination.ts`                                 |
| M      | `src/application/identity/mobile-invitation.ts`                                             |
| M      | `src/application/identity/patient-session-service.test.ts`                                  |
| M      | `src/application/identity/patient-session-service.ts`                                       |
| A      | `src/application/identity/pilot-email-invitation.ts`                                        |
| A      | `src/application/identity/public-registration-service.ts`                                   |
| M      | `src/application/identity/workforce-session-service.ts`                                     |
| M      | `src/application/intake/medical-intake-service.test.ts`                                     |
| M      | `src/application/intake/medical-intake-service.ts`                                          |
| M      | `src/application/persistence/access-repository.ts`                                          |
| M      | `src/components/AccountCodePage.test.tsx`                                                   |
| M      | `src/components/AccountCodePage.tsx`                                                        |
| A      | `src/components/AccountDocumentsPage.tsx`                                                   |
| A      | `src/components/AccountDocumentLinks.tsx`                                                   |
| A      | `src/components/ClientProductsPage.test.tsx`                                                |
| A      | `src/components/ClientProductsPage.tsx`                                                     |
| M      | `src/components/MedicalIntakePage.test.tsx`                                                 |
| M      | `src/components/MedicalIntakePage.tsx`                                                      |
| M      | `src/components/MedicalWorkPage.tsx`                                                        |
| M      | `src/components/OrderReviewPage.tsx`                                                        |
| M      | `src/components/PatientPortalPage.tsx`                                                      |
| M      | `src/components/PaymentStatusPanel.tsx`                                                     |
| A      | `src/components/ProductEvidencePanel.test.tsx`                                              |
| A      | `src/components/ProductEvidencePanel.tsx`                                                   |
| A      | `src/components/ProductFulfilmentPanel.test.tsx`                                            |
| A      | `src/components/ProductFulfilmentPanel.tsx`                                                 |
| A      | `src/components/ProductQuoteIssuePanel.test.tsx`                                            |
| A      | `src/components/ProductQuoteIssuePanel.tsx`                                                 |
| M      | `src/components/SafetyEntryGate.tsx`                                                        |
| M      | `src/components/StaffMobileInvitationsPage.test.tsx`                                        |
| M      | `src/components/StaffMobileInvitationsPage.tsx`                                             |
| A      | `src/components/StaffProductQuotePanel.test.tsx`                                            |
| A      | `src/components/StaffProductQuotePanel.tsx`                                                 |
| M      | `src/components/StaffQueuePage.tsx`                                                         |
| M      | `src/components/WorkforceSignInPage.test.tsx`                                               |
| M      | `src/components/WorkforceSignInPage.tsx`                                                    |
| M      | `src/config/environment.test.ts`                                                            |
| A      | `src/domain/payments/client-product-catalogue.test.ts`                                      |
| A      | `src/domain/payments/client-product-catalogue.ts`                                           |
| M      | `src/domain/payments/order-review.ts`                                                       |
| M      | `src/domain/payments/pilot-commerce.test.ts`                                                |
| M      | `src/domain/payments/pilot-commerce.ts`                                                     |
| A      | `src/domain/payments/product-catalogue.test.ts`                                             |
| A      | `src/domain/payments/product-catalogue.ts`                                                  |
| A      | `src/domain/payments/product-fulfilment.test.ts`                                            |
| A      | `src/domain/payments/product-fulfilment.ts`                                                 |
| A      | `src/domain/payments/product-next-actions.test.ts`                                          |
| A      | `src/domain/payments/product-next-actions.ts`                                               |
| A      | `src/domain/payments/product-order-commands.test.ts`                                        |
| A      | `src/domain/payments/product-order-commands.ts`                                             |
| A      | `src/domain/payments/product-quote-evidence.test.ts`                                        |
| A      | `src/domain/payments/product-quote-evidence.ts`                                             |
| A      | `src/domain/payments/product-quote-issue.test.ts`                                           |
| A      | `src/domain/payments/product-quote-issue.ts`                                                |
| A      | `src/domain/payments/staff-product-quote.test.ts`                                           |
| A      | `src/domain/payments/staff-product-quote.ts`                                                |
| M      | `src/hooks/use-action-toast.test.ts`                                                        |
| M      | `src/hooks/use-action-toast.ts`                                                             |
| M      | `src/lib/compliance/pilot-profile.ts`                                                       |
| M      | `src/lib/public-route-policy.ts`                                                            |
| A      | `src/product-rehearsal-server.ts`                                                           |
| A      | `src/routes/-account-documents.test.tsx`                                                    |
| A      | `src/routes/-company-disclosures.test.tsx`                                                  |
| M      | `src/routes/account/activate.tsx`                                                           |
| A      | `src/routes/account/documents.tsx`                                                          |
| A      | `src/routes/portal.products.tsx`                                                            |
| M      | `src/routes/privacy.tsx`                                                                    |
| M      | `src/routes/start.tsx`                                                                      |
| M      | `src/routes/terms.tsx`                                                                      |
| M      | `src/routeTree.gen.ts`                                                                      |
| M      | `src/server.ts`                                                                             |
| A      | `src/server/identity/account-review-cookie.test.ts`                                         |
| A      | `src/server/identity/account-review-cookie.ts`                                              |
| A      | `src/server/identity/account-review-http.test.ts`                                           |
| A      | `src/server/identity/account-review-http.ts`                                                |
| M      | `src/server/identity/mobile-invitation-delivery-config.ts`                                  |
| M      | `src/server/identity/mobile-invitation-email-service.test.ts`                               |
| M      | `src/server/identity/mobile-invitation-email-service.ts`                                    |
| M      | `src/server/identity/mobile-invitation-http.test.ts`                                        |
| M      | `src/server/identity/mobile-invitation-http.ts`                                             |
| M      | `src/server/identity/mobile-invitation-page.ts`                                             |
| M      | `src/server/identity/mobile-invitation-receipts.test.ts`                                    |
| M      | `src/server/identity/mobile-invitation-receipts.ts`                                         |
| M      | `src/server/identity/mobile-invitation-redemption-http.test.ts`                             |
| M      | `src/server/identity/mobile-invitation-redemption-http.ts`                                  |
| M      | `src/server/identity/patient-activation-http.test.ts`                                       |
| M      | `src/server/identity/patient-activation-http.ts`                                            |
| M      | `src/server/identity/patient-session-http.test.ts`                                          |
| M      | `src/server/identity/patient-session-http.ts`                                               |
| A      | `src/server/identity/pilot-email-invitation-service.test.ts`                                |
| A      | `src/server/identity/pilot-email-invitation-service.ts`                                     |
| M      | `src/server/identity/preactivation-cookie.ts`                                               |
| A      | `src/server/identity/public-registration-http.test.ts`                                      |
| A      | `src/server/identity/public-registration-http.ts`                                           |
| A      | `src/server/payments/client-fulfilment-http.test.ts`                                        |
| A      | `src/server/payments/client-fulfilment-http.ts`                                             |
| A      | `src/server/payments/client-product-http.test.ts`                                           |
| A      | `src/server/payments/client-product-http.ts`                                                |
| M      | `src/server/payments/commerce-environment.ts`                                               |
| M      | `src/server/payments/order-review-http.test.ts`                                             |
| M      | `src/server/payments/order-review-http.ts`                                                  |
| M      | `src/server/payments/pilot-checkout.test.ts`                                                |
| M      | `src/server/payments/pilot-checkout.ts`                                                     |
| A      | `src/server/payments/product-evidence-http.test.ts`                                         |
| A      | `src/server/payments/product-evidence-http.ts`                                              |
| A      | `src/server/payments/product-fulfilment-http.test.ts`                                       |
| A      | `src/server/payments/product-fulfilment-http.ts`                                            |
| A      | `src/server/payments/product-quote-issue-http.test.ts`                                      |
| A      | `src/server/payments/product-quote-issue-http.ts`                                           |
| A      | `src/server/payments/shipping-envelope.test.ts`                                             |
| A      | `src/server/payments/shipping-envelope.ts`                                                  |
| A      | `src/server/payments/staff-product-quote-http.test.ts`                                      |
| A      | `src/server/payments/staff-product-quote-http.ts`                                           |
| A      | `src/server/security/product-rehearsal-boundary.test.ts`                                    |
| A      | `src/server/security/product-rehearsal-boundary.ts`                                         |
| M      | `src/server/security/request-security.test.ts`                                              |
| M      | `src/server/security/request-security.ts`                                                   |
| A      | `src/test/client-products-fixture.ts`                                                       |
| A      | `src/test/product-evidence-fixture.ts`                                                      |
| A      | `src/test/product-fulfilment-fixture.ts`                                                    |
| A      | `src/test/product-quote-issue-fixture.ts`                                                   |
| A      | `src/test/staff-product-quote-fixture.ts`                                                   |
| A      | `supabase/migrations/20261009220942_private_product_catalogue_foundation.sql`               |
| A      | `supabase/migrations/20261009224936_private_client_product_catalogue.sql`                   |
| A      | `supabase/migrations/20261010022929_staff_product_quote_drafts.sql`                         |
| A      | `supabase/migrations/20261010032231_product_quote_evidence.sql`                             |
| A      | `supabase/migrations/20261010043156_issued_product_quotes.sql`                              |
| A      | `supabase/migrations/20261010102031_approved_review_deposit_pricing.sql`                    |
| A      | `supabase/migrations/20261010122842_mobile_invitation_us_destinations.sql`                  |
| A      | `supabase/migrations/20261010160000_manual_product_fulfilment.sql`                          |
| A      | `supabase/migrations/20261011133000_pilot_email_invitation_fallback.sql`                    |
| A      | `supabase/migrations/20261011150000_resumable_invitation_onboarding.sql`                    |
| A      | `supabase/migrations/20261012130000_public_patient_registration.sql`                        |
| A      | `supabase/migrations/20261012210000_account_notice_receipt_transition.sql`                  |
| A      | `supabase/migrations/20261012224238_account_document_reacknowledgement.sql`                 |
| A      | `supabase/migrations/20261012232415_company_document_preservation.sql`                      |
| A      | `supabase/migrations/20261012234348_collection_notice_withdrawal_boundary.sql`              |
| A      | `supabase/migrations/20261020113457_product_fulfilment_notifications.sql`                   |
| A      | `supabase/tests/database/account_document_reacknowledgement.test.sql`                       |
| A      | `supabase/tests/database/account_notice_receipt_transition.test.sql`                        |
| A      | `supabase/tests/database/approved_review_deposit_pricing.test.sql`                          |
| A      | `supabase/tests/database/client_product_catalogue.test.sql`                                 |
| A      | `supabase/tests/database/issued_product_quotes.test.sql`                                    |
| A      | `supabase/tests/database/manual_product_fulfilment.test.sql`                                |
| M      | `supabase/tests/database/medical_intake_foundation.test.sql`                                |
| M      | `supabase/tests/database/mobile_invitation_delivery_intents.test.sql`                       |
| M      | `supabase/tests/database/mobile_invitation_email_conversion.test.sql`                       |
| A      | `supabase/tests/database/pilot_email_invitation_fallback.test.sql`                          |
| A      | `supabase/tests/database/private_product_catalogue.test.sql`                                |
| A      | `supabase/tests/database/product_quote_evidence.test.sql`                                   |
| A      | `supabase/tests/database/public_current_notice_activation.test.sql`                         |
| A      | `supabase/tests/database/public_patient_registration.test.sql`                              |
| A      | `supabase/tests/database/staff_product_quote.test.sql`                                      |
| A      | `third-party/google-libphonenumber-LICENSE.txt`                                             |
| M      | `tsconfig.json`                                                                             |
| M      | `worker-configuration.d.ts`                                                                 |
| M      | `wrangler.jsonc`                                                                            |
