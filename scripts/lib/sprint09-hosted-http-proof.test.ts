import { expect, it, vi } from "vitest";
import { proveSprint09HostedDenials } from "./sprint09-hosted-http-proof";

it("rejects unapproved origins before networking", async () => {
  const send = vi.fn();
  await expect(proveSprint09HostedDenials("https://attacker.invalid/", send)).rejects.toThrow(
    "SPRINT09_HOSTED_ORIGIN_REJECTED",
  );
  expect(send).not.toHaveBeenCalled();
});
it("requires exact denial semantics and private non-redirecting responses", async () => {
  const statuses = [401, 403, 405, 401, 403, 401, 404];
  const send = vi.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(null, {
        status: statuses.shift(),
        headers: { "Cache-Control": "private, no-store" },
      }),
    ),
  );
  expect(await proveSprint09HostedDenials("https://meneerhealth.co.za/", send)).toMatchObject({
    checks: 7,
    positiveSessionProof: false,
  });
  expect(send).toHaveBeenCalledTimes(7);
});
const rejectedResponses: ResponseInit[] = [
  { status: 200, headers: { "Cache-Control": "no-store" } },
  { status: 401, headers: { "Cache-Control": "public, max-age=60" } },
  { status: 401, headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } },
];
it.each(rejectedResponses)(
  "rejects response drift instead of calling all failures success",
  async (init) => {
    const send = vi.fn().mockResolvedValue(new Response(null, init));
    await expect(proveSprint09HostedDenials("https://meneerhealth.co.za/", send)).rejects.toThrow(
      "SPRINT09_HOSTED_DENIAL_FAILED",
    );
  },
);
it("rejects an authorising cookie on a denied anonymous request", async () => {
  const send = vi.fn().mockResolvedValue(
    new Response(null, {
      status: 401,
      headers: { "Cache-Control": "no-store", "Set-Cookie": "session=synthetic; Max-Age=900" },
    }),
  );
  await expect(proveSprint09HostedDenials("https://meneerhealth.co.za/", send)).rejects.toThrow(
    "SPRINT09_UNEXPECTED_COOKIE_ISSUANCE",
  );
});
