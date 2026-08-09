# Canonical Contract Boundary

This directory contains runtime-validatable, framework-neutral boundary contracts. It must not
import React, TanStack, Cloudflare, route, component, ORM, or provider SDK types.

Dependency direction is inward:

`routes/components -> adapters -> application -> domain/contracts`

- `contracts/` owns portable schemas, stable errors, compatibility rules, registry metadata,
  fixtures, and contract tests.
- `src/domain/` may depend on contracts but never on UI, framework, or adapter code.
- `src/application/` coordinates domain behaviour through ports; it never imports concrete
  adapters, routes, or UI.
- `src/adapters/` translates HTTP, framework, provider, persistence, and transport objects at the
  edge. Adapter objects are never canonical contracts.

ESLint enforces these import directions. Add exact business payload schemas only after their data,
identity, authority, and release gates are approved. A producer may emit a major version only when
every registered consumer supports it.
