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

  it("catalogues the server-only Supabase pair without enabling preview", () => {
    const serverEntries = environmentCatalogue.filter((entry) => entry.exposure === "server");

    expect(serverEntries.map((entry) => entry.name)).toEqual([
      "SUPABASE_URL",
      "SUPABASE_SECRET_KEY",
      "RECOVERY_ENCRYPTION_KEY_BASE64",
      "BACKUP_HEARTBEAT_URL",
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
    expect(validateServerEnvironment({})).toEqual({ supabase: undefined, recovery: undefined });
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
