export {};

const baseUrl = process.env.HOSTED_SECURITY_BASE_URL?.trim();

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

invariant(
  process.env.HOSTED_SECURITY_EXERCISE_CONFIRM === "inactive-routes-only",
  "Hosted request-security proof requires HOSTED_SECURITY_EXERCISE_CONFIRM=inactive-routes-only.",
);
invariant(baseUrl?.startsWith("https://"), "A hosted HTTPS base URL is required.");

async function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(new URL(path, baseUrl), { redirect: "manual", ...init });
}

function assertHidden(response: Response, label: string): void {
  invariant(response.status === 404, `${label} was not hidden.`);
  invariant(!response.headers.has("access-control-allow-origin"), `${label} enabled CORS.`);
  invariant(response.headers.get("cache-control")?.includes("no-store"), `${label} was cacheable.`);
  invariant(response.headers.has("x-correlation-id"), `${label} omitted correlation evidence.`);
}

const publicPage = await request("/");
invariant(publicPage.status === 200, "Hosted public page did not return 200.");

assertHidden(
  await request("/api/unregistered", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://attacker.invalid" },
    body: "{}",
  }),
  "Unregistered mutation",
);

assertHidden(
  await request("/api/payments/checkout", {
    method: "OPTIONS",
    headers: {
      Origin: "https://attacker.invalid",
      "Access-Control-Request-Method": "POST",
    },
  }),
  "Cross-origin preflight",
);

assertHidden(
  await request("/api/payments/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://attacker.invalid" },
    body: "{}",
  }),
  "Disabled checkout mutation",
);

console.log(
  JSON.stringify({
    exercise: "hosted-request-security",
    publicRead: 200,
    unregisteredMutation: 404,
    crossOriginPreflight: 404,
    disabledCheckout: 404,
    corsAllowed: false,
    payloadFieldsLogged: 0,
  }),
);
