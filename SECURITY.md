# Security Policy

## Reporting a Vulnerability

Do not report suspected vulnerabilities, credentials, private configuration, or patient-related
information in a public GitHub issue or pull request.

Email `support@meneerhealth.co.za` with the subject `Security report — Meneer Health`. Include only
the minimum information needed to reproduce and assess the issue:

- affected route, component, dependency, or environment;
- observed and expected behaviour;
- synthetic reproduction steps;
- likely impact and whether exploitation is ongoing; and
- a safe contact method for follow-up.

Do not send passwords, API keys, access tokens, real patient information, clinical records, or
unredacted production logs. If sensitive evidence is necessary, first request an approved secure
transfer method.

## Supported Boundary

Security maintenance currently covers the permanent `itws-I` v1 source and its approved Cloudflare
runtime. `itws-I-preview` adds a draft-review video but must otherwise absorb the permanent source.
Future Next.js or Laravel/React generations are not supported until implemented and explicitly
adopted.

## Repository Controls

- Secrets belong in ignored `.dev.vars*` files locally and approved hosted secret storage.
- Every `VITE_*` variable is browser-visible and must never contain a secret.
- Test fixtures and failure artifacts must be synthetic and free of patient information.
- Dependency findings must be mapped to their path and reachability; do not apply broad force-fixes.
- Only the repository owner may change hosted security settings or perform releases and rollbacks.

This channel is for product security. Medical emergencies or urgent clinical concerns must use the
appropriate emergency or clinical pathway, not a repository report.
