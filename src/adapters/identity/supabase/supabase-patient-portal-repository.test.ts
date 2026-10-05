import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabasePatientPortalRepository } from "./supabase-patient-portal-repository";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";
import { portalAccountFixture } from "@/test/patient-portal-fixture";
const id = "97000000-0000-4000-8000-000000000001";
const context = {
  tenantId: id,
  subjectId: id,
  sessionId: id,
  providerSubject: id,
  providerSessionId: id,
  verifiedEmail: "portal@example.invalid",
  purpose: "account" as const,
};
it("uses the governed own-account projection, not browser table grants", async () => {
  const rpc = vi.fn(async () => ({ data: portalAccountFixture, error: null }));
  const repository = new SupabasePatientPortalRepository({ rpc } as unknown as SupabaseClient);
  await expect(repository.readOwnAccount(context)).resolves.toEqual(portalAccountFixture);
  expect(rpc).toHaveBeenCalledWith("read_patient_portal_with_operations", {
    p_tenant_id: id,
    p_subject_id: id,
    p_session_id: id,
    p_provider_subject: id,
    p_provider_session_id: id,
    p_verified_email: context.verifiedEmail,
    p_purpose: "account",
  });
});
it.each([
  { ...portalAccountFixture, protocol: "excluded" },
  { ...portalAccountFixture, profile: { ...portalAccountFixture.profile, password: "excluded" } },
  { ...portalAccountFixture, instruments: [] },
  { ...portalAccountFixture, workflows: [{ reference: id, clinicalState: "approved" }] },
  {
    ...portalAccountFixture,
    operationsCases: [
      { reference: id, status: "provider_review_pending", updatedAt: "2026-10-03T00:00:00Z" },
    ],
  },
  {
    ...portalAccountFixture,
    operationsCases: [
      { reference: id, status: "waiting", updatedAt: "2026-10-03T00:00:00Z", outcome: "completed" },
    ],
  },
  { ...portalAccountFixture, operationsCases: undefined },
])("fails closed on extra, missing or sensitive provider fields", async (data) => {
  const repository = new SupabasePatientPortalRepository({
    rpc: async () => ({ data, error: null }),
  } as unknown as SupabaseClient);
  await expect(repository.readOwnAccount(context)).rejects.toBeInstanceOf(IdentityUnavailableError);
});
it("redacts rejection and dependency diagnostics", async () => {
  for (const code of ["42501", "XX000"]) {
    const repository = new SupabasePatientPortalRepository({
      rpc: async () => ({ error: { code, message: "private detail" } }),
    } as unknown as SupabaseClient);
    await expect(repository.readOwnAccount(context)).rejects.toBeInstanceOf(
      code === "42501" ? IdentityRejectedError : IdentityUnavailableError,
    );
  }
});
