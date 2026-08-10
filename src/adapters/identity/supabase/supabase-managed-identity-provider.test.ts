import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";
import type { ManagedSession } from "@/domain/access/identity";
import { SupabaseManagedIdentityProvider } from "./supabase-managed-identity-provider";

const syntheticSession: ManagedSession = {
  accessToken: "synthetic-access-token",
  refreshToken: "synthetic-refresh-token",
  expiresAt: new Date("2030-01-01T01:00:00.000Z"),
};

function rootClient(overrides: Record<string, unknown> = {}): SupabaseClient {
  return {
    auth: {
      getClaims: vi.fn().mockResolvedValue({
        data: {
          claims: {
            sub: "20000000-0000-4000-8000-000000000001",
            session_id: "50000000-0000-4000-8000-000000000001",
            aal: "aal1",
            iat: 1_893_456_000,
            exp: 1_893_459_600,
          },
        },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: "20000000-0000-4000-8000-000000000001",
            email: "patient.one@example.invalid",
            email_confirmed_at: "2030-01-01T00:00:00.000Z",
            is_anonymous: false,
          },
        },
        error: null,
      }),
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      verifyOtp: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: syntheticSession.accessToken,
            refresh_token: syntheticSession.refreshToken,
            expires_at: syntheticSession.expiresAt.getTime() / 1_000,
          },
        },
        error: null,
      }),
      admin: {
        inviteUserByEmail: vi.fn().mockResolvedValue({
          data: { user: { id: "20000000-0000-4000-8000-000000000001" } },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      ...overrides,
    },
  } as unknown as SupabaseClient;
}

function sessionClient(): SupabaseClient {
  return {
    auth: {
      mfa: {
        enroll: vi.fn().mockResolvedValue({
          data: {
            id: "factor-id",
            type: "totp",
            totp: {
              qr_code: "synthetic-qr",
              secret: "synthetic-secret",
              uri: "otpauth://synthetic",
            },
          },
          error: null,
        }),
        challenge: vi.fn().mockResolvedValue({ data: { id: "challenge-id" }, error: null }),
        verify: vi.fn().mockResolvedValue({
          data: {
            access_token: "rotated-access-token",
            refresh_token: "rotated-refresh-token",
            expires_in: 3_600,
            token_type: "bearer",
            user: { id: "20000000-0000-4000-8000-000000000001" },
          },
          error: null,
        }),
      },
    },
  } as unknown as SupabaseClient;
}

describe("SupabaseManagedIdentityProvider", () => {
  it("verifies claims against the provider user and returns only trusted identity fields", async () => {
    const provider = new SupabaseManagedIdentityProvider(rootClient(), async () => sessionClient());

    await expect(provider.verifyAccessToken("synthetic-access-token")).resolves.toEqual({
      provider: "supabase",
      providerSubject: "20000000-0000-4000-8000-000000000001",
      providerSessionId: "50000000-0000-4000-8000-000000000001",
      assurance: "aal1",
      authenticatedAt: new Date("2030-01-01T00:00:00.000Z"),
      expiresAt: new Date("2030-01-01T01:00:00.000Z"),
      verifiedContact: {
        kind: "email",
        value: "patient.one@example.invalid",
        verifiedAt: new Date("2030-01-01T00:00:00.000Z"),
      },
    });
  });

  it("rejects mismatched, anonymous, or unverified identities without trusting user metadata", async () => {
    const provider = new SupabaseManagedIdentityProvider(
      rootClient({
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "different-provider-subject",
              email: "unverified@example.invalid",
              user_metadata: { role: "admin" },
              is_anonymous: false,
            },
          },
          error: null,
        }),
      }),
      async () => sessionClient(),
    );

    await expect(provider.verifyAccessToken("synthetic-access-token")).rejects.toEqual(
      new IdentityRejectedError(),
    );
  });

  it("keeps invitation, passwordless sign-in, recovery, OTP verification, and revocation server-side", async () => {
    const client = rootClient();
    const provider = new SupabaseManagedIdentityProvider(client, async () => sessionClient());

    await expect(
      provider.invitePatient("patient.one@example.invalid", "https://example.invalid/auth/confirm"),
    ).resolves.toBe("20000000-0000-4000-8000-000000000001");
    await expect(
      provider.requestPatientSignIn(
        "patient.one@example.invalid",
        "https://example.invalid/auth/confirm",
      ),
    ).resolves.toBeUndefined();
    await expect(
      provider.requestRecovery(
        "patient.one@example.invalid",
        "https://example.invalid/auth/confirm",
      ),
    ).resolves.toBeUndefined();
    await expect(provider.verifyEmailOtp("patient.one@example.invalid", "123456")).resolves.toEqual(
      syntheticSession,
    );
    await expect(
      provider.revokeSessions("synthetic-access-token", "global"),
    ).resolves.toBeUndefined();

    expect(client.auth.signInWithOtp).toHaveBeenCalledTimes(2);
    expect(client.auth.signInWithOtp).toHaveBeenCalledWith({
      email: "patient.one@example.invalid",
      options: {
        shouldCreateUser: false,
        emailRedirectTo: "https://example.invalid/auth/confirm",
      },
    });
  });

  it("supports TOTP enrollment and challenge while returning rotated aal2-capable session tokens", async () => {
    const provider = new SupabaseManagedIdentityProvider(rootClient(), async () => sessionClient());

    await expect(
      provider.enrollWorkforceTotp(syntheticSession, "Synthetic workforce"),
    ).resolves.toEqual({
      factorId: "factor-id",
      qrCode: "synthetic-qr",
      secret: "synthetic-secret",
      uri: "otpauth://synthetic",
    });
    await expect(provider.challengeWorkforceTotp(syntheticSession, "factor-id")).resolves.toBe(
      "challenge-id",
    );
    await expect(
      provider.verifyWorkforceTotp(syntheticSession, "factor-id", "challenge-id", "123456"),
    ).resolves.toMatchObject({
      accessToken: "rotated-access-token",
      refreshToken: "rotated-refresh-token",
    });
  });

  it("hides unexpected provider failures behind a stable unavailable error", async () => {
    const provider = new SupabaseManagedIdentityProvider(
      rootClient({ getClaims: vi.fn().mockRejectedValue(new Error("private provider detail")) }),
      async () => sessionClient(),
    );

    await expect(provider.verifyAccessToken("synthetic-access-token")).rejects.toEqual(
      new IdentityUnavailableError(),
    );
  });
});
