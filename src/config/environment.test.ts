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

  it("contains no placeholder secret or required server value", () => {
    expect(environmentCatalogue.some((entry) => entry.sensitivity === "secret")).toBe(false);
    expect(
      environmentCatalogue.some((entry) => entry.exposure === "server" && entry.required),
    ).toBe(false);
  });
});

describe("server startup configuration", () => {
  it("accepts the intentional no-secret Task 5.3 server schema", () => {
    expect(validateServerEnvironment({})).toEqual({});
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
