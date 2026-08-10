import { execFileSync } from "node:child_process";
import { createHash, createHmac } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { SupabaseIdentitySessionRepository } from "../src/adapters/identity/supabase/supabase-identity-session-repository";
import { SupabaseIdentityGovernanceRepository } from "../src/adapters/identity/supabase/supabase-identity-governance-repository";
import { createSupabaseManagedIdentityProvider } from "../src/adapters/identity/supabase/supabase-managed-identity-provider";
import { SupabaseAccessRepository } from "../src/adapters/persistence/supabase/supabase-access-repository";

type LocalStatus = Readonly<{
  API_URL: string;
  PUBLISHABLE_KEY: string;
  SECRET_KEY: string;
}>;

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function decodeBase32(value: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of value.toUpperCase().replaceAll("=", "")) {
    const index = alphabet.indexOf(character);
    invariant(index >= 0, "Synthetic TOTP enrollment returned an invalid base32 secret.");
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Uint8Array.from(bytes);
}

function currentTotp(secret: string): string {
  const counter = BigInt(Math.floor(Date.now() / 30_000));
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(counter);
  const digest = createHmac("sha1", decodeBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return (binary % 1_000_000).toString().padStart(6, "0");
}

async function localStatus(): Promise<LocalStatus> {
  const stdout = execFileSync("bunx", ["supabase", "status", "-o", "json"], {
    encoding: "utf8",
  });
  const jsonStart = stdout.indexOf("{");
  invariant(jsonStart >= 0, "Local Supabase status did not return JSON.");
  const status = JSON.parse(stdout.slice(jsonStart)) as Partial<LocalStatus>;
  invariant(
    status.API_URL && status.PUBLISHABLE_KEY && status.SECRET_KEY,
    "Local Auth is not running.",
  );
  return status as LocalStatus;
}

async function run(): Promise<void> {
  const status = await localStatus();
  const options = {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  };
  const serverClient = createClient(status.API_URL, status.SECRET_KEY, options);
  const browserBoundaryClient = createClient(status.API_URL, status.PUBLISHABLE_KEY, options);
  const provider = createSupabaseManagedIdentityProvider({
    url: status.API_URL,
    secretKey: status.SECRET_KEY,
  });
  const email = `synthetic-auth-${crypto.randomUUID()}@example.invalid`;
  const now = new Date();
  let providerSubject: string | undefined;

  try {
    const governanceRepository = new SupabaseIdentityGovernanceRepository(serverClient);
    const invitation = await governanceRepository.createPatientInvitation({
      tenantId: "10000000-0000-4000-8000-000000000001",
      contactDigest: createHash("sha256").update(`synthetic:${email}`).digest("hex"),
      expiresAt: new Date(now.getTime() + 15 * 60 * 1_000),
    });

    const created = await serverClient.auth.admin.createUser({ email, email_confirm: true });
    invariant(!created.error && created.data.user, "Synthetic managed user creation failed.");
    providerSubject = created.data.user.id;
    const boundInvitation = await governanceRepository.bindInvitationProviderSubject(
      invitation.id,
      providerSubject,
      new Date(),
    );

    const generated = await serverClient.auth.admin.generateLink({ type: "magiclink", email });
    invariant(!generated.error, "Synthetic passwordless link generation failed.");
    const verified = await browserBoundaryClient.auth.verifyOtp({
      token_hash: generated.data.properties.hashed_token,
      type: "email",
    });
    invariant(
      !verified.error && verified.data.session,
      "Synthetic passwordless verification failed.",
    );

    const session = {
      accessToken: verified.data.session.access_token,
      refreshToken: verified.data.session.refresh_token,
      expiresAt: new Date((verified.data.session.expires_at ?? 0) * 1_000),
    };
    const identity = await provider.verifyAccessToken(session.accessToken);
    invariant(
      identity.providerSubject === providerSubject,
      "Provider subject verification failed.",
    );
    invariant(identity.assurance === "aal1", "Initial passwordless session must be aal1.");

    const accessRepository = new SupabaseAccessRepository(serverClient);
    const internalSubject = await accessRepository.findSubjectByExternalIdentity(
      "supabase",
      providerSubject,
    );
    invariant(internalSubject?.status === "active", "Stable internal subject mapping failed.");
    await governanceRepository.acceptPatientInvitation(
      boundInvitation.id,
      internalSubject.id,
      new Date(),
    );

    const recoveryCase = await governanceRepository.createRecoveryCase({
      subjectId: internalSubject.id,
      recoveryClass: "patient",
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1_000),
    });

    const sessionRepository = new SupabaseIdentitySessionRepository(serverClient);
    const patientSession = await sessionRepository.start({
      subjectId: internalSubject.id,
      providerIdentity: identity,
      sessionClass: "patient",
      observedAt: new Date(),
    });

    const enrollment = await provider.enrollWorkforceTotp(session, "Synthetic workforce factor");
    const challengeId = await provider.challengeWorkforceTotp(session, enrollment.factorId);
    const elevatedSession = await provider.verifyWorkforceTotp(
      session,
      enrollment.factorId,
      challengeId,
      currentTotp(enrollment.secret),
    );
    const elevatedIdentity = await provider.verifyAccessToken(elevatedSession.accessToken);
    invariant(elevatedIdentity.assurance === "aal2", "TOTP verification did not produce aal2.");

    const workforceSession = await sessionRepository.start({
      subjectId: internalSubject.id,
      providerIdentity: elevatedIdentity,
      sessionClass: "workforce",
      observedAt: new Date(),
    });
    invariant(
      workforceSession.id === patientSession.id,
      "MFA elevation replaced rather than tightened the provider session.",
    );
    invariant(
      workforceSession.issuedAt.getTime() === patientSession.issuedAt.getTime(),
      "MFA elevation reset the absolute session origin.",
    );

    const serviceIdentity = await governanceRepository.createServiceIdentity({
      tenantId: "10000000-0000-4000-8000-000000000001",
      name: `synthetic-auth-proof-${crypto.randomUUID()}`,
      environment: "local",
      purpose: "prove scoped identity lifecycle",
      expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
    });
    await governanceRepository.addServiceIdentityScope({
      serviceIdentityId: serviceIdentity.id,
      resource: "synthetic-auth-proof",
      action: "append",
    });
    const serviceCredential = await governanceRepository.addServiceIdentityCredential({
      serviceIdentityId: serviceIdentity.id,
      secretDigest: createHash("sha256").update(crypto.randomUUID()).digest(),
      validFrom: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1_000),
    });
    await governanceRepository.revokeServiceIdentityCredential(serviceCredential.id, new Date());

    await provider.revokeSessions(elevatedSession.accessToken, "global");
    await sessionRepository.revoke(
      workforceSession.id,
      new Date(),
      "synthetic integration verification complete",
    );
    await governanceRepository.completeRecovery(recoveryCase.id, new Date());
    invariant(
      (await sessionRepository.findActive(identity.providerSessionId, new Date())) === null,
      "Revoked application session remained active.",
    );
  } finally {
    if (providerSubject) await serverClient.auth.admin.deleteUser(providerSubject);
  }
}

await run();
console.log("Synthetic Supabase Auth integration passed.");
