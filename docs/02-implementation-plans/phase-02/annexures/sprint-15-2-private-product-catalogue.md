---
evidence_id: phase-02-sprint-15-2-private-product-catalogue
title: Private Product Catalogue, RRP Provenance and Shipping Foundation
status: completed-local-foundation
task: 15.2
observed: 2026-10-10
authority: local-engineering-not-sales-activation
owner: "@Muhns13G"
related_debt: [TD-007, TD-009, TD-010, TD-065]
---

# Task 2.15.2 — Private Catalogue Foundation

## Delivered Boundary

The new forward migration adds four private, forced-RLS preparation tables with no anonymous,
authenticated or service-role table grants. Catalogue versions retain tenant, immutable version,
source/import fingerprints, customer currency/tax-planning classification, effective interval,
independent importer/reviewer and approval reference. Items retain only opaque product ID/SKU,
customer description, RRP minor units and bounded quantity. No practitioner costs, therapeutic
claims, source PDF, clinical answers or provider Price mapping are stored by this interface.

`local-synthetic` and `precise-wellness-rrp` are distinct provenance classes. The latter requires
the previously approved schedule fingerprint from the [pricing decision](sprint-08-4-commercial-pricing-benchmark.md).
Neither provenance class implies clinical approval, availability, tax registration or supply.
Existing `commerce_private.prices`, deposit offers and payment functions are unchanged. Deliberately
do not add real provenance to those payable legacy prices: later governed quote work must bridge
the versioned catalogue to exact product approval and price/offer snapshots before charging.

The private invoker-only importer validates allowlisted fields, independent current memberships,
bounded items and immutable content. Same-tenant imports are serialised; exact replay returns the
original batch, changed replay/version reuse is rejected, and a failed import leaves no partial
batch/items. Deferred completeness checks reject incomplete commits; complete/withdrawn batches
cannot append extra items. One-way catalogue/address withdrawal preserves historical content and
does not resurrect from replay. Application-governed publication/withdrawal commands remain later
tasks; this privileged preparation primitive is not exposed as a service-role RPC.

## Shipping and Delivery

Private shipping snapshots contain an AES-256-GCM envelope, not plaintext address columns.
The dedicated address codec binds tenant, client, case, snapshot, version and key ID as authenticated
associated data; wrong scopes, missing/wrong keys and tampering fail closed. Nonces are random.
Database checks enforce envelope shape and exact row scope; they cannot verify cryptographic
authenticity without the key. Tests distinguish structural SQL fixtures from actual encryption.

Delivery bindings connect an existing monetary quote to the exact tenant/case/client address and
catalogue plus opaque custody/evidence references. Composite foreign keys prevent cross-scope
substitution; insertion requires current unwithdrawn quote/catalogue/address. This is a record
binding, not evidence that a courier, cold-chain policy or clinician has actually approved an order.
Issuance/Checkout/dispatch must revalidate these records in Tasks 15.4–15.7.

No address key is generated or copied from medical/recovery secrets. Before an address-collection
route is enabled, provision a separately scoped key/keyring, record off-device custody and retention,
and exercise encrypted address restore/disposition. The tables are inside `commerce_private`,
already included in logical recovery exports, but inclusion alone is not populated address recovery
proof. Keep that acceptance explicit under TD-065/later release work; no real address is collected.
The new direct subject foreign keys carry the existing orphan-retirement reference guards.

## Import Tool and Operating Instructions

Prepare a reviewed **customer-RRP-only** JSON manifest matching `catalogueImportSchema`, outside Git.
Every product needs a stable opaque ID/SKU, plain customer description, integer RRP minor units and
quantity limit. Whole-PDF source bytes are checked against the recorded SHA-256. This does not
automatically extract or verify the transcription of each RRP: owner price review remains required.
Do not supply the raw practitioner schedule as the JSON manifest or invent real delivery prices.

Validation only (no database/provider contact):

```sh
bun --no-env-file run scripts/import-product-catalogue.ts --validate \
  customer-rrp-manifest.json.local '/private/path/Master Pricing Schedule Practitioner.pdf'
```

The CLI accepts at most 250 products, emits only item count/mode/source-match summary and redacts
JSON, filesystem and subprocess errors. It can validate real provenance, but has **no hosted import
path**. `--apply-local` rejects real provenance and inherited hosted/provider settings, uses only
the fixed synthetic Docker database, and executes one bounded transaction. It requires appropriate
synthetic memberships already prepared locally; it does not create permissions. SQL literals escape
quotes and local execution fixes standard-conforming strings. Never adapt its container target to
hosted services or use it to bypass an independently approved real import.

## Verification and Changes

The final local database matrix passes 47 suites / 2,234 assertions. The new packet contributes
40 assertions for RLS/ACLs, invoker semantics, replay/version/wholesale-input denial, atomic failure,
withdrawal, encrypted scope/immutability, current delivery binding and native retirement coverage.
Five focused domain/import/encryption files pass 50 tests, including unchanged credit and 15.1
commands. TypeScript, focused ESLint, portability and SQL function lint pass. Final Node 22.23.2
serial Vitest run passes 169 files / 1,356 tests. Node 22 client/server production build,
client-bundle canary, retired-MCP check, formatting, unchanged generated routes and document
link/index checks pass. Local advisors report no issues. Zero new catalogue/items/address/delivery
rows and zero Auth users remain after rollback; local Supabase was stopped with its backup retained.
No browser/provider/hosted acceptance is claimed for this unrouted foundation.

Early SQL checks caught an ambiguous local variable, a deferred-trigger record-field error and
missing orphan-retirement guards on new subject-linked tables; all were corrected and the complete
matrix rerun. The restored local stack had stale migration history; its empty Auth/client/intake/case
baseline was checked before a clean local reset. Final replay completed; the CLI's optional pg-delta
catalogue cache timed out under load but the migration/seed replay itself completed successfully.
An initial broad concurrent Vitest run hit existing support timing failures and was interrupted;
it is not accepted passing evidence. The shell defaulted to unsupported Node 24; an interim serial
run was also stopped, and the final full suite above used the installed supported Node 22 explicitly.
Hosted Supabase and existing owner test data were untouched.

Created files:

- `supabase/migrations/20261009220942_private_product_catalogue_foundation.sql`
- `supabase/tests/database/private_product_catalogue.test.sql`
- `src/domain/payments/product-catalogue.ts` and its colocated test
- `src/server/payments/shipping-envelope.ts` and its colocated test
- `scripts/import-product-catalogue.ts`
- `scripts/lib/product-catalogue-import.ts` and its colocated test
- This annexure

Updated documentation: Sprint-15 plan, Phase-02 README, debt registry, current-state/limitations
RAG and index. The Supabase skills shaped least-privilege/invoker preparation, indexed foreign keys,
scope constraints, guard coverage and test-backed migration verification.
No dependency, seed, generated route, Worker binding, secret or payment/clinical function changes.
The owner alone stages/commits/releases. Real catalogue import, hosted migration, public exposure,
clinical/pharmacy release and product-sale activation remain separate bounded approvals.
