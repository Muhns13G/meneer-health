---
task: 7.1
status: completed
date: 2026-08-13
related_debt: [TD-040, TD-045, TD-046, TD-047, TD-048]
source_baseline: 721528f
---

# Sprint 07.1 — Content, Measurement, and MCP Baseline

## Outcome

Task 7.1 inventories the post-Sprint 06 content, claim, measurement, and retired MCP boundaries and
freezes the implementation order for Sprint 07. It changes no runtime behaviour, public wording,
claim disposition, route availability, analytics setting, provider integration, or MCP surface.

The implementation targets remain TD-040, TD-045, and TD-046. TD-047 and TD-048 are already
Verified through MCP removal and are regression-assurance scope only. TD-006 and TD-007 remain
separate claim and peptide-activation gates; Sprint 07 must not imply that content centralisation
supplies missing domain evidence.

## Public-Content Representation Inventory

| Representation                      | Current authority or source                                                   | Baseline finding                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Root and homepage metadata          | `src/routes/__root.tsx`, `src/routes/index.tsx`                               | Meneer identity and core claims are duplicated.                                                       |
| Homepage proposition and trust copy | `Hero`, `TrustStrip`, `Benefits`, `Doctor`, `Discretion`, `CtaSection`        | Claim-bearing strings are component-local constants or JSX.                                           |
| Treatment catalogue and navigation  | `Treatments.tsx`, `Nav.tsx`, `treatment-intent-catalogue.ts`                  | Display content, navigation labels, and opaque intent IDs have separate purposes and sources.         |
| Journey explanations                | `HowItWorks.tsx`, `Timeline.tsx`, preserved `/start` prototype                | Counts, event names, timing, and fulfilment detail are not derived from one model.                    |
| Peptide content                     | `routes/peptides.tsx`, homepage treatment card, navigation and metadata       | Marketing, preview, gated prototype, and metadata representations are separate.                       |
| Support and escalation              | `support-channels.ts`, `contact.tsx`, `privacy.tsx`, `terms.tsx`, route gates | Verified general/emergency values are partly centralised; contextual explanations remain local.       |
| Campaigns and posters               | `campaigns.ts`, `/go/...` routes, `poster.tsx`, `poster-thanks.tsx`           | Redirect attribution is centralised; poster wording and trust claims remain route-local.              |
| Route/discovery policy              | `public-route-policy.ts`, route metadata and root metadata                    | Route classes are centralised, while titles/descriptions remain distributed.                          |
| Activation content                  | `pilot-profile.ts`, `SafetyEntryGate.tsx`, `PilotRouteGate.tsx`               | Placeholder evidence is correctly used to keep transactions unavailable, not as publishable proof.    |
| Portable/runtime contracts          | `contracts/`, application/domain/server modules                               | Authoritative workflow state is not public marketing content and must stay outside the content model. |

Preserved prototypes count as governed representations because they can drift before activation.
They do not count as active transaction evidence and must remain unreachable until their separate
release gates pass.

## Journey and Promise Drift Register

| Surface                          | Current representation                                                                                                             | Task 7.2 decision required                                                                |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Homepage `HowItWorks`            | Three broad steps: questions, doctor, courier                                                                                      | Define whether these are approved summaries of canonical events.                          |
| Homepage `Timeline`              | Four events: intake, consult, prescription to pharmacy, delivery                                                                   | Reconcile clinical review, prescription, pharmacy, and fulfilment event names.            |
| Preserved `/start` intake        | Four user-facing steps before confirmation                                                                                         | Distinguish user-input steps from operational journey events.                             |
| Preserved `/start` confirmation  | Five events, including blood work, review, consult, plan, delivery                                                                 | Define optional versus mandatory events and approved channel detail.                      |
| Timing promises                  | Five-minute intake; weekend treatment; booking/dosing and contact/review within 48 hours; same-day plan; two-to-three-day delivery | Define start/end events, qualifiers, service owner, exceptions, and permitted wording.    |
| Consultation/commercial promises | Real doctor, free consult if unsuitable, no commitment/no calls                                                                    | Align with approved clinical rejection, price, contact, and commercial rules.             |
| Fulfilment promises              | Courier/post/delivery-to-door, licensed pharmacy, discreet packaging                                                               | Align terminology with the approved pharmacy, hub, courier, custody, and exception model. |
| Cancellation promise             | “Cancel whenever — no awkward call”                                                                                                | Derive the public summary from DR-002's stage-specific consequences and approved route.   |

This register is an inconsistency inventory, not permission to rewrite copy. Task 7.2 must preserve
the established voice while approving canonical events and permitted channel-specific summaries.

## Claim-Governance Baseline

The Sprint 01.5 register identifies nine retained families: practitioner registration, POPIA,
encryption/sharing, pharmacy licensing, unsuitable-treatment consultation pricing, cancellation,
service timing, discreet packaging/delivery, and peptide positioning. Sprint 03 decisions clarify
the operating and commercial interpretation of several families, but there is no single
machine-readable publication lifecycle.

Task 7.4 must add, without inventing evidence:

- stable claim identifiers and exact approved variants;
- evidence and accountable domain-owner references;
- allowed channel and audience rules;
- draft, approved, rejected, withdrawn, archived, and expired states;
- effective, review, expiry, and emergency-withdrawal controls; and
- fail-closed validation that prevents an ineligible variant from being published.

Repository-owner approval preserves product direction and wording. It does not replace the domain
evidence required to close TD-006 or activate TD-007.

## Measurement Baseline

- No application analytics, advertising tracker, session replay, analytics dependency, beacon, or
  client event API is configured. The privacy notice accurately states this baseline.
- Cloudflare automatic Web Analytics remains disabled under DIR-033.
- Server telemetry is operational, schema-validated status/duration/correlation evidence. It is not
  customer behaviour analytics and must not be repurposed silently.
- Supabase's local `config.toml` analytics sections and generated Worker analytics types are
  provider/tooling capabilities, not an enabled Meneer measurement implementation.
- Campaign attribution is limited to the two allowlisted offline poster UTM combinations.
- Human-readable health/treatment intent is prohibited from URLs, referrers, logs, payment
  metadata, analytics, and third-party systems. The treatment-intent cookie remains opaque,
  server-owned, short-lived, HttpOnly, Secure, and SameSite=Strict.

Tasks 7.7–7.9 must not begin collection until the measurement questions, minimum events, purpose and
consent position, provider/first-party disposition, access, retention, deletion, and synthetic
verification approach are approved. The implementation must remain default-off when configuration
or approval is absent.

## MCP Baseline

The Lovable MCP SDK/plugin, route handlers, tool catalogue, OAuth metadata, manifest, duplicate
content, and public documentation are absent. The former `/mcp`, `/.mcp/list-tools`, and
`/.well-known/oauth-protected-resource` paths are retained only in negative browser evidence.

Remaining source references are intentional controls rather than an active MCP implementation:

- `e2e/fixtures.ts` expects former routes to return the ordinary not-found surface;
- `contracts/capabilities.ts` and the portability fixture record the retired capability;
- `request-security.ts` classifies unknown `/.mcp` requests as direct endpoints; and
- generated Worker types mentioning MCP or analytics do not create runtime features.

Task 7.10 will re-prove absence locally, in built output, and on hosted routes. Reintroduction is not
part of Sprint 07 and requires a separately approved vendor-neutral use case and threat model.

## Frozen Invariants

1. Do not change established public wording without an approved Task 7.2/7.4 reason and traceable
   source decision.
2. Do not activate `/start`, peptide intake, payment, identity, partner, or fulfilment workflows.
3. Do not treat placeholder professional or pharmacy data as approved claim evidence.
4. Do not place health/treatment intent, contact data, credentials, tokens, questionnaire answers,
   clinical decisions, or free text in analytics, URLs, referrers, logs, or third parties.
5. Keep measurement absent/default-off until Task 7.7 is approved and Task 7.8 is implemented.
6. Keep MCP absent; no SDK, endpoint, manifest, OAuth surface, or duplicate public-content source may
   be introduced during this Sprint.
7. Keep public content framework-neutral and separate from authoritative clinical, payment, order,
   identity, and fulfilment state.
8. Keep internal RAG separate from any future public or clinical corpus.

## Implementation Sequence and Gates

1. Task 7.2 approves canonical journey semantics and channel summaries.
2. Task 7.3 implements the content lifecycle/schema; Task 7.4 adds claim governance against it.
3. Task 7.5 migrates retained representations only after their source fields and approval states
   exist; Task 7.6 proves consistency, expiry, withdrawal, and rollback.
4. Task 7.7 decides the measurement contract before Task 7.8 adds any implementation; Task 7.9
   performs synthetic local and hosted verification.
5. Task 7.10 independently re-proves MCP absence and freezes the future boundary.
6. Tasks 7.11–7.12 perform approval review, complete validation, debt/RAG reconciliation, and closure.

Tasks 7.2 and 7.7 are decision checkpoints after this baseline. Task 7.10 may proceed independently
after 7.1 because it must not change the MCP disposition. Missing external evidence can preserve an
activation gate, but it cannot be represented as verified or substituted with placeholder facts.

## Acceptance

- Active, restricted, campaign, legal/support, discovery, preserved-prototype, operational, and
  retired MCP representations are explicitly classified.
- Journey-count, timing, consultation, cancellation, and fulfilment drift is recorded without copy
  changes.
- Claim governance distinguishes repository direction from missing domain evidence.
- Measurement absence, operational telemetry, provider tooling, campaign attribution, and
  prohibited-data boundaries are distinguished.
- MCP absence and the purpose of every retained negative reference are documented.
- The 7.2–7.12 dependency order and approval gates are explicit.
- Formatting and repository whitespace validation pass.
