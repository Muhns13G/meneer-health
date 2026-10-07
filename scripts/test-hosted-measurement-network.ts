export {};

const baseUrl = process.env.HOSTED_MEASUREMENT_BASE_URL?.trim();
const canary = "synthetic-prohibited-canary.invalid";

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

invariant(
  process.env.HOSTED_MEASUREMENT_EXERCISE_CONFIRM === "default-off-canaries-only",
  "Hosted measurement proof requires HOSTED_MEASUREMENT_EXERCISE_CONFIRM=default-off-canaries-only.",
);
invariant(baseUrl?.startsWith("https://"), "A hosted HTTPS base URL is required.");

async function post(path: string, body: unknown): Promise<Response> {
  const endpoint = new URL(path, baseUrl);
  return fetch(endpoint, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": "hosted-measurement-canary-0001",
      Origin: endpoint.origin,
      Referer: `https://${canary}/private-referrer`,
      "Sec-Fetch-Site": "same-origin",
    },
    body: JSON.stringify(body),
  });
}

async function assertHidden(response: Response, label: string): Promise<void> {
  const body = await response.text();
  invariant(response.status === 404, `${label} was not hidden while measurement is disabled.`);
  invariant(!response.headers.has("set-cookie"), `${label} created measurement state.`);
  invariant(!response.headers.has("access-control-allow-origin"), `${label} enabled CORS.`);
  invariant(!body.includes(canary), `${label} echoed the prohibited canary.`);
  invariant(!body.includes("synthetic-health-canary"), `${label} echoed a health canary.`);
  invariant(!body.includes("synthetic-replay-canary"), `${label} echoed a replay canary.`);
}

const publicPage = await fetch(new URL("/", baseUrl));
invariant(publicPage.status === 200, "Hosted public page did not return 200.");

await assertHidden(
  await post("/api/measurement/consent", {
    decision: "granted",
    email: `patient@${canary}`,
  }),
  "Disabled consent endpoint",
);
await assertHidden(
  await post("/api/measurement/events", {
    name: "journey_started",
    treatment: "synthetic-health-canary",
    url: `https://${canary}/start?answer=private`,
    sessionReplay: "synthetic-replay-canary",
  }),
  "Disabled event endpoint",
);

console.log(
  JSON.stringify({
    exercise: "hosted-measurement-network",
    publicRead: 200,
    measurementEndpoints: "default-off",
    responsePayloadFields: 0,
    persistentCookies: 0,
    corsAllowed: false,
  }),
);
