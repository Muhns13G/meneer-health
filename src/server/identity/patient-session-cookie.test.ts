import { describe, expect, it } from "vitest";

import type { PatientSession } from "@/application/identity/patient-session-service";
import {
  openPatientSession,
  patientSessionCookie,
  readPatientSessionKey,
  sealPatientSession,
} from "./patient-session-cookie";

const now = Date.parse("2030-01-01T00:00:00.000Z");
const key = new Uint8Array(32).fill(7);
const otherKey = new Uint8Array(32).fill(8);
const value = {
  session: {
    id: "40000000-0000-4000-8000-000000000001",
    subjectId: "20000000-0000-4000-8000-000000000001",
    providerSessionId: "50000000-0000-4000-8000-000000000001",
    sessionClass: "patient",
    assurance: "aal1",
    status: "active",
    issuedAt: new Date(now),
    lastSeenAt: new Date(now),
    idleExpiresAt: new Date(now + 30 * 60_000),
    absoluteExpiresAt: new Date(now + 12 * 60 * 60_000),
  },
  providerSession: {
    accessToken: "synthetic-access",
    refreshToken: "synthetic-refresh",
    expiresAt: new Date(now + 15 * 60_000),
  },
  providerIdentity: {
    provider: "supabase",
    providerSubject: "30000000-0000-4000-8000-000000000001",
    providerSessionId: "50000000-0000-4000-8000-000000000001",
    assurance: "aal1",
    authenticatedAt: new Date(now),
    expiresAt: new Date(now + 15 * 60_000),
    verifiedContact: { kind: "email", value: "patient@example.invalid", verifiedAt: new Date(now) },
  },
  tenantId: "10000000-0000-4000-8000-000000000001",
} as PatientSession;

describe("host-only patient session proof", () => {
  it("encrypts tokens, enforces absolute expiry and rejects tampering or a different key", async () => {
    const token = await sealPatientSession(value, key, now);
    expect(token).not.toContain("synthetic-access");
    expect(token).not.toContain("patient@example.invalid");
    await expect(openPatientSession(token, key, now)).resolves.toMatchObject({
      sessionId: value.session.id,
    });
    await expect(openPatientSession(token, otherKey, now)).resolves.toBeNull();
    await expect(openPatientSession(`${token}x`, key, now)).resolves.toBeNull();
    await expect(openPatientSession(token, key, now + 12 * 60 * 60_000)).resolves.toBeNull();
    expect(patientSessionCookie(token, value.session.absoluteExpiresAt, now)).toContain(
      "HttpOnly; Secure; SameSite=Strict",
    );
  });

  it("requires a separate exact 32-byte server key", () => {
    expect(readPatientSessionKey(btoa(String.fromCharCode(...key)))).toEqual(key);
    expect(() => readPatientSessionKey(undefined)).toThrow("PATIENT_SESSION_KEY_INVALID");
    expect(() => readPatientSessionKey("short")).toThrow("PATIENT_SESSION_KEY_INVALID");
  });
});
