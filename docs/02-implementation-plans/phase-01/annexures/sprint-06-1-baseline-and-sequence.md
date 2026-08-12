---
task: 6.1
status: completed
date: 2026-08-12
related_debt: [TD-035, TD-036, TD-037, TD-038, TD-039, TD-042, TD-043, TD-044]
---

# Sprint 06.1 — Journey Baseline and Implementation Sequence

## Outcome

Task 6.1 freezes the post-Sprint 05 public surface before journey changes. It adds a tested,
framework-neutral route policy, separates non-clinical campaign attribution from health intent, and
divides Sprint 06 into twelve independently committable tasks. It changes no route behavior,
customer-facing wording, index output, support channel, form, or provider activation.

## Route Disposition

| Class      | Routes                                                   | Baseline policy       |
| ---------- | -------------------------------------------------------- | --------------------- |
| Public     | `/`, `/contact`, `/privacy`, `/terms`                    | Index and canonical   |
| Restricted | `/start`, `/peptides`                                    | No index, no follow   |
| Campaign   | `/poster`, `/poster-thanks`                              | No index, no follow   |
| Redirect   | `/go/dads`, `/go/thanks-dad`                             | Stable redirect only  |
| Internal   | `/api/payments/checkout`, `/api/payments/stripe/webhook` | Inactive and no index |
| Error      | Unknown routes and error boundaries                      | No index              |

Task 6.8 will make this policy authoritative in generated metadata, robots, sitemap, and preview
checks. Until then, this is an implementation contract rather than a claim that every output has
already been corrected.

## Journey and Intent Boundary

- Existing campaign UTM values remain allowlisted non-clinical attribution.
- Condition, diagnosis, symptom, medication, treatment, and health-intent query keys are prohibited.
- No treatment selection is preserved until Task 6.3 implements a typed, server-validated,
  server-owned mechanism with safe expiry and invalid-state behavior.
- Missing, unsupported, stale, or tampered intent must fail closed without changing the approved
  public wording or implying clinical eligibility.

## Known Inputs and Gates

The canonical origin, general-support mailbox, emergency numbers, and retained routes are confirmed.
Separate clinical/privacy/complaint ownership, final treatment identifiers, favicon/social assets,
and the font-provider decision remain later task inputs. Their absence does not block Tasks 6.2 or
6.4–6.6, but it prevents the relevant debt from being marked Verified.

## Acceptance

- The plan reflects the completed Sprint 05 state and the 6.1–6.12 sequence.
- Route policy tests prove only approved public information routes are indexable.
- Canonical generation rejects queries, fragments, and external origins.
- Safe-intent tests reject health-related query keys while retaining non-clinical UTM attribution.
- Existing campaign URL tests continue to pass through the shared canonical-origin helper.
- Format, lint, strict TypeScript, focused tests, and the production build pass.
