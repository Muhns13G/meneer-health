import { createClient } from "@supabase/supabase-js";

import { completeSyntheticAnswers } from "../contracts/fixtures/medical-intake-synthetic";

// Email delivery is proven separately by the interactive driver. The generated code below is
// a disposable session prerequisite, never evidence of email delivery or a real-client login.
const origin = "https://meneerhealth.co.za";
const email = "support@meneerhealth.co.za";
const providerSubject = process.env.SPRINT13_PROVIDER_SUBJECT_ID;
const intakeId = "e1330000-0000-4000-8000-000000000003";
const publicationId = "e1330000-0000-4000-8000-000000000008";
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
invariant(
  process.env.SPRINT13_HOSTED_INTAKE_CONFIRM === "existing-isolated-client-only" &&
    process.env.SUPABASE_URL === "https://gibfpolrdjotwvewgfsz.supabase.co" &&
    process.env.SUPABASE_SECRET_KEY &&
    typeof providerSubject === "string" &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(providerSubject),
  "SPRINT13_INTAKE_GUARD_REJECTED",
);
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});
let cookie: string | undefined;
async function request(body: Record<string, unknown>, authenticated = true) {
  const response = await fetch(origin + "/portal/intake/command", {
    method: "POST",
    redirect: "manual",
    headers: {
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
      "Content-Type": "application/json",
      "Idempotency-Key": String(body.requestKey ?? crypto.randomUUID()),
      ...(authenticated && cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  invariant(response.headers.get("cache-control")?.includes("no-store"), "NO_STORE_MISSING");
  invariant(!response.headers.has("access-control-allow-origin"), "UNEXPECTED_CORS");
  return response;
}
try {
  // Refuse disabled, unconfigured or foreign targets before creating a new session.
  invariant(
    (await request({ action: "read", intakeId: null }, false)).status === 401,
    "ISOLATED_INTAKE_CONFIGURATION_NOT_READY",
  );
  const users = await admin.auth.admin.listUsers({ page: 1, perPage: 2 });
  invariant(
    !users.error &&
      users.data.users.length === 1 &&
      users.data.users[0]?.id === providerSubject &&
      users.data.users[0]?.email === email,
    "ISOLATED_AUTH_SCOPE_CHANGED",
  );
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  invariant(!link.error && link.data.user.id === providerSubject, "SESSION_PREREQUISITE_FAILED");
  const login = await fetch(origin + "/account/sign-in", {
    method: "POST",
    redirect: "manual",
    headers: {
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ action: "verify", email, code: link.data.properties.email_otp }),
    signal: AbortSignal.timeout(30000),
  });
  invariant(login.status === 204, "SESSION_PREREQUISITE_REJECTED");
  const header = login.headers.get("set-cookie");
  invariant(header, "SESSION_COOKIE_MISSING");
  invariant(
    header?.includes("HttpOnly") && header.includes("Secure") && header.includes("SameSite=Strict"),
    "SESSION_COOKIE_INSECURE",
  );
  cookie = header.split(";", 1)[0];
  const initial = await request({ action: "read", intakeId: null });
  invariant(initial.status === 200, "INTAKE_READ_REJECTED");
  const view = (await initial.json()) as {
    record: { state: string; version: number } | null;
    publication: { id: string; privacy: string; reviewDeclaration: string };
  };
  invariant(
    view.publication.id === publicationId &&
      view.publication.privacy.includes("SYNTHETIC TEST ONLY") &&
      view.publication.reviewDeclaration.includes("SYNTHETIC TEST ONLY"),
    "UNEXPECTED_INTAKE_PUBLICATION",
  );
  const saveCommand = {
    action: "save",
    intakeId,
    publicationId,
    privacyAcknowledged: true,
    expectedVersion: 0,
    requestKey: crypto.randomUUID(),
    answers: completeSyntheticAnswers,
  };
  if (process.env.SPRINT13_INTAKE_STAGE === "probe-conflict") {
    invariant(
      view.record?.state === "draft" && view.record.version === 1,
      "CONFLICT_PROBE_SCOPE_CHANGED",
    );
    const conflict = await request(saveCommand);
    console.log(
      JSON.stringify({
        exercise: "sprint13-intake-conflict-probe",
        observedStatus: conflict.status,
        expectedStatus: 409,
        payloadLogged: false,
      }),
    );
    invariant(conflict.status === 409, `INTAKE_CONFLICT_STATUS_${conflict.status}`);
  } else {
    invariant(view.record === null, "INTAKE_BASELINE_NOT_EMPTY");
    const saved = await request(saveCommand);
    invariant(saved.status === 200, "INTAKE_SAVE_REJECTED");
    const result = (await saved.json()) as { version: number };
    invariant(result.version === 1, "INTAKE_DRAFT_VERSION_INVALID");
    invariant((await request(saveCommand)).status === 200, "INTAKE_REPLAY_REJECTED");
    invariant(
      (await request({ ...saveCommand, requestKey: crypto.randomUUID() })).status === 409,
      "STALE_INTAKE_VERSION_ACCEPTED",
    );
    const draft = await request({ action: "read", intakeId });
    invariant(draft.status === 200, "INTAKE_DRAFT_READ_REJECTED");
    const draftView = (await draft.json()) as { record: { state: string; version: number } };
    invariant(
      draftView.record.state === "draft" && draftView.record.version === 1,
      "INTAKE_DRAFT_PROJECTION_INVALID",
    );
    const submitted = await request({
      ...saveCommand,
      action: "submit",
      expectedVersion: 1,
      requestKey: crypto.randomUUID(),
    });
    invariant(submitted.status === 200, "INTAKE_SUBMISSION_REJECTED");
    const final = await request({ action: "read", intakeId });
    invariant(final.status === 200, "INTAKE_SUBMITTED_READ_REJECTED");
    const finalView = (await final.json()) as { record: { state: string; version: number } };
    invariant(
      finalView.record.state === "submitted" && finalView.record.version === 2,
      "INTAKE_SUBMITTED_PROJECTION_INVALID",
    );
    invariant(
      (await request({ action: "read", intakeId: crypto.randomUUID() })).status === 401,
      "FOREIGN_INTAKE_ACCESS_GRANTED",
    );
    console.log(
      JSON.stringify({
        exercise: "sprint13-hosted-intake",
        draft: true,
        idempotentReplay: true,
        staleVersionDenied: true,
        submitted: true,
        ownClientProjection: true,
        foreignIntakeDenied: true,
        bloodsProvided: false,
        generatedCodeIsDeliveryEvidence: false,
        answersLogged: false,
        tokensLogged: false,
      }),
    );
  }
} finally {
  if (cookie) {
    const response = await fetch(origin + "/account/sign-out", {
      method: "POST",
      redirect: "manual",
      headers: {
        Origin: origin,
        "Sec-Fetch-Site": "same-origin",
        Cookie: cookie,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ action: "sign-out" }),
      signal: AbortSignal.timeout(30000),
    });
    invariant(response.status === 204, "INTAKE_SESSION_CLEANUP_FAILED");
  }
}
