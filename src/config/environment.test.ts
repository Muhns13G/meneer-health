import { describe, expect, it } from "vitest";

import { environmentCatalogue } from "../../config/environment-catalogue";
import {
  PublicEnvironmentConfigurationError,
  validatePublicBuildEnvironment,
} from "../../config/public-environment";
import {
  ServerEnvironmentConfigurationError,
  validateServerEnvironment,
} from "../server/config/environment-schema";

describe("public build configuration", () => {
  it("normalises an empty optional configuration to safe disabled values", () => {
    expect(validatePublicBuildEnvironment({})).toEqual({ campaignPrintProof: false });
  });

  it("accepts only root-relative or HTTPS media and the exact print-proof flag", () => {
    expect(
      validatePublicBuildEnvironment({
        VITE_PEPTIDE_VIDEO_URL: "/media/peptides/draft.mp4",
        VITE_PEPTIDE_VIDEO_POSTER_URL: "https://assets.example.invalid/poster.jpg",
        VITE_CAMPAIGN_PRINT_PROOF: "true",
      }),
    ).toEqual({
      peptideVideoUrl: "/media/peptides/draft.mp4",
      peptideVideoPosterUrl: "https://assets.example.invalid/poster.jpg",
      campaignPrintProof: true,
    });
  });

  it.each([
    { VITE_PEPTIDE_VIDEO_URL: "http://assets.example.invalid/video.mp4" },
    { VITE_PEPTIDE_VIDEO_URL: "//assets.example.invalid/video.mp4" },
    { VITE_PEPTIDE_VIDEO_URL: "javascript:alert(1)" },
    { VITE_CAMPAIGN_PRINT_PROOF: "yes" },
    { VITE_UNAPPROVED_PUBLIC_VALUE: "present" },
  ])("fails safely for invalid or undeclared public values", (environment) => {
    expect(() => validatePublicBuildEnvironment(environment)).toThrow(
      PublicEnvironmentConfigurationError,
    );
  });
});

describe("environment catalogue", () => {
  it("keeps every VITE variable public and client exposed", () => {
    for (const entry of environmentCatalogue) {
      if (entry.name.startsWith("VITE_")) {
        expect(entry.sensitivity).toBe("public");
        expect(entry.exposure).toBe("client");
      }
    }
  });

  it("catalogues server and runner values without enabling preview", () => {
    const serverEntries = environmentCatalogue.filter((entry) => entry.exposure === "server");

    expect(serverEntries.map((entry) => entry.name)).toEqual([
      "SUPABASE_URL",
      "SUPABASE_SECRET_KEY",
      "SUPABASE_DB_URL",
      "RECOVERY_EXPORT_SOURCE",
      "RECOVERY_R2_BUCKET",
      "CLOUDFLARE_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "RECOVERY_ENCRYPTION_KEY_BASE64",
      "BACKUP_HEARTBEAT_URL",
      "STRIPE_RESTRICTED_KEY",
      "STRIPE_WEBHOOK_SIGNING_SECRET",
      "STRIPE_WEBHOOK_SERVICE_IDENTITY_ID",
    ]);
    expect(serverEntries.every((entry) => !entry.environments.includes("preview"))).toBe(true);
    expect(serverEntries.find((entry) => entry.name === "SUPABASE_SECRET_KEY")?.sensitivity).toBe(
      "secret",
    );
    expect(
      environmentCatalogue.some((entry) => entry.exposure === "server" && entry.required),
    ).toBe(false);
  });
});

describe("server startup configuration", () => {
  it("keeps persistence disabled when the optional server pair is absent", () => {
    expect(validateServerEnvironment({})).toEqual({
      supabase: undefined,
      recovery: undefined,
      stripe: undefined,
    });
  });

  it("accepts and normalises the complete Supabase server pair", () => {
    expect(
      validateServerEnvironment({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SECRET_KEY: "synthetic-secret",
      }),
    ).toEqual({
      supabase: {
        url: "https://example.supabase.co",
        secretKey: "synthetic-secret",
      },
      recovery: undefined,
      stripe: undefined,
    });
  });

  it("allows insecure Supabase transport only on the loopback test boundary", () => {
    expect(
      validateServerEnvironment({
        SUPABASE_URL: "http://127.0.0.1:54321",
        SUPABASE_SECRET_KEY: "synthetic-secret",
      }),
    ).toMatchObject({
      supabase: { url: "http://127.0.0.1:54321" },
    });
    expect(
      validateServerEnvironment({
        SUPABASE_URL: "http://localhost:54321",
        SUPABASE_SECRET_KEY: "synthetic-secret",
      }),
    ).toMatchObject({
      supabase: { url: "http://localhost:54321" },
    });
  });

  it("accepts only a complete HTTPS recovery pair", () => {
    expect(
      validateServerEnvironment({
        RECOVERY_ENCRYPTION_KEY_BASE64: `${"A".repeat(43)}=`,
        BACKUP_HEARTBEAT_URL: "https://heartbeat.example.invalid/synthetic",
      }),
    ).toEqual({
      supabase: undefined,
      recovery: {
        encryptionKeyBase64: `${"A".repeat(43)}=`,
        heartbeatUrl: "https://heartbeat.example.invalid/synthetic",
      },
      stripe: undefined,
    });
  });

  it("accepts only a complete restricted Stripe test-mode configuration", () => {
    expect(
      validateServerEnvironment({
        STRIPE_RESTRICTED_KEY: `rk_test_${"A".repeat(24)}`,
        STRIPE_WEBHOOK_SIGNING_SECRET: `whsec_${"B".repeat(24)}`,
        STRIPE_WEBHOOK_SERVICE_IDENTITY_ID: "80000000-0000-4000-8000-000000000002",
      }),
    ).toEqual({
      supabase: undefined,
      recovery: undefined,
      stripe: {
        restrictedKey: `rk_test_${"A".repeat(24)}`,
        webhookSigningSecret: `whsec_${"B".repeat(24)}`,
        webhookServiceIdentityId: "80000000-0000-4000-8000-000000000002",
        mode: "test",
      },
    });
  });

  it.each([
    { SUPABASE_URL: "https://example.supabase.co" },
    { SUPABASE_SECRET_KEY: "synthetic-secret" },
    {
      SUPABASE_URL: "http://example.supabase.co",
      SUPABASE_SECRET_KEY: "synthetic-secret",
    },
    { RECOVERY_ENCRYPTION_KEY_BASE64: `${"A".repeat(43)}=` },
    { BACKUP_HEARTBEAT_URL: "https://heartbeat.example.invalid/synthetic" },
    {
      RECOVERY_ENCRYPTION_KEY_BASE64: "not-a-key",
      BACKUP_HEARTBEAT_URL: "https://heartbeat.example.invalid/synthetic",
    },
    { STRIPE_RESTRICTED_KEY: `rk_test_${"A".repeat(24)}` },
    { STRIPE_WEBHOOK_SIGNING_SECRET: `whsec_${"B".repeat(24)}` },
    { STRIPE_WEBHOOK_SERVICE_IDENTITY_ID: "80000000-0000-4000-8000-000000000002" },
    {
      STRIPE_RESTRICTED_KEY: `sk_test_${"A".repeat(24)}`,
      STRIPE_WEBHOOK_SIGNING_SECRET: `whsec_${"B".repeat(24)}`,
      STRIPE_WEBHOOK_SERVICE_IDENTITY_ID: "80000000-0000-4000-8000-000000000002",
    },
    {
      STRIPE_RESTRICTED_KEY: `rk_live_${"A".repeat(24)}`,
      STRIPE_WEBHOOK_SIGNING_SECRET: `whsec_${"B".repeat(24)}`,
      STRIPE_WEBHOOK_SERVICE_IDENTITY_ID: "80000000-0000-4000-8000-000000000002",
    },
  ])("rejects partial or insecure Supabase server configuration", (environment) => {
    expect(() => validateServerEnvironment(environment)).toThrow(
      ServerEnvironmentConfigurationError,
    );
  });

  it("fails closed without echoing an unexpected value", () => {
    const unexpectedValue = "do-not-echo-this-value";

    expect(() => validateServerEnvironment({ unexpected: unexpectedValue })).toThrow(
      ServerEnvironmentConfigurationError,
    );

    try {
      validateServerEnvironment({ unexpected: unexpectedValue });
    } catch (error) {
      expect(String(error)).not.toContain(unexpectedValue);
    }
  });
});
