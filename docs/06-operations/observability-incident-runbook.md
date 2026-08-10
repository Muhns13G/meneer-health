# Observability and Incident Runbook

## Purpose and Boundary

This runbook governs the v1 free-tier monitoring boundary. Cloudflare Workers Logs receives only
strict `telemetry.event` objects. Better Stack receives only the public monitor URL, status, timing,
and later a payload-free backup heartbeat. Neither destination may receive identities, contact
details, URLs with query strings, headers, tokens, request bodies, clinical data, or provider
payloads. PostgreSQL remains authoritative for identified audit facts.

Cloudflare automatic invocation logs are disabled because they include transport-level request
metadata. Application telemetry is fail-open for availability: a logging failure never converts a
successful transaction into failure, while authoritative audit writes remain fail-closed where the
workflow requires them.

## Objectives and Alerts

| Control                                        | Pilot objective                                     | Alert owner                 |
| ---------------------------------------------- | --------------------------------------------------- | --------------------------- |
| Public homepage availability                   | 99.5% over a rolling 30 days                        | Technology/operations owner |
| External uptime check                          | Every 3 minutes; alert after two confirmed failures | Technology/operations owner |
| Dependency unavailable or request timeout      | Alert on first event                                | Technology/operations owner |
| Five server failures in one five-minute window | Critical alert                                      | Technology/operations owner |
| Ten rate/challenge denials in five minutes     | Warning alert                                       | Security owner              |
| Any break-glass attempt                        | Critical alert and next-business-day review         | Security/privacy owner      |

Critical alerts must be acknowledged within 15 minutes; warnings within 60 minutes. These are
internal pilot objectives, not a public SLA. Correlation identifiers are the only join key permitted
between runtime logs, incident notes, and append-only evidence.

## Owner Activation

The repository owner performs these hosted steps; no credential is committed:

1. In Better Stack, create an HTTP status monitor for `https://meneerhealth.co.za/` at the available
   three-minute free interval. Require a 2xx response and two confirmed failures before escalation.
2. Route email alerts to the company-controlled, daily monitored support channel and configure the
   repository owner as the initial responder. Record monitor ID, creation date, and a redacted
   screenshot in the release evidence.
3. In Cloudflare Workers > Observability, confirm custom logs are retained and invocation logs are
   absent. Filter on `contract=telemetry.event`, then by `event`, `environment`, `reasonCode`, and
   `correlationId`. Never export unreviewed raw platform logs into the repository.
4. Trigger a Better Stack test incident or controlled monitor failure, acknowledge it, restore the
   service, close the incident, and record timestamps against the objectives above.
5. Task 5.13 separately provisions and tests the payload-free backup heartbeat. Do not send command
   output, database names, object names, or error bodies to the heartbeat URL.

## Incident Procedure

1. **Detect:** capture alert code, time, environment, status class, and correlation ID.
2. **Triage:** confirm scope through allowlisted logs and authoritative audit facts; do not add raw
   payloads to chat, tickets, screenshots, or logs.
3. **Contain:** disable the affected release gate, revoke a credential, or roll back through the
   approved Cloudflare release runbook. Do not weaken authentication, RLS, or audit controls.
4. **Recover:** verify the public route, affected synthetic journey, and evidence chain. Task 5.13
   governs data restore.
5. **Review:** assign owner, cause code, impact window, corrective action, and follow-up date. Retain
   only minimum safe evidence under DR-005.

Run `bun run exercise:incident` before release-affecting observability changes. A pass must show both
`BREAK_GLASS_ATTEMPT` and `DEPENDENCY_FAILURE`, rejection of prohibited fields, and the complete
detect/triage/contain/recover/review sequence.
