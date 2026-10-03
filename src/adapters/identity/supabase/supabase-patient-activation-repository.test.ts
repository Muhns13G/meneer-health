import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabasePatientActivationRepository } from "./supabase-patient-activation-repository";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";
const id = "96000000-0000-4000-8000-000000000001";
const context = { invitationId: id, tenantId: id, providerSubject: id, providerSessionId: id };
const command = {
  givenName: "Synthetic",
  familyName: "Client",
  mobileE164: "+27820000000",
  contactPreference: "email" as const,
  termsPublicationId: id,
  termsHash: "a".repeat(64),
  privacyPublicationId: id,
  privacyHash: "b".repeat(64),
  termsAccepted: true as const,
  privacyAcknowledged: true as const,
  requestKey: id,
};
it("uses one governed RPC, never table writes, and returns durable profile reference", async () => {
  const rpc = vi.fn(async () => ({ data: id, error: null }));
  const repository = new SupabasePatientActivationRepository({ rpc } as unknown as SupabaseClient);
  await expect(repository.activate(context, command)).resolves.toBe(id);
  expect(rpc).toHaveBeenCalledWith("activate_pilot_account", {
    p_invitation_id: id,
    p_tenant_id: id,
    p_provider_subject: id,
    p_provider_session_id: id,
    p_command: command,
  });
});
it.each(["42501", "22023"])("maps rejected command %s without provider details", async (code) => {
  const repository = new SupabasePatientActivationRepository({
    rpc: async () => ({ error: { code, message: "private detail" } }),
  } as unknown as SupabaseClient);
  await expect(repository.activate(context, command)).rejects.toBeInstanceOf(IdentityRejectedError);
});
it("rejects malformed instrument response instead of enabling profile collection", async () => {
  const repository = new SupabasePatientActivationRepository({
    rpc: async () => ({
      data: { verifiedEmail: "synthetic@example.invalid", documents: [] },
      error: null,
    }),
  } as unknown as SupabaseClient);
  await expect(repository.prepare(context)).rejects.toBeInstanceOf(IdentityUnavailableError);
});
