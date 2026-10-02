import { createClient } from "@supabase/supabase-js";

import { createSupabaseManagedIdentityProvider } from "../src/adapters/identity/supabase/supabase-managed-identity-provider";
import { SupabaseAccessRepository } from "../src/adapters/persistence/supabase/supabase-access-repository";
import { readSupabaseIntegrationEnvironment } from "./lib/supabase-integration-environment";

type MailpitMessage = { ID: string; To: unknown; Subject: string };

function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

async function readCode(email: string, subject: string): Promise<string> {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const listing = await fetch("http://127.0.0.1:54324/api/v1/messages", { cache: "no-store" });
    invariant(listing.ok, "Local Mailpit is unavailable.");
    const body = (await listing.json()) as { messages?: MailpitMessage[] };
    const message = body.messages?.find(
      (candidate) => candidate.Subject === subject && JSON.stringify(candidate.To).includes(email),
    );
    if (message) {
      const detail = await fetch(
        `http://127.0.0.1:54324/api/v1/message/${encodeURIComponent(message.ID)}`,
      );
      invariant(detail.ok, "Local Mailpit message could not be read.");
      const delivered = (await detail.json()) as { HTML?: string; Text?: string };
      const html = delivered.HTML ?? "";
      invariant(
        !/href\s*=|ConfirmationURL|TokenHash|tracking/i.test(html),
        "The local Auth email contains a token-bearing link or tracking marker.",
      );
      const code =
        html.match(/<strong>(\d{6})<\/strong>/)?.[1] ?? delivered.Text?.match(/\b\d{6}\b/)?.[0];
      invariant(code, "The local Auth email has no six-digit code.");
      return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("The local Auth message was not delivered to Mailpit.");
}

async function run() {
  const status = readSupabaseIntegrationEnvironment();
  invariant(status.target === "local", "This exercise is local-only; hosted use is prohibited.");
  const admin = createClient(status.API_URL, status.SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const publicClient = createClient(status.API_URL, status.PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const provider = createSupabaseManagedIdentityProvider({
    url: status.API_URL,
    secretKey: status.SECRET_KEY,
  });
  const subjects: string[] = [];
  try {
    const signInEmail = `synthetic-session-${crypto.randomUUID()}@example.invalid`;
    const signInUser = await admin.auth.admin.createUser({
      email: signInEmail,
      email_confirm: true,
    });
    invariant(!signInUser.error && signInUser.data.user, "Synthetic sign-in user creation failed.");
    subjects.push(signInUser.data.user.id);
    await provider.requestPatientSignIn(signInEmail, "http://127.0.0.1:8080/account/sign-in");
    const signInCode = await readCode(signInEmail, "Your Meneer sign-in code");
    const signedIn = await provider.verifyEmailOtp(signInEmail, signInCode);
    invariant(
      (await provider.verifyAccessToken(signedIn.accessToken)).providerSubject ===
        signInUser.data.user.id,
      "Synthetic sign-in code did not bind to the expected provider subject.",
    );
    const mapped = await new SupabaseAccessRepository(admin).findSubjectByExternalIdentity(
      "supabase",
      signInUser.data.user.id,
    );
    invariant(mapped, "Synthetic sign-in user has no internal mapping.");
    invariant(
      !(await new SupabaseAccessRepository(admin).hasPilotAccountEvidence(
        "10000000-0000-4000-8000-000000000001",
        mapped.id,
      )),
      "An unactivated synthetic identity unexpectedly has account evidence.",
    );
    const renewed = await provider.refreshSession(signedIn.refreshToken);
    invariant(
      (await provider.verifyAccessToken(renewed.accessToken)).providerSubject ===
        signInUser.data.user.id,
      "Synthetic refresh did not retain the expected provider subject.",
    );
    await provider.revokeSessions(renewed.accessToken, "local");

    const recoveryEmail = `synthetic-recovery-${crypto.randomUUID()}@example.invalid`;
    const recoveryUser = await admin.auth.admin.createUser({
      email: recoveryEmail,
      email_confirm: true,
    });
    invariant(
      !recoveryUser.error && recoveryUser.data.user,
      "Synthetic recovery user creation failed.",
    );
    subjects.push(recoveryUser.data.user.id);
    await provider.requestRecovery(recoveryEmail, "http://127.0.0.1:8080/account/recover");
    const recoveryCode = await readCode(recoveryEmail, "Your Meneer recovery code");
    const recovered = await provider.verifyRecoveryOtp(recoveryEmail, recoveryCode);
    invariant(
      (await provider.verifyAccessToken(recovered.accessToken)).providerSubject ===
        recoveryUser.data.user.id,
      "Synthetic recovery code did not bind to the expected provider subject.",
    );
    await provider.revokeSessions(recovered.accessToken, "global");

    const publicAttempt = await publicClient.auth.signUp({
      email: `synthetic-denied-${crypto.randomUUID()}@example.invalid`,
      password: crypto.randomUUID(),
    });
    invariant(
      publicAttempt.error && !publicAttempt.data.user,
      "Global sign-up unexpectedly allowed a public account.",
    );
  } finally {
    for (const subject of subjects) {
      const deleted = await admin.auth.admin.deleteUser(subject);
      invariant(!deleted.error, "Synthetic Auth user cleanup failed.");
    }
  }
}

await run();
console.log("Synthetic local sign-in and recovery code-only emails passed; users removed.");
