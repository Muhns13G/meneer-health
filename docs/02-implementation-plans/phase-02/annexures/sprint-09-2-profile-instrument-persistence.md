---
evidence_id: phase-02-sprint-09-2-profile-instrument-persistence
title: Minimum Client Profile and Instrument Persistence
status: completed-locally-with-activation-gates
task: 9.2
observed: 2026-10-02
completed: 2026-10-02
owner: "@Muhns13G"
related_debt: [TD-009, TD-037, TD-038]
---

# Sprint 09.2 — Profile and Instrument Persistence

## Outcome

Migration `20261002201514_pilot_client_profile_instruments.sql` adds the approved minimum
non-clinical profile, value-free profile-change history, published instrument versions, immutable
acceptance/acknowledgement receipts, receipt withdrawal/supersession facts and account lifecycle
history. It was generated with the Supabase CLI and replayed through a complete local reset. The
hosted database was not migrated.

## Data and security decisions

- A profile is unique by tenant and subject. Its composite foreign key requires a matching
  `patient` membership, preventing a cross-tenant or workforce profile. The client-entered fields
  are exactly DR-014; verified email stays in the existing managed-identity contact table. Profile
  events name changed fields and an actor but deliberately do not duplicate personal values.
- An instrument publication contains the exact reproducible body, locale, version, rendered
  locator, approval reference and database-computed SHA-256 hash. Only one version per instrument
  and locale may be published at a time. Published content is immutable; retiring a version changes
  only its state. No placeholder or draft instrument is seeded by the migration.
- A receipt binds tenant, subject, action, assurance, idempotency/correlation references and the
  exact publication ID/version/locale/hash through a composite foreign key. Database checks
  distinguish privacy acknowledgement from terms acceptance, and a trigger rejects inactive or
  expired publications. The receipt and subsequent withdrawal/supersession facts are append-only.
- All six new tables enable and force RLS. `anon` and `authenticated` have no grants or permissive
  policies. `service_role` can read but cannot insert or update these records yet. Task 9.6 must
  introduce a governed, atomic activation/write command rather than exposing direct table writes.
- No client identity, profile, terms, notice, receipt or lifecycle event is inserted into the
  migration or hosted database. Local tests use only existing synthetic `.invalid` fixtures.

## Validation

| Check                                                    | Result                                                 |
| -------------------------------------------------------- | ------------------------------------------------------ |
| Local Supabase reset and migration replay                | Passed, including the new migration and synthetic seed |
| pgTAP database suite                                     | 12 files, 369 assertions passed                        |
| Synthetic Auth and contextual authorisation integrations | Passed                                                 |
| Local database lint                                      | No errors                                              |
| Local Supabase security/performance advisors             | No warning/error issues                                |

The new pgTAP file proves field exclusions, tenant binding, E.164 shape, deny-default grants/RLS,
publication hashing and immutability, one active version, exact-hash receipt binding, correct
action type, retired-version rejection and append-only lifecycle evidence. The first reset caught
that `digest(convert_to(...))` is not accepted as a generated-column expression in this Postgres
environment; a before-insert database trigger now computes the hash, and the final replay passes.

## Remaining gates

Task 9.3 still needs staff-governed invitation commands, 9.4 must prove the hosted OTP/template
boundary, and 9.5–9.8 must implement sessions, atomic activation, profile/rights UI and portal
access. In particular, schema constraints alone do not activate membership or prove that both
required receipts and the profile commit together; that is the Task 9.6 command's acceptance gate.
Rendered instruments remain unpublished until DR-015's party schedules and domain approvals are
verified. TD-009, TD-037 and TD-038 remain non-Verified.
