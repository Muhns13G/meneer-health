import { createInterface } from "node:readline";
import { execFileSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

// Interactive, owner-approved exercise only. SQL fixtures/cleanup are separately governed.
// OTP input, provider tokens and browser cookies remain in memory and are never logged.
const origin = "https://meneerhealth.co.za";
const email = "support@meneerhealth.co.za";
// Task 13.3 reuses only this client-side Auth driver, not Sprint 9 SQL/configuration.
const sprint13 =
  process.env.SPRINT13_HOSTED_ONBOARDING_CONFIRM === "isolated-support-onboarding-only";
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
invariant(
  (process.env.SPRINT09_HOSTED_AUTH_CONFIRM === "disposable-support-mailbox-only" || sprint13) &&
    process.env.SUPABASE_URL === "https://gibfpolrdjotwvewgfsz.supabase.co" &&
    process.env.SUPABASE_SECRET_KEY,
  "HOSTED_AUTH_GUARD_REJECTED",
);
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});
const cookies = new Map<string, string>();
const accessTokens = new Set<string>();
const proofs = new Map<string, Record<string, unknown>>();
let documents: Array<{
  publicationId: string;
  instrumentId: string;
  contentHash: string;
  body: string;
}> = [];
let userId: string | undefined;

async function request(path: string, fields?: Record<string, string>, cookie?: string) {
  const result = await fetch(origin + path, {
    method: fields ? "POST" : "GET",
    redirect: "manual",
    headers: {
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
      ...(fields ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: fields ? new URLSearchParams(fields) : undefined,
  });
  invariant(result.headers.get("cache-control")?.includes("no-store"), "NO_STORE_MISSING");
  invariant(!result.headers.has("access-control-allow-origin"), "UNEXPECTED_CORS");
  invariant(!result.headers.has("location"), "UNEXPECTED_REDIRECT");
  return result;
}

async function rememberCookie(response: Response, name: string, keyName: string, aad?: string) {
  const header = response.headers.get("set-cookie");
  invariant(header, "COOKIE_MISSING");
  invariant(
    header.includes("HttpOnly") && header.includes("Secure") && header.includes("SameSite=Strict"),
    "COOKIE_SECURITY_MISSING",
  );
  const token = header.match(new RegExp(`${name}=([^;]+)`))?.[1];
  invariant(token, "COOKIE_MISSING");
  const [version, iv, body] = token.split(".");
  invariant(version === "v1" && iv && body, "COOKIE_FORMAT_INVALID");
  const encodedKey = process.env[keyName];
  invariant(encodedKey, "KEY_MISSING");
  const key = await crypto.subtle.importKey(
    "raw",
    Buffer.from(encodedKey, "base64"),
    "AES-GCM",
    false,
    ["decrypt"],
  );
  const clear = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: Buffer.from(iv, "base64url"),
      ...(aad ? { additionalData: new TextEncoder().encode(aad) } : {}),
    },
    key,
    Buffer.from(body, "base64url"),
  );
  const proof = JSON.parse(new TextDecoder().decode(clear)) as Record<string, unknown>;
  invariant(typeof proof.accessToken === "string", "COOKIE_PROOF_INVALID");
  accessTokens.add(proof.accessToken);
  proofs.set(name, proof);
  cookies.set(name, `${name}=${token}`);
}

const preactivation = "__Host-meneer-preactivation";
const session = "__Host-meneer-session";
// Prevent a pseudo-terminal from echoing submitted OTP lines into the terminal transcript.
const terminalState = process.stdin.isTTY
  ? execFileSync("stty", ["-g"], { encoding: "utf8", stdio: ["inherit", "pipe", "pipe"] }).trim()
  : undefined;
if (terminalState) execFileSync("stty", ["-echo"], { stdio: ["inherit", "ignore", "pipe"] });
const lines = createInterface({ input: process.stdin, terminal: false });
console.log(
  JSON.stringify({
    ready: true,
    exercise: sprint13 ? "sprint13-hosted-onboarding" : "sprint09-hosted-auth",
    tokensLogged: false,
  }),
);
try {
  for await (const line of lines) {
    const input = JSON.parse(line) as { action: string; code?: string };
    if (input.action === "invite") {
      invariant(!userId, "INVITATION_ALREADY_SENT");
      const existing = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      invariant(!existing.error, "AUTH_BASELINE_READ_FAILED");
      invariant(existing.data.users.length === 0, "AUTH_BASELINE_CHANGED");
      const result = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: origin + "/account/verify",
      });
      invariant(!result.error && result.data.user, "INVITATION_PROVIDER_FAILED");
      userId = result.data.user.id;
      console.log(
        JSON.stringify({ action: input.action, providerSubject: userId, emailRequested: true }),
      );
      continue;
    }
    if (input.action === "done") break;
    let response: Response;
    if (input.action === "prepare") {
      response = await request(
        "/account/activate/instruments",
        undefined,
        cookies.get(preactivation),
      );
      invariant(response.status === 200, `PREPARE_STATUS_${response.status}`);
      const view = (await response.json()) as {
        verifiedEmail: string;
        documents: typeof documents;
      };
      invariant(
        view.verifiedEmail === email && view.documents.length === 2,
        "DOCUMENT_VIEW_INVALID",
      );
      invariant(
        view.documents.every((document) => document.body.includes("SYNTHETIC TEST ONLY")),
        "REAL_PUBLICATION_REJECTED",
      );
      documents = view.documents;
    } else if (input.action === "activate") {
      const terms = documents.find((document) => document.instrumentId === "pilot-account-terms");
      const privacy = documents.find(
        (document) => document.instrumentId === "pilot-privacy-notice",
      );
      invariant(terms && privacy, "DOCUMENTS_MISSING");
      const requestKey = crypto.randomUUID();
      response = await fetch(origin + "/account/activate", {
        method: "POST",
        redirect: "manual",
        headers: {
          Origin: origin,
          "Sec-Fetch-Site": "same-origin",
          "Content-Type": "application/json",
          "Idempotency-Key": requestKey,
          Cookie: cookies.get(preactivation)!,
        },
        body: JSON.stringify({
          givenName: "Synthetic",
          familyName: "Exercise",
          mobileE164: "+27820000000",
          contactPreference: "email",
          termsPublicationId: terms.publicationId,
          termsHash: terms.contentHash,
          privacyPublicationId: privacy.publicationId,
          privacyHash: privacy.contentHash,
          termsAccepted: true,
          privacyAcknowledged: true,
          requestKey,
        }),
      });
      invariant(
        response.status === 204 && response.headers.get("cache-control")?.includes("no-store"),
        `ACTIVATE_STATUS_${response.status}`,
      );
    } else if (input.action === "provider-revoke") {
      const proof = proofs.get(session);
      invariant(typeof proof?.accessToken === "string", "SESSION_MISSING");
      const result = await admin.auth.admin.signOut(proof.accessToken, "global");
      invariant(!result.error, "PROVIDER_REVOCATION_FAILED");
      response = await request("/portal/account", undefined, cookies.get(session));
      invariant(response.status === 401, `REVOCATION_STATUS_${response.status}`);
    } else if (input.action === "expired-cookie") {
      const proof = proofs.get(session);
      invariant(proof, "SESSION_MISSING");
      const key = await crypto.subtle.importKey(
        "raw",
        Buffer.from(process.env.IDENTITY_SESSION_KEY_BASE64!, "base64"),
        "AES-GCM",
        false,
        ["encrypt"],
      );
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv,
          additionalData: new TextEncoder().encode("meneer-patient-session-v1"),
        },
        key,
        new TextEncoder().encode(
          JSON.stringify({ ...proof, absoluteExpiresAt: Date.now() - 1000 }),
        ),
      );
      const cookie = `${session}=v1.${Buffer.from(iv).toString("base64url")}.${Buffer.from(encrypted).toString("base64url")}`;
      response = await request("/portal/account", undefined, cookie);
      invariant(response.status === 401, `EXPIRY_STATUS_${response.status}`);
    } else if (input.action === "verify-invite") {
      invariant(/^\d{6}$/.test(input.code ?? ""), "OTP_FORMAT_INVALID");
      response = await request("/account/verify", { email, code: input.code! });
      invariant(response.status === 204, `INVITE_STATUS_${response.status}`);
      await rememberCookie(response, preactivation, "IDENTITY_PREACTIVATION_KEY_BASE64");
    } else if (input.action === "replay-invite") {
      response = await request("/account/verify", { email, code: input.code ?? "000000" });
      invariant(
        response.status === 422 && !response.headers.has("set-cookie"),
        "INVITE_REPLAY_ACCEPTED",
      );
    } else if (input.action === "request-sign-in" || input.action === "request-recovery") {
      response = await request(
        input.action === "request-sign-in" ? "/account/sign-in" : "/account/recover",
        { action: "request", email },
      );
      invariant(response.status === 202, `REQUEST_STATUS_${response.status}`);
    } else if (input.action === "verify-sign-in") {
      invariant(/^\d{6}$/.test(input.code ?? ""), "OTP_FORMAT_INVALID");
      response = await request("/account/sign-in", { action: "verify", email, code: input.code! });
      invariant(response.status === 204, `SIGN_IN_STATUS_${response.status}`);
      await rememberCookie(
        response,
        session,
        "IDENTITY_SESSION_KEY_BASE64",
        "meneer-patient-session-v1",
      );
    } else if (input.action === "replay-sign-in" || input.action === "wrong-contact") {
      response = await request("/account/sign-in", {
        action: "verify",
        email: input.action === "wrong-contact" ? "synthetic-wrong-contact@example.invalid" : email,
        code: input.code ?? "000000",
      });
      invariant(
        response.status === 422 && !response.headers.has("set-cookie"),
        "INVALID_CODE_ACCEPTED",
      );
    } else if (input.action === "renew") {
      response = await request("/account/session/renew", { action: "renew" }, cookies.get(session));
      invariant(response.status === 204, `RENEW_STATUS_${response.status}`);
      await rememberCookie(
        response,
        session,
        "IDENTITY_SESSION_KEY_BASE64",
        "meneer-patient-session-v1",
      );
    } else if (input.action === "portal") {
      response = await request("/portal/account", undefined, cookies.get(session));
      invariant(response.status === 200, `PORTAL_STATUS_${response.status}`);
      const body = (await response.json()) as {
        account?: { profile?: { verifiedEmail?: string } };
      };
      invariant(body.account?.profile?.verifiedEmail === email, "PORTAL_CONTACT_MISMATCH");
    } else if (input.action === "tamper" || input.action === "denied-portal") {
      let cookie = cookies.get(session);
      if (input.action === "tamper") {
        invariant(cookie, "SESSION_MISSING");
        const equals = cookie.indexOf("=");
        const token = cookie.slice(equals + 1);
        const index = token.lastIndexOf(".") + 2;
        cookie =
          cookie.slice(0, equals + 1) +
          token.slice(0, index) +
          (token[index] === "A" ? "B" : "A") +
          token.slice(index + 1);
      }
      response = await request("/portal/account", undefined, cookie);
      invariant(response.status === 401, `DENIAL_STATUS_${response.status}`);
    } else if (input.action === "sign-out") {
      response = await request("/account/sign-out", { action: "sign-out" }, cookies.get(session));
      invariant(response.status === 204, `SIGN_OUT_STATUS_${response.status}`);
      invariant(response.headers.get("set-cookie")?.includes("Max-Age=0"), "COOKIE_NOT_CLEARED");
    } else if (input.action === "verify-recovery") {
      invariant(/^\d{6}$/.test(input.code ?? ""), "OTP_FORMAT_INVALID");
      response = await request("/account/recover", { action: "verify", email, code: input.code! });
      invariant(response.status === 204, `RECOVERY_STATUS_${response.status}`);
    } else {
      throw new Error("UNKNOWN_EXERCISE_ACTION");
    }
    console.log(JSON.stringify({ action: input.action, passed: true, status: response.status }));
  }
} catch (error) {
  console.log(
    JSON.stringify({
      failed: true,
      reason: error instanceof Error ? error.message : "EXERCISE_FAILED",
    }),
  );
  process.exitCode = 1;
} finally {
  lines.close();
  if (terminalState)
    execFileSync("stty", [terminalState], { stdio: ["inherit", "ignore", "pipe"] });
  for (const token of accessTokens) await admin.auth.admin.signOut(token, "global");
  if (userId) {
    const result = await admin.auth.admin.deleteUser(userId);
    console.log(JSON.stringify({ providerCleanup: !result.error }));
    if (result.error) process.exitCode = 1;
  }
}
