import { describe, expect, it } from "vitest";
import { AccountReviewRequiredError } from "@/application/identity/patient-session-service";
import {
  accountReviewCookieName,
  openAccountReview,
  sealAccountReview,
  reviewCookie,
} from "./account-review-cookie";
import { openPatientSession } from "./patient-session-cookie";
const key = new Uint8Array(32).fill(8),
  now = Date.now();
const review = new AccountReviewRequiredError(
  "10000000-0000-4000-8000-000000000001",
  {
    provider: "supabase",
    providerSubject: "20000000-0000-4000-8000-000000000001",
    providerSessionId: "30000000-0000-4000-8000-000000000001",
    assurance: "aal1",
    authenticatedAt: new Date(now),
    expiresAt: new Date(now + 3600000),
    verifiedContact: { kind: "email", value: "review@example.invalid", verifiedAt: new Date(now) },
  },
  {
    accessToken: "synthetic-access",
    refreshToken: "synthetic-refresh",
    expiresAt: new Date(now + 3600000),
  },
);
const request = (token: string) =>
  new Request("https://meneerhealth.co.za/account/documents/current", {
    headers: { Cookie: `${accountReviewCookieName}=${token}` },
  });
describe("documents-only cookie", () => {
  it("cannot be opened as a normal patient session", async () => {
    const token = await sealAccountReview(review, key, now);
    expect(await openPatientSession(token, key, now)).toBeNull();
    expect(await openAccountReview(request(token), key, now)).toMatchObject({
      purpose: "account-document-review",
      expiresAt: now + 600000,
    });
    expect(token).not.toContain("synthetic-access");
    expect(reviewCookie(token)).toMatch(/HttpOnly; Secure; SameSite=Strict/);
  });
  it("rejects tampering, wrong key and expiry", async () => {
    const token = await sealAccountReview(review, key, now);
    expect(await openAccountReview(request(token.slice(0, -8) + "AAAAAAAA"), key, now)).toBeNull();
    expect(await openAccountReview(request(token), new Uint8Array(32).fill(1), now)).toBeNull();
    expect(await openAccountReview(request(token), key, now + 600000)).toBeNull();
  });
});
