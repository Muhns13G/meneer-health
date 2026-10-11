import "@tanstack/react-start/server-only";
import { z } from "zod";
import {
  pilotEmailInvitationRequestSchema,
  type PilotEmailInvitationRequest,
  type PilotEmailInvitationResult,
} from "@/application/identity/pilot-email-invitation";

export interface PilotEmailInvitationRepository {
  prepare(
    input: PilotEmailInvitationRequest,
    digest: string,
  ): Promise<{ attemptId: string; dispatchUntil: string } | null>;
  finish(attemptId: string, outcome: "accepted" | "failed" | "uncertain"): Promise<void>;
}

// The only raw bearer exists in this request and the intended recipient's email.
// A committed native lease owns exactly one POST, including timeouts and process loss.
export async function dispatchPilotEmailInvitation(
  input: PilotEmailInvitationRequest,
  repository: PilotEmailInvitationRepository,
  apiKey: string,
  send: typeof fetch = fetch,
): Promise<PilotEmailInvitationResult> {
  const command = pilotEmailInvitationRequestSchema.parse(input);
  const token = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const claim = await repository.prepare(command, digest);
  if (!claim) return { outcome: "already_attempted" };
  let outcome: "accepted" | "failed" | "uncertain" = "uncertain";
  try {
    const deadline = Date.parse(claim.dispatchUntil);
    if (
      !z.uuid().safeParse(claim.attemptId).success ||
      !Number.isFinite(deadline) ||
      deadline <= Date.now()
    )
      throw new Error("INVITATION_LEASE_EXPIRED");
    const response = await send("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(Math.max(1, Math.min(10000, deadline - Date.now()))),
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Meneer Health", email: "support@meneerhealth.co.za" },
        to: [{ email: command.email }],
        subject: "Your Meneer Health pilot invitation",
        textContent: `Meneer Health invited you to its pilot. Open your unique invitation:\n\nhttps://meneerhealth.co.za/mobile-invitation#${token}\n\nValid for 48 hours. Continue only if you are the intended participant. Do not forward this link. You will verify this email address with a separate six-digit code before onboarding. Not for you? Open the link to decline. Help: support@meneerhealth.co.za.`,
        headers: { idempotencyKey: claim.attemptId },
      }),
    });
    outcome =
      response.status === 201
        ? "accepted"
        : response.status >= 400 && response.status < 500
          ? "failed"
          : "uncertain";
    await response.body?.cancel();
  } catch {
    /* The provider may have accepted. Never retry an uncertain send. */
  }
  try {
    await repository.finish(claim.attemptId, outcome);
  } catch {
    return { outcome: "uncertain" };
  }
  return { outcome };
}
