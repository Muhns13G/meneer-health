import "@tanstack/react-start/server-only";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

import {
  IdentityRejectedError,
  IdentityUnavailableError,
  type ManagedIdentityProvider,
  type SessionRevocationScope,
  type TotpEnrollment,
} from "@/application/identity/managed-identity-provider";
import type { ManagedSession, ProviderIdentity } from "@/domain/access/identity";

type SessionClientFactory = (session: ManagedSession) => Promise<SupabaseClient>;

function mapSession(session: Session | null): ManagedSession {
  if (!session?.access_token || !session.refresh_token || !session.expires_at) {
    throw new IdentityRejectedError();
  }

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: new Date(session.expires_at * 1_000),
  };
}

function rejected(): never {
  throw new IdentityRejectedError();
}

export class SupabaseManagedIdentityProvider implements ManagedIdentityProvider {
  constructor(
    private readonly client: SupabaseClient,
    private readonly createSessionClient: SessionClientFactory,
  ) {}

  async verifyAccessToken(accessToken: string): Promise<ProviderIdentity> {
    try {
      const [claimsResult, userResult] = await Promise.all([
        this.client.auth.getClaims(accessToken),
        this.client.auth.getUser(accessToken),
      ]);

      if (claimsResult.error || userResult.error) rejected();

      const claims = claimsResult.data?.claims;
      const user = userResult.data.user;
      const assurance = claims?.aal;
      const authenticatedAt = claims?.iat;
      const expiresAt = claims?.exp;
      const sessionId = claims?.session_id;

      if (
        !claims ||
        !user ||
        user.is_anonymous ||
        claims.sub !== user.id ||
        (assurance !== "aal1" && assurance !== "aal2") ||
        typeof authenticatedAt !== "number" ||
        typeof expiresAt !== "number" ||
        typeof sessionId !== "string" ||
        !user.email ||
        !user.email_confirmed_at
      ) {
        rejected();
      }

      const trustedAssurance = assurance === "aal2" ? "aal2" : "aal1";

      return {
        provider: "supabase",
        providerSubject: user.id,
        providerSessionId: sessionId,
        assurance: trustedAssurance,
        authenticatedAt: new Date(authenticatedAt * 1_000),
        expiresAt: new Date(expiresAt * 1_000),
        verifiedContact: {
          kind: "email",
          value: user.email,
          verifiedAt: new Date(user.email_confirmed_at),
        },
      };
    } catch (error) {
      if (error instanceof IdentityRejectedError) throw error;
      throw new IdentityUnavailableError();
    }
  }

  async invitePatient(email: string, redirectTo: string): Promise<string> {
    try {
      const { data, error } = await this.client.auth.admin.inviteUserByEmail(email, { redirectTo });
      if (error || !data.user) rejected();
      return data.user.id;
    } catch (error) {
      if (error instanceof IdentityRejectedError) throw error;
      throw new IdentityUnavailableError();
    }
  }

  async requestPatientSignIn(email: string, redirectTo: string): Promise<void> {
    await this.requestOtp(email, redirectTo);
  }

  async requestRecovery(email: string, redirectTo: string): Promise<void> {
    await this.requestOtp(email, redirectTo);
  }

  async verifyEmailOtp(email: string, token: string): Promise<ManagedSession> {
    try {
      const { data, error } = await this.client.auth.verifyOtp({ email, token, type: "email" });
      if (error) rejected();
      return mapSession(data.session);
    } catch (error) {
      if (error instanceof IdentityRejectedError) throw error;
      throw new IdentityUnavailableError();
    }
  }

  async revokeSessions(accessToken: string, scope: SessionRevocationScope): Promise<void> {
    try {
      const { error } = await this.client.auth.admin.signOut(accessToken, scope);
      if (error) rejected();
    } catch (error) {
      if (error instanceof IdentityRejectedError) throw error;
      throw new IdentityUnavailableError();
    }
  }

  async enrollWorkforceTotp(
    session: ManagedSession,
    friendlyName: string,
  ): Promise<TotpEnrollment> {
    try {
      const client = await this.createSessionClient(session);
      const { data, error } = await client.auth.mfa.enroll({ factorType: "totp", friendlyName });
      if (error || data.type !== "totp") rejected();
      return {
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      };
    } catch (error) {
      if (error instanceof IdentityRejectedError) throw error;
      throw new IdentityUnavailableError();
    }
  }

  async challengeWorkforceTotp(session: ManagedSession, factorId: string): Promise<string> {
    try {
      const client = await this.createSessionClient(session);
      const { data, error } = await client.auth.mfa.challenge({ factorId });
      if (error || !data.id) rejected();
      return data.id;
    } catch (error) {
      if (error instanceof IdentityRejectedError) throw error;
      throw new IdentityUnavailableError();
    }
  }

  async verifyWorkforceTotp(
    session: ManagedSession,
    factorId: string,
    challengeId: string,
    code: string,
  ): Promise<ManagedSession> {
    try {
      const client = await this.createSessionClient(session);
      const { data, error } = await client.auth.mfa.verify({ factorId, challengeId, code });
      if (error) rejected();
      return mapSession({
        ...data,
        user: data.user,
        expires_at: Date.now() / 1_000 + data.expires_in,
      });
    } catch (error) {
      if (error instanceof IdentityRejectedError) throw error;
      throw new IdentityUnavailableError();
    }
  }

  private async requestOtp(email: string, redirectTo: string): Promise<void> {
    try {
      const { error } = await this.client.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
      });
      if (error) rejected();
    } catch (error) {
      if (error instanceof IdentityRejectedError) throw error;
      throw new IdentityUnavailableError();
    }
  }
}

export type SupabaseIdentityConfiguration = Readonly<{
  url: string;
  secretKey: string;
}>;

export function createSupabaseManagedIdentityProvider(
  configuration: SupabaseIdentityConfiguration,
): ManagedIdentityProvider {
  const options = {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  };
  const client = createClient(configuration.url, configuration.secretKey, options);

  return new SupabaseManagedIdentityProvider(client, async (session) => {
    const sessionClient = createClient(configuration.url, configuration.secretKey, options);
    const { error } = await sessionClient.auth.setSession({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    });
    if (error) throw new IdentityRejectedError();
    return sessionClient;
  });
}
