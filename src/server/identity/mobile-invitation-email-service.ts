import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ManagedIdentityProvider } from "@/application/identity/managed-identity-provider";
import type { VerifiedPatientInvitation } from "@/application/identity/patient-invitation-verification-service";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { mobileDigest, type MobileClaimProof } from "./mobile-invitation-claim";

export type MobileEmailRepository = {
  call(name: string, args: Record<string, unknown>): Promise<unknown>;
};
export function mobileEmailRepository(client: SupabaseClient): MobileEmailRepository {
  return {
    async call(name, args) {
      const { data, error } = await client.rpc(name, args);
      if (error) throw new Error("MOBILE_EMAIL_UNAVAILABLE");
      return data;
    },
  };
}
const reservationSchema = z.discriminatedUnion("dispatch", [
  z
    .object({
      dispatch: z.literal(true),
      state: z.literal("reserved"),
      email: z.email(),
      invitationId: z.uuid(),
      creationProof: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict(),
  z
    .object({ dispatch: z.literal(false), state: z.enum(["reserved", "delivered", "uncertain"]) })
    .strict(),
]);
const invitationSchema = z
  .object({
    id: z.uuid(),
    tenantId: z.uuid(),
    contactDigest: z.string().regex(/^[a-f0-9]{64}$/),
    providerSubject: z.uuid(),
    expiresAt: z.iso.datetime({ offset: true }),
    email: z.email(),
    otpKind: z.enum(["invite", "email"]),
  })
  .strict();
const resumeSchema = z.discriminatedUnion("dispatch", [
  z.object({ dispatch: z.literal(true), email: z.email() }).strict(),
  z.object({ dispatch: z.literal(false) }).strict(),
]);
async function parameters(proof: MobileClaimProof) {
  return {
    p_tenant_id: proof.tenantId,
    p_token_digest: proof.tokenDigest,
    p_claim_digest: await mobileDigest(proof.secret),
    p_request_key: proof.requestKey,
  };
}

/** Managed-provider sessions stay server-side. Only an exact live claim may reach preactivation. */
export class MobileInvitationEmailService {
  constructor(
    private readonly repository: MobileEmailRepository,
    private readonly provider: Pick<
      ManagedIdentityProvider,
      | "invitePatient"
      | "requestPatientSignIn"
      | "verifyEmailOtp"
      | "verifyInvitationOtp"
      | "verifyAccessToken"
      | "revokeSessions"
    >,
  ) {}

  async request(proof: MobileClaimProof): Promise<boolean> {
    const args = await parameters(proof);
    const data = await this.repository.call("prepare_mobile_email_exchange", args);
    if (data === null) return false;
    const reservation = reservationSchema.parse(data);
    if (!reservation.dispatch) {
      if (reservation.state !== "delivered") return false;
      const data = await this.repository.call("prepare_mobile_email_resume", args);
      if (data === null) return false;
      const resume = resumeSchema.parse(data);
      if (!resume.dispatch) return true;
      try {
        // Existing exact, proven identity only (provider uses shouldCreateUser:false).
        // Native lease is committed before sending; lost responses never cause a blind resend.
        await this.provider.requestPatientSignIn(
          resume.email,
          "https://meneerhealth.co.za/mobile-invitation",
        );
        return true;
      } catch {
        return false;
      }
    }
    try {
      const providerSubject = await this.provider.invitePatient(
        reservation.email,
        "https://meneerhealth.co.za/mobile-invitation",
        reservation.creationProof,
      );
      return (
        (await this.repository.call("finish_mobile_email_exchange", {
          ...args,
          p_provider_subject: providerSubject,
        })) === true
      );
    } catch {
      // A lost response is not proof of non-delivery. Never re-send a reserved invocation.
      try {
        await this.repository.call("finish_mobile_email_exchange", {
          ...args,
          p_provider_subject: null,
        });
      } catch {
        /* Reservation remains fail-closed. */
      }
      return false;
    }
  }

  async verify(proof: MobileClaimProof, code: string): Promise<VerifiedPatientInvitation> {
    if (!/^\d{6}$/.test(code)) throw new IdentityRejectedError();
    const args = await parameters(proof);
    const before = invitationSchema.parse(
      await this.repository.call("read_mobile_email_exchange_for_resume", args),
    );
    if (before.tenantId !== proof.tenantId || Date.parse(before.expiresAt) <= Date.now())
      throw new IdentityRejectedError();
    const session = await this.provider[
      before.otpKind === "email" ? "verifyEmailOtp" : "verifyInvitationOtp"
    ](before.email, code);
    try {
      const identity = await this.provider.verifyAccessToken(session.accessToken);
      const after = invitationSchema.parse(
        await this.repository.call("read_mobile_email_exchange_for_resume", args),
      );
      if (
        JSON.stringify(before) !== JSON.stringify(after) ||
        identity.providerSubject !== before.providerSubject ||
        identity.verifiedContact.kind !== "email" ||
        identity.verifiedContact.value.trim().toLowerCase() !== before.email ||
        identity.expiresAt.getTime() <= Date.now() ||
        (await this.repository.call("verify_mobile_email_exchange", {
          ...args,
          p_provider_subject: identity.providerSubject,
          p_provider_session_id: identity.providerSessionId,
        })) !== true
      )
        throw new IdentityRejectedError();
      return {
        invitation: {
          id: before.id,
          tenantId: before.tenantId,
          contactDigest: before.contactDigest,
          providerSubject: before.providerSubject,
          intendedRole: "patient",
          status: "pending",
          expiresAt: new Date(before.expiresAt),
        },
        session: {
          ...session,
          expiresAt: new Date(Math.min(session.expiresAt.getTime(), Date.parse(before.expiresAt))),
        },
      };
    } catch {
      try {
        await this.provider.revokeSessions(session.accessToken, "local");
      } catch {
        /* No application authority is issued. */
      }
      throw new IdentityRejectedError();
    }
  }
}
