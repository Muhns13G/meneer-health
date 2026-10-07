import type { SupabaseClient } from "@supabase/supabase-js";
import { expect, it, vi } from "vitest";
import { SupabasePatientRightsRepository } from "./supabase-patient-rights-repository";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";
import { PatientRightsConflictError } from "@/domain/identity/patient-rights";
const id = "98000000-0000-4000-8000-000000000001";
const context = {
  tenantId: id,
  subjectId: id,
  sessionId: id,
  providerSubject: id,
  providerSessionId: id,
  verifiedEmail: "rights@example.invalid",
  purpose: "account" as const,
};
const command = {
  action: "request" as const,
  kind: "export" as const,
  expectedVersion: 1,
  requestKey: id,
};
it("supplies server context and validated command to the governed RPC", async () => {
  const data = { reference: id, outcome: "received", profileVersion: 1 };
  const rpc = vi.fn(async () => ({ data, error: null }));
  expect(
    await new SupabasePatientRightsRepository({ rpc } as unknown as SupabaseClient).execute(
      context,
      command,
    ),
  ).toEqual(data);
  expect(rpc).toHaveBeenCalledWith(
    "execute_patient_account_command",
    expect.objectContaining({ p_subject_id: id, p_purpose: "account", p_command: command }),
  );
});
it.each([
  ["42501", IdentityRejectedError],
  ["40001", PatientRightsConflictError],
  ["XX000", IdentityUnavailableError],
] as const)("redacts database error %s", async (code, ErrorType) => {
  const rpc = vi.fn(async () => ({ data: null, error: { code, message: "sensitive" } }));
  await expect(
    new SupabasePatientRightsRepository({ rpc } as unknown as SupabaseClient).execute(
      context,
      command,
    ),
  ).rejects.toBeInstanceOf(ErrorType);
});
it("rejects an extra-field response", async () => {
  const rpc = vi.fn(async () => ({
    data: {
      reference: id,
      outcome: "received",
      profileVersion: 1,
      email: "rights@example.invalid",
    },
    error: null,
  }));
  await expect(
    new SupabasePatientRightsRepository({ rpc } as unknown as SupabaseClient).execute(
      context,
      command,
    ),
  ).rejects.toBeInstanceOf(IdentityUnavailableError);
});
