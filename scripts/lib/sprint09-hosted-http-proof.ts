export async function proveSprint09HostedDenials(baseUrl: string, send: typeof fetch = fetch) {
  const base = new URL(baseUrl);
  if (
    base.origin !== "https://meneerhealth.co.za" ||
    base.pathname !== "/" ||
    base.search ||
    base.hash
  )
    throw new Error("SPRINT09_HOSTED_ORIGIN_REJECTED");
  const cases: Array<{ path: string; init?: RequestInit; status: number }> = [
    { path: "/portal/account", status: 401 },
    {
      path: "/portal/account",
      init: { headers: { Origin: "https://attacker.invalid" } },
      status: 403,
    },
    { path: "/portal/account?subject=synthetic", status: 405 },
    { path: "/account/activate/instruments", status: 401 },
    {
      path: "/account/activate/instruments",
      init: { headers: { "Sec-Fetch-Site": "cross-site" } },
      status: 403,
    },
    {
      path: "/portal/rights/command",
      init: {
        method: "POST",
        headers: { Origin: base.origin, "Content-Type": "application/json" },
        body: "{}",
      },
      status: 401,
    },
    {
      path: "/portal/rights/command",
      init: {
        method: "OPTIONS",
        headers: { Origin: "https://attacker.invalid", "Access-Control-Request-Method": "POST" },
      },
      status: 404,
    },
  ];
  for (const [index, entry] of cases.entries()) {
    const response = await send(new URL(entry.path, base), {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      ...entry.init,
    });
    if (
      response.status !== entry.status ||
      !response.headers.get("cache-control")?.includes("no-store") ||
      response.headers.has("access-control-allow-origin") ||
      response.headers.has("location")
    )
      throw new Error(`SPRINT09_HOSTED_DENIAL_FAILED:${index + 1}:${response.status}`);
    const cookie = response.headers.get("set-cookie");
    if (cookie && !/Max-Age=0/i.test(cookie))
      throw new Error("SPRINT09_UNEXPECTED_COOKIE_ISSUANCE");
    const body = await response.text();
    if (
      body.length > 4096 ||
      /"(?:profile|instruments|workflows|access_token|refresh_token|givenName|verifiedEmail)"\s*:/i.test(
        body,
      )
    )
      throw new Error("SPRINT09_UNEXPECTED_PRIVATE_PAYLOAD");
  }
  return {
    exercise: "sprint09-hosted-http-denials",
    checks: cases.length,
    authenticated: false,
    emailsSent: false,
    rowContentLogged: false,
    positiveSessionProof: false,
  } as const;
}
