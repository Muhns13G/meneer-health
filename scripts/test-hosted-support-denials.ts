// Anonymous negative-path preflight only. No fixtures, credentials, emails or activation.
export {};
const origin = "https://meneerhealth.co.za";
if (process.env.HOSTED_SUPPORT_DENIALS_CONFIRM !== "canonical-anonymous-only") {
  throw new Error("HOSTED_SUPPORT_DENIALS_GUARD_REQUIRED");
}
const checks = [
  ["/portal/support/command", { action: "read" }, 401],
  [
    "/portal/support/command",
    {
      action: "request",
      purpose: "clinical",
      urgent: true,
      requestKey: "e1280000-0000-4000-8000-000000000001",
    },
    401,
  ],
  ["/staff/support/command", { action: "read" }, 401],
  ["/staff/support/followup", { action: "read" }, 401],
  ["/api/notifications/brevo/webhook", { event: "delivered" }, 404],
] as const;
for (const [path, body, expected] of checks) {
  const response = await fetch(origin + path, {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "Sec-Fetch-Site": "same-origin",
    },
    body: JSON.stringify(body),
  });
  if (response.status !== expected) throw new Error(`HOSTED_SUPPORT_STATUS_${response.status}`);
  if (!response.headers.get("cache-control")?.includes("no-store"))
    throw new Error("HOSTED_SUPPORT_CACHE_POLICY_FAILED");
  if (response.headers.has("access-control-allow-origin"))
    throw new Error("HOSTED_SUPPORT_CORS_POLICY_FAILED");
  await response.body?.cancel();
}
console.log(
  JSON.stringify({
    exercise: "hosted-support-anonymous-denials",
    checks: checks.length,
    protectedCommandsDenied: true,
    callbackDisabled: true,
    noStore: true,
    corsGrant: false,
    authenticatedFlowProved: false,
    emailsSent: 0,
    fixtureWrites: 0,
  }),
);
