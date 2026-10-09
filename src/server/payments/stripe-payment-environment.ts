import "@tanstack/react-start/server-only";
import { z } from "zod";

export const stripePaymentEnvironmentSchema = z.enum(["sandbox", "live"]);
export type StripePaymentEnvironment = z.infer<typeof stripePaymentEnvironmentSchema>;

export function stripeSessionSchema(environment: StripePaymentEnvironment) {
  stripePaymentEnvironmentSchema.parse(environment);
  return z
    .string()
    .regex(
      environment === "live" ? /^cs_live_[A-Za-z0-9_]{8,120}$/ : /^cs_test_[A-Za-z0-9_]{8,120}$/,
    );
}

export function assertStripeCredential(
  key: unknown,
  accountId: string,
  environment: StripePaymentEnvironment,
  errorCode: string,
): asserts key is string {
  if (
    !stripePaymentEnvironmentSchema.safeParse(environment).success ||
    typeof key !== "string" ||
    !key.startsWith(environment === "live" ? "rk_live_" : "rk_test_") ||
    !/^acct_[A-Za-z0-9]{8,64}$/.test(accountId)
  )
    throw new Error(errorCode);
}

export function stripeObjectMatchesEnvironment(
  object: { livemode?: unknown },
  environment: StripePaymentEnvironment,
) {
  return object.livemode === (environment === "live");
}
