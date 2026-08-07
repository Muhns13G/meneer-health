# Responsibility Matrix Template

Use role names rather than private personal details. Add an explicit exception or escalation row for
every material hand-off.

## Role Key

- **R — Responsible:** performs the work.
- **A — Accountable:** owns the outcome; exactly one role per activity.
- **C — Consulted:** provides required input before action.
- **I — Informed:** receives the outcome or status.
- **TBC:** unresolved; include the owner role and release gate.

## Matrix

| Activity or decision | Meneer brand | Octothorp ZA | Clinical provider | Pharmacy partner | Other partner | Evidence or gate                    |
| -------------------- | ------------ | ------------ | ----------------- | ---------------- | ------------- | ----------------------------------- |
| Example activity     | I            | A/R          | C                 | I                | —             | `[TBC — owner: ROLE — gate: EVENT]` |

## Hand-off Contract

For every cross-party hand-off, record:

| Field                | Required detail                                                       |
| -------------------- | --------------------------------------------------------------------- |
| Trigger              | Event and preconditions that start the hand-off                       |
| Sender and recipient | Responsible role or system on each side                               |
| Minimum data         | Purpose-limited fields; exclude unnecessary health information        |
| Authority            | Required clinical, legal/privacy, commercial, or operational approval |
| Acknowledgement      | Durable evidence that the recipient accepted responsibility           |
| Timeout and retry    | Time limit, retry/idempotency rule, and duplicate handling            |
| Exception owner      | Accountable role for rejection, delay, partial failure, or escalation |
| Audit evidence       | Correlation identifier, safe metadata, outcome, and retention rule    |
