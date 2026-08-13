---
evidence_id: phase-01-sprint-07-task-10
title: Sprint 07 Task 7.10 MCP Absence and Future Boundary Evidence
status: verified
date: 2026-08-13
owner: "@Muhns13G"
---

# Sprint 07 Task 7.10 — MCP Absence and Future Boundary Evidence

## Purpose and Current Decision

Meneer v1 exposes no Model Context Protocol (MCP) capability. This task re-proves the Sprint 02
removal and freezes the decision boundary for any later proposal. It does not add an MCP server,
client, SDK, route, manifest, OAuth metadata, tool, public corpus, private corpus, or AI workflow.

Any MCP proposal is prohibited from entering implementation until it has a named use case, owner,
separate decision record, data-flow inventory, threat model, privacy/security review, release gate,
and rollback plan. Adding a dependency, route, manifest, metadata document, tool definition, proof
of concept, or hosted endpoint is implementation and therefore triggers this gate.

## Repeatable Absence Evidence

| Boundary                       | Evidence                                                                                                                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Retired files                  | `check:mcp-absence` rejects every removed manifest, server, tool and route path.                                                                                                                         |
| Dependencies and configuration | The check rejects `@lovable.dev/mcp-js`, `@modelcontextprotocol/sdk`, former handler/plugin calls and retired tool names in deployable source or the lockfile.                                           |
| Generated routing              | The generated TanStack route tree is checked for every former MCP/OAuth route.                                                                                                                           |
| Production build               | `bun run build` invokes the absence check and rejects retired SDK/handler/tool markers in both client and server output.                                                                                 |
| Local HTTP                     | Playwright verifies GET paths return the ordinary HTML 404 and POST probes receive only the established generic request-security denial, with no protocol payload, CORS permission or persistent cookie. |
| Hosted HTTP                    | The guarded `test:mcp:hosted` exercise repeats the same five negative-path GET/POST probes against the canonical HTTPS origin.                                                                           |
| Portability                    | CAP-011 and PORT-017 continue to classify the old Lovable MCP/OAuth surface as retired with an ordinary not-found authority.                                                                             |

The retained `/.mcp` request-security prefix is a defensive denial boundary, not a route or MCP
implementation. The `future-public-mcp` content channel is an inactive governance label that prevents
future claims bypassing the canonical catalogue; it publishes nothing.

### Recorded Task 7.10 Results

- Production build and `check:mcp-absence`: pass; retired files, dependencies, generated routes and
  client/server build markers are absent.
- Focused Playwright boundary suite: 28/28 desktop/mobile tests pass, including every former GET
  path and both former POST protocol paths.
- Canonical `https://meneerhealth.co.za` exercise: five probes pass; GET responses are ordinary HTML
  404s, POST responses are generic stable security denials, and protocol payloads, persistent
  cookies and allowed cross-origin responses are all zero.
- Formatting, lint, strict TypeScript, Vitest and portability checks pass. The complete CI and
  browser matrix remains Task 7.11 rather than being duplicated here.
- Full validation exposed and corrected a pre-existing probabilistic treatment-intent test: random
  ciphertext was incorrectly rejected whenever it happened to contain the two letters of the
  plaintext wire ID. The corrected assertion compares the complete opaque token with the plaintext;
  no runtime, encryption or journey behaviour changed.

## Future Public MCP Boundary

A future public MCP may be considered only for a separately approved, demonstrable user need. Its
maximum initial scope is read-only public information derived from the same versioned
`public-content.catalogue@1` and `public-claims.register@1` source as the website.

Before implementation, the proposal must define exact resources/tools, audiences, approved claim
IDs and variants, versioning, evidence lifecycle, cache and withdrawal behaviour, abuse/rate limits,
monitoring, data minimisation, privacy/security review, ownership, release criteria, and rollback.
It must not accept or infer identity, contact details, treatment intent, health information,
questionnaire responses, credentials, free text, or customer workflow state.

## Future Private MCP Boundary

Account, intake, scheduling, support, clinical, prescription, payment, order, fulfilment, or
workforce tools are not extensions of the public boundary. Each requires a dedicated threat model
and explicit approval before code exists. At minimum it must specify:

- authenticated principal and OAuth/OIDC design, narrow scopes, tenant/role/assignment/purpose
  checks, session assurance and revocation;
- consent or other approved authority, minimum necessary data, field-level classifications,
  retention/deletion and processor/cross-border responsibilities;
- validated inputs/outputs, tool-level authorisation, idempotency, replay/concurrency protection,
  rate limits and fail-closed dependency behaviour;
- complete audit facts, privacy-safe monitoring, incident response, human review and break-glass
  disposition; and
- synthetic local/preview/hosted security evidence plus rollback before release.

No MCP tool may diagnose, recommend treatment, prescribe, dispense, override a clinician/pharmacist,
or expose internal RAG merely because a model or protocol can technically call it. Those capabilities
require their own clinical, pharmacy, legal, privacy, security and operational approvals.

## Outcome

TD-047 and TD-048 remain Verified as regression-controlled absence decisions. Future optional MCP
work remains possible, but no protocol or vendor is part of the v1 runtime and no reintroduction is
implicitly approved.
