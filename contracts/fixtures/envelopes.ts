export const validCommandEnvelope = {
  contract: "example.perform",
  version: 1,
  requestId: "request_01",
  idempotencyKey: "retry_01",
  correlationId: "trace_01",
  actor: { type: "service", id: "subject_actor_01" },
  subjectId: "subject_01",
  expectedVersion: 0,
  requestedAt: "2026-08-10T10:15:30+02:00",
  payload: { exampleReference: "example_01" },
} as const;

export const validEventEnvelope = {
  eventId: "event_01",
  event: "example.performed",
  version: 1,
  aggregate: { type: "example", id: "aggregate_01", version: 1 },
  occurredAt: "2026-08-10T10:15:31+02:00",
  recordedAt: "2026-08-10T10:15:32+02:00",
  actor: { type: "service", id: "subject_actor_01" },
  correlationId: "trace_01",
  causationId: "request_01",
  payload: { exampleReference: "example_01" },
} as const;

export const invalidCommandFixtures = [
  { ...validCommandEnvelope, version: 0 },
  { ...validCommandEnvelope, contract: "ExamplePerform" },
  { ...validCommandEnvelope, requestedAt: "10 August 2026" },
  { ...validCommandEnvelope, unexpectedRole: "administrator" },
] as const;
