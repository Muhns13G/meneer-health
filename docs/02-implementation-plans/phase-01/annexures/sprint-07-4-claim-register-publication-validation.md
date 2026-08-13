---
task: 7.4
status: completed
date: 2026-08-13
related_debt: [TD-006, TD-007, TD-040, TD-046, TD-047]
debt_status: in-progress-and-regression-assurance
source_baseline: bdfd774
---

# Sprint 07.4 — Claim Register and Publication Validation

## Outcome

Task 7.4 completes a machine-readable register for the nine retained public-claim families and adds
a portable fail-closed publication boundary. The register inventories 28 exact variants across
website, metadata, poster, and preserved-route sources. It records the accountable role, required
approvers, evidence requirements, allowed channels/audiences, lifecycle, source locator, and
disposition for every variant without inventing professional, regulatory, clinical, privacy,
security, commercial, partner, or operational evidence.

No route, component, metadata value, poster, support surface, policy, transaction, analytics
provider, or MCP endpoint changes in this task. Existing representations remain unmigrated until
Task 7.5 deliberately derives them from the governed source.

## Register Disposition

| State              | Count | Meaning                                                                                          |
| ------------------ | ----: | ------------------------------------------------------------------------------------------------ |
| `pending-evidence` |    25 | Owner direction retains the variant, but required domain evidence/approvals are not complete.    |
| `rejected`         |     3 | The current timing wording conflicts with the owner-approved Task 7.2 semantics and must change. |
| `approved`         |     0 | No retained claim is falsely represented as domain-approved at this boundary.                    |

The rejected variants are “Booked & dosed inside 48 hours”, “Treatment in the post by the
weekend”, and the preserved two-to-three-business-day delivery representation. The eligible
semantics remain: five minutes may describe initial intake only; 48 hours may be a qualified target
for initial contact/review; and delivery is provisionally three-to-five business days from
`eligible_for_fulfilment_at`, subject to evidence and exceptions. Task 7.5 owns any public rewrite
or derivation and must preserve the established voice through approved replacements.

## Implemented Boundary

- `public-claims.register@1` is registered for v1 TanStack, v2 Next.js, and v3 Laravel/React.
- CAP-001 now retains both public-content and public-claim contracts; PORT-022 supplies a synthetic
  approved/evidenced portability fixture.
- Register validation rejects duplicate IDs, unknown evidence requirements, incomplete approvals,
  incomplete evidence, invalid timing, late evidence/approval, invalid channel scope, and missing
  withdrawal/archive evidence.
- Publication checks require an approved status, exact channel and audience, effectiveness, an
  unexpired review/expiry/evidence window, every required approver, and every evidence requirement.
- Claim-bearing content requires at least one claim reference and exact wording equality. Missing,
  pending, rejected, withdrawn, archived, expired, mismatched, or otherwise invalid claims fail
  closed.

## Debt Boundary

TD-006 and TD-007 remain **In progress** because the register describes missing evidence rather than
supplying it. TD-040 and TD-046 remain **In progress** until Tasks 7.5–7.6 migrate retained
representations and prove cross-channel consistency, withdrawal, versioning, and rollback. TD-047
remains **Verified**: MCP stays absent, while its future-public channel is governed by the same
portable claim boundary if separately approved later.

## Validation

- Focused public-claim, public-content, and portability tests pass.
- The portability checker passes with 14 capabilities, 16 contract majors, and 22 fixtures.
- Strict TypeScript validation passes.
- Complete format, lint, test, build, generated-output, RAG-index, and diff checks are required
  before commit.
