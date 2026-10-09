import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { SupabaseWorkforceContextRepository } from "./supabase-workforce-context-repository";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";
import type { ProviderIdentity } from "@/domain/access/identity";
const id = "a1000000-0000-4000-8000-000000000001";
const identity: ProviderIdentity = {
  provider: "supabase",
  providerSubject: id,
  providerSessionId: id,
  assurance: "aal2",
  authenticatedAt: new Date(),
  expiresAt: new Date(Date.now() + 3600_000),
  verifiedContact: { kind: "email", value: "Staff@Example.invalid", verifiedAt: new Date() },
};
describe("server-only workforce context repository", () => {
  it("resolves only a valid service-side approved target and fails closed on denial", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: id, error: null });
    const repo = new SupabaseWorkforceContextRepository({ rpc } as unknown as SupabaseClient);
    expect(await repo.resolveCodeTarget("staff@example.invalid")).toBe(id);
    expect(rpc).toHaveBeenCalledWith("resolve_workforce_code_target", {
      p_email: "staff@example.invalid",
    });
    for (const data of [null, "not-a-uuid", { id }]) {
      rpc.mockResolvedValueOnce({ data, error: null });
      await expect(repo.resolveCodeTarget("staff@example.invalid")).rejects.toBeInstanceOf(
        IdentityRejectedError,
      );
    }
    rpc.mockResolvedValueOnce({ data: null, error: { code: "42501" } });
    await expect(repo.resolveCodeTarget("staff@example.invalid")).rejects.toBeInstanceOf(
      IdentityRejectedError,
    );
  });
  it("lists only narrow current contexts and rejects duplicates or mixed subjects", async () => {
    const context = { subjectId: id, tenantId: id, role: "operations", purpose: "operations" };
    const rpc = vi.fn().mockResolvedValue({ data: [context], error: null });
    const repo = new SupabaseWorkforceContextRepository({ rpc } as unknown as SupabaseClient);
    expect(await repo.listContexts(identity)).toEqual([context]);
    expect(rpc).toHaveBeenCalledWith("list_workforce_contexts", {
      p_provider_subject: id,
      p_provider_session_id: id,
      p_verified_email: "staff@example.invalid",
    });
    for (const data of [
      [],
      [context, context],
      [{ ...context, token: "forbidden" }],
      [
        context,
        {
          ...context,
          subjectId: "a1000000-0000-4000-8000-000000000002",
          role: "auditor",
          purpose: "privacy_review",
        },
      ],
    ]) {
      rpc.mockResolvedValueOnce({ data, error: null });
      await expect(repo.listContexts(identity)).rejects.toBeInstanceOf(IdentityUnavailableError);
    }
  });
  it("uses verified provider arguments and validates the narrow response", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { subjectId: id, tenantId: id, role: "operations", purpose: "operations" },
      error: null,
    });
    const repo = new SupabaseWorkforceContextRepository({ rpc } as unknown as SupabaseClient);
    expect((await repo.resolve(identity)).role).toBe("operations");
    expect(rpc).toHaveBeenCalledWith("resolve_workforce_context", {
      p_provider_subject: id,
      p_provider_session_id: id,
      p_verified_email: "staff@example.invalid",
      p_session_id: null,
      p_subject_id: null,
      p_tenant_id: null,
    });
    rpc.mockResolvedValueOnce({
      data: { role: "admin", patientData: "not-permitted" },
      error: null,
    });
    await expect(repo.resolve(identity)).rejects.toBeInstanceOf(IdentityUnavailableError);
  });
  it.each(["42501", "23505"])(
    "maps %s to denial without returning provider details",
    async (code) => {
      const rpc = vi
        .fn()
        .mockResolvedValue({ data: null, error: { code, message: "private detail" } });
      const repo = new SupabaseWorkforceContextRepository({ rpc } as unknown as SupabaseClient);
      await expect(repo.resolve(identity)).rejects.toBeInstanceOf(IdentityRejectedError);
    },
  );
});
