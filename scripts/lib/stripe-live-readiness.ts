import { z } from "zod";

const configurationSchema = z.object({
  STRIPE_LIVE_READINESS_CONFIRM: z.literal("read-only-live-account"),
  STRIPE_LIVE_ACCOUNT_ID: z.string().regex(/^acct_[A-Za-z0-9]{8,64}$/),
  STRIPE_LIVE_RESTRICTED_KEY: z.string().startsWith("rk_live_").min(20),
});
export function readStripeLiveReadinessConfiguration(input: Readonly<Record<string, unknown>>) {
  const parsed = configurationSchema.safeParse(input);
  if (!parsed.success) throw new Error("STRIPE_LIVE_READINESS_CONFIGURATION_INVALID");
  return parsed.data;
}

const accountSchema = z.object({
  id: z.string(),
  country: z.string().nullable().optional(),
  charges_enabled: z.boolean(),
  payouts_enabled: z.boolean(),
  details_submitted: z.boolean(),
  capabilities: z.object({ card_payments: z.string().optional() }).nullable().optional(),
  requirements: z
    .object({
      disabled_reason: z.string().nullable().optional(),
      currently_due: z.array(z.string()).nullable().optional(),
      pending_verification: z.array(z.string()).nullable().optional(),
    })
    .nullable()
    .optional(),
});
export function summarizeStripeLiveAccount(value: unknown, expectedAccountId: string) {
  const parsed = accountSchema.safeParse(value);
  if (!parsed.success) throw new Error("STRIPE_LIVE_READINESS_RESPONSE_INVALID");
  const account = parsed.data;
  if (account.id !== expectedAccountId) throw new Error("STRIPE_LIVE_READINESS_ACCOUNT_MISMATCH");
  return {
    exercise: "stripe-live-account-read-only",
    accountMatches: true,
    country: account.country ?? null,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    cardPaymentsActive: account.capabilities?.card_payments === "active",
    hasDisabledReason: Boolean(account.requirements?.disabled_reason),
    currentlyDueCount: account.requirements?.currently_due?.length ?? 0,
    pendingVerificationCount: account.requirements?.pending_verification?.length ?? 0,
    // Provider capability flags alone do not approve the seller/business or the application release.
    paymentActivationApproved: false,
  } as const;
}
