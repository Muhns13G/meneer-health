import "@tanstack/react-start/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { MobileOrphanRetirementProvider } from "@/application/identity/mobile-orphan-retirement-service";

/** Separate administrative capability; never expose through ordinary managed sign-in APIs.
 * Native reservation must already freeze authority and prove no live provider sessions.
 */
export class SupabaseMobileOrphanRetirementProvider implements MobileOrphanRetirementProvider {
  constructor(private readonly client: SupabaseClient) {}
  async observe(providerSubjectId: string) {
    if (!z.uuid().safeParse(providerSubjectId).success) return { status: "unknown" };
    try {
      const { data, error } = await this.client.auth.admin.getUserById(providerSubjectId);
      if (error)
        return error.status === 404 && error.code === "user_not_found"
          ? { status: "absent", providerSubjectId }
          : { status: "unknown" };
      return data.user?.id === providerSubjectId
        ? { status: "present", providerSubjectId }
        : { status: "unknown" };
    } catch {
      return { status: "unknown" };
    }
  }
  async removeUnconfirmed(
    providerSubjectId: string,
    contactDigest: string,
  ): Promise<"attempted" | "protected"> {
    if (!z.uuid().safeParse(providerSubjectId).success || !/^[a-f0-9]{64}$/.test(contactDigest))
      return "protected";
    const { data, error } = await this.client.auth.admin.getUserById(providerSubjectId);
    if (
      error ||
      data.user?.id !== providerSubjectId ||
      data.user.email_confirmed_at ||
      data.user.phone_confirmed_at ||
      data.user.is_anonymous ||
      !data.user.email
    )
      return "protected";
    const digest = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(data.user.email.trim().toLowerCase()),
        ),
      ),
    )
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    if (digest !== contactDigest) return "protected";
    const removed = await this.client.auth.admin.deleteUser(providerSubjectId);
    if (removed.error) throw new Error("MOBILE_ORPHAN_PROVIDER_UNCERTAIN");
    // Even an acknowledged delete is not independently observed absence.
    return "attempted";
  }
}
