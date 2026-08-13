import {
  openTreatmentIntent,
  readTreatmentIntentEncryptionKey,
  treatmentIntentCookieName,
  treatmentIntentTtlSeconds,
  treatmentIntentWireIds,
} from "../src/domain/journey/treatment-intent";

const baseUrl = process.env.HOSTED_TREATMENT_INTENT_BASE_URL?.trim();
const encodedKey = process.env.JOURNEY_INTENT_ENCRYPTION_KEY_BASE64?.trim();

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

invariant(
  process.env.HOSTED_TREATMENT_INTENT_EXERCISE_CONFIRM === "synthetic-opaque-only",
  "Hosted intent proof requires HOSTED_TREATMENT_INTENT_EXERCISE_CONFIRM=synthetic-opaque-only.",
);
invariant(baseUrl?.startsWith("https://"), "A hosted HTTPS base URL is required.");
invariant(encodedKey, "The server-only journey-intent encryption key is required.");

const key = readTreatmentIntentEncryptionKey(encodedKey);
const endpoint = new URL("/api/journey/intent", baseUrl);
const selectedWireId = treatmentIntentWireIds.hair;

async function submit(selection: string): Promise<Response> {
  return fetch(endpoint, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: endpoint.origin,
      "Sec-Fetch-Site": "same-origin",
    },
    body: new URLSearchParams({ selection }),
  });
}

function assertSafeRedirect(response: Response, label: string): void {
  invariant(response.status === 303, `${label} did not return a safe 303 redirect.`);
  invariant(
    response.headers.get("location") === new URL("/start", endpoint).toString(),
    `${label} did not redirect to the canonical start route.`,
  );
}

const accepted = await submit(selectedWireId);
assertSafeRedirect(accepted, "Valid opaque selection");
const acceptedBody = await accepted.text();
invariant(acceptedBody === "", "The valid response unexpectedly contained a body.");

const setCookie = accepted.headers.get("set-cookie");
invariant(setCookie, "The hosted Worker did not issue the treatment-intent cookie.");
invariant(
  setCookie.includes("Path=/") &&
    setCookie.includes(`Max-Age=${treatmentIntentTtlSeconds}`) &&
    setCookie.includes("HttpOnly") &&
    setCookie.includes("Secure") &&
    setCookie.includes("SameSite=Strict"),
  "The hosted treatment-intent cookie is missing required security attributes.",
);
invariant(!setCookie.includes(selectedWireId), "The opaque selection leaked into the cookie.");
invariant(
  !accepted.headers.get("location")?.includes(selectedWireId),
  "Intent leaked into URL state.",
);

const cookieValue = setCookie.split(";", 1)[0]?.slice(`${treatmentIntentCookieName}=`.length);
invariant(cookieValue, "The hosted treatment-intent cookie was malformed.");
invariant(
  setCookie.startsWith(`${treatmentIntentCookieName}=`),
  "The hosted Worker issued an unexpected cookie name.",
);
invariant(
  (await openTreatmentIntent(cookieValue, key)) === "hair",
  "The hosted cookie could not be opened with the approved server key.",
);
invariant(
  (await openTreatmentIntent(`${cookieValue}tampered`, key)) === undefined,
  "Tampered hosted state was accepted.",
);
invariant(
  (await openTreatmentIntent(
    cookieValue,
    key,
    Date.now() + treatmentIntentTtlSeconds * 1_000 + 1_000,
  )) === undefined,
  "Expired hosted state was accepted.",
);

const rejected = await submit("hair");
assertSafeRedirect(rejected, "Human-readable selection");
invariant(!rejected.headers.has("set-cookie"), "An invalid selection created persistent state.");
invariant((await rejected.text()) === "", "The invalid response unexpectedly contained a body.");

console.log(
  JSON.stringify({
    exercise: "hosted-treatment-intent",
    validOpaqueSelection: true,
    secureCookieAttributes: true,
    invalidSelectionFailedClosed: true,
    tamperRejected: true,
    expiryRejected: true,
    urlIntentFields: 0,
    responsePayloadFields: 0,
  }),
);
