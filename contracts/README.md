# Canonical Contract Boundary

This directory contains runtime-validatable, framework-neutral boundary contracts. It must not
import React, TanStack, Cloudflare, route, component, ORM, or provider SDK types.

Dependency direction is inward:

`routes/components -> adapters -> application -> domain/contracts`

- `contracts/` owns portable schemas, stable errors, compatibility rules, registry metadata,
  fixtures, and contract tests.
- `capabilities.ts` inventories retained, intentionally changed, and retired v1 behaviour;
  `registry.ts` maps each supported contract major to its runtime schema and database migration.
- `fixtures/retained-capabilities.json` is language-neutral input for v1/v2/v3 acceptance harnesses.
  `bun run check:portability` rejects missing ownership, fixture, schema, version, source, or
  migration references before a framework candidate can claim equivalence.
- `src/domain/` may depend on contracts but never on UI, framework, or adapter code.
- `src/application/` coordinates domain behaviour through ports; it never imports concrete
  adapters, routes, or UI.
- `src/adapters/` translates HTTP, framework, provider, persistence, and transport objects at the
  edge. Adapter objects are never canonical contracts.

ESLint enforces these import directions. Add exact business payload schemas only after their data,
identity, authority, and release gates are approved. A producer may emit a major version only when
every registered consumer supports it.

Migration candidates must consume the JSON fixtures without rewriting their expected observations.
An intentional difference changes the capability disposition and requires approval; an unexplained
difference is a stop condition. Use the v1-to-v2 rehearsal template under `docs/06-operations/`
before any real cutover.
