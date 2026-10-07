import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { IntakeConflictError } from "@/application/intake/medical-intake-service";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";
import { SupabaseIntakeRepository } from "./supabase-intake-repository";

describe("medical intake provider conflict mapping", () => {
  it.each(["PT409", "40001", "23505"])("maps %s to a bounded business conflict", async (code) => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code } });
    const repository = new SupabaseIntakeRepository({ rpc } as unknown as SupabaseClient);
    await expect(repository.call("patient_intake_write", {})).rejects.toBeInstanceOf(
      IntakeConflictError,
    );
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it.each([
    ["42501", IdentityRejectedError],
    ["57014", IdentityUnavailableError],
    ["PGRST000", IdentityUnavailableError],
  ])("preserves the fail-closed mapping for %s", async (code, errorType) => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code } });
    const repository = new SupabaseIntakeRepository({ rpc } as unknown as SupabaseClient);
    await expect(repository.call("patient_intake_write", {})).rejects.toBeInstanceOf(errorType);
  });
});
