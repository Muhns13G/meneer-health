import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { SupabaseMobileOrphanRetirementProvider } from "./supabase-mobile-orphan-retirement-provider";

const id = "a1470000-0000-4000-8000-000000000001";
const other = "a1470000-0000-4000-8000-000000000002";
async function fixture() {
  const email = "synthetic@example.invalid";
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email))),
  )
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const user = {
    id,
    email: ` ${email.toUpperCase()} `,
    email_confirmed_at: "",
    phone_confirmed_at: "",
    is_anonymous: false,
  };
  const getUserById = vi.fn().mockResolvedValue({ data: { user }, error: null });
  const deleteUser = vi.fn().mockResolvedValue({ data: { user }, error: null });
  const client = { auth: { admin: { getUserById, deleteUser } } } as unknown as SupabaseClient;
  return {
    user,
    getUserById,
    deleteUser,
    digest,
    provider: new SupabaseMobileOrphanRetirementProvider(client),
  };
}
describe("exact-ID orphan provider administrative capability", () => {
  it("normalizes the attributed email and does not equate deletion acknowledgement with absence", async () => {
    const f = await fixture();
    expect(await f.provider.removeUnconfirmed(id, f.digest)).toBe("attempted");
    expect(f.deleteUser).toHaveBeenCalledExactlyOnceWith(id);
    expect(await f.provider.observe(id)).toEqual({ status: "present", providerSubjectId: id });
  });
  it.each([
    { email_confirmed_at: "2026-10-09T00:00:00Z" },
    { phone_confirmed_at: "2026-10-09T00:00:00Z" },
    { is_anonymous: true },
    { id: other },
    { email: "" },
    { email: "changed@example.invalid" },
  ])("protects changed or confirmed identity %j", async (patch) => {
    const f = await fixture();
    Object.assign(f.user, patch);
    expect(await f.provider.removeUnconfirmed(id, f.digest)).toBe("protected");
    expect(f.deleteUser).not.toHaveBeenCalled();
  });
  it("rejects arbitrary IDs and invalid digests before contacting the provider", async () => {
    const f = await fixture();
    expect(await f.provider.removeUnconfirmed("invalid", f.digest)).toBe("protected");
    expect(await f.provider.removeUnconfirmed(id, "invalid")).toBe("protected");
    expect(await f.provider.observe("invalid")).toEqual({ status: "unknown" });
    expect(f.getUserById).not.toHaveBeenCalled();
  });
  it("requires both the native not-found code and status for independently observed absence", async () => {
    const f = await fixture();
    f.getUserById.mockResolvedValue({
      data: { user: null },
      error: { status: 404, code: "user_not_found" },
    });
    expect(await f.provider.observe(id)).toEqual({ status: "absent", providerSubjectId: id });
    for (const error of [
      { status: 404, code: "other" },
      { status: 500, code: "user_not_found" },
    ]) {
      f.getUserById.mockResolvedValue({ data: { user: null }, error });
      expect(await f.provider.observe(id)).toEqual({ status: "unknown" });
    }
  });
  it("keeps failed reads and ambiguous deletes uncertain without exposing provider errors", async () => {
    const f = await fixture();
    f.deleteUser.mockResolvedValue({ data: null, error: { message: "private provider detail" } });
    await expect(f.provider.removeUnconfirmed(id, f.digest)).rejects.toThrow(
      "MOBILE_ORPHAN_PROVIDER_UNCERTAIN",
    );
    f.getUserById.mockRejectedValue(new Error("private provider detail"));
    expect(await f.provider.observe(id)).toEqual({ status: "unknown" });
  });
});
