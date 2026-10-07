import { z } from "zod";

export const notificationTemplateSchema = z.enum([
  "account-v1",
  "payment-v1",
  "service-v1",
  "support-v1",
]);

// No interpolated profile, financial, medical or support fields are accepted.
export const notificationTemplates = Object.freeze({
  "account-v1": {
    subject: "Meneer Health — account update",
    text: "An account update is available. Sign in to review it securely.",
  },
  "payment-v1": {
    subject: "Meneer Health — payment update",
    text: "A payment update is available. Sign in to review its status securely.",
  },
  "service-v1": {
    subject: "Meneer Health — service update",
    text: "A service update is available. Sign in to review it securely.",
  },
  "support-v1": {
    subject: "Meneer Health — support update",
    text: "A support update is available. Sign in to review it securely.",
  },
});

export const notificationClaimSchema = z.strictObject({
  notificationId: z.uuid(),
  leaseId: z.uuid(),
  template: notificationTemplateSchema,
  recipient: z.email(),
});
export type NotificationClaim = z.infer<typeof notificationClaimSchema>;
export type NotificationOutcome = "accepted" | "retryable" | "failed" | "uncertain";
export type NotificationRepository = {
  claim(): Promise<NotificationClaim | null>;
  finish(claim: NotificationClaim, outcome: NotificationOutcome): Promise<void>;
};

export async function dispatchTransactionalNotifications(
  repository: NotificationRepository,
  send: (claim: NotificationClaim) => Promise<NotificationOutcome>,
): Promise<number> {
  let processed = 0;
  for (; processed < 3; processed++) {
    const value = await repository.claim();
    if (value === null) break;
    const claim = notificationClaimSchema.parse(value);
    let outcome: NotificationOutcome;
    try {
      outcome = await send(claim);
    } catch {
      outcome = "uncertain";
    }
    // A failed receipt leaves its durable lease to expire uncertain, never to resend.
    await repository.finish(claim, outcome);
  }
  return processed;
}
