import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchPilotEmailInvitation } from "./pilot-email-invitation-service";
const id = "a1510000-0000-4000-8000-000000000001";
const input = {
  invitationId: id,
  expectedVersion: 1,
  requestKey: id,
  email: "participant@example.invalid",
};
function fixture() {
  return {
    prepare: vi.fn().mockResolvedValue({
      attemptId: id,
      dispatchUntil: new Date(Date.now() + 60000).toISOString(),
    }),
    finish: vi.fn().mockResolvedValue(undefined),
    send: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 201 })),
  };
}
describe("one-shot pilot email delivery", () => {
  beforeEach(() => vi.stubGlobal("crypto", webcrypto));
  afterEach(() => vi.unstubAllGlobals());
  it("commits only a digest before sending a fragment capability and exposes only acceptance", async () => {
    const f = fixture();
    expect(await dispatchPilotEmailInvitation(input, f, "synthetic-key", f.send)).toEqual({
      outcome: "accepted",
    });
    const body = JSON.parse(String(f.send.mock.calls[0]![1]!.body));
    const token = /mobile-invitation#([A-Za-z0-9_-]{43})/.exec(body.textContent)![1]!;
    expect(f.prepare.mock.calls[0]![1]).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(f.prepare.mock.calls)).not.toContain(token);
    expect(JSON.stringify(f.finish.mock.calls)).not.toContain(token);
    expect(f.prepare.mock.invocationCallOrder[0]).toBeLessThan(f.send.mock.invocationCallOrder[0]!);
    expect(body.to).toEqual([{ email: input.email }]);
    expect(body.textContent).toContain("48 hours");
    expect(body.textContent).toContain("six-digit code");
    expect(body).not.toHaveProperty("htmlContent");
    expect(f.finish).toHaveBeenCalledWith(id, "accepted");
  });
  it("does not send on replay or preparation failure", async () => {
    const f = fixture();
    f.prepare.mockResolvedValue(null);
    expect((await dispatchPilotEmailInvitation(input, f, "synthetic", f.send)).outcome).toBe(
      "already_attempted",
    );
    f.prepare.mockRejectedValue(new Error("denied"));
    await expect(dispatchPilotEmailInvitation(input, f, "synthetic", f.send)).rejects.toThrow(
      "denied",
    );
    expect(f.send).not.toHaveBeenCalled();
  });
  it("normalises the mailbox before reservation and delivery", async () => {
    const f = fixture();
    await dispatchPilotEmailInvitation(
      { ...input, email: " Participant@Example.invalid " },
      f,
      "synthetic",
      f.send,
    );
    expect(f.prepare.mock.calls[0]![0].email).toBe(input.email);
    expect(JSON.parse(String(f.send.mock.calls[0]![1]!.body)).to).toEqual([{ email: input.email }]);
  });
  it.each([400, 429, 500, 302])("classifies %s without retry", async (status) => {
    const f = fixture();
    f.send.mockResolvedValue(new Response(null, { status }));
    expect((await dispatchPilotEmailInvitation(input, f, "synthetic", f.send)).outcome).toBe(
      status >= 400 && status < 500 ? "failed" : "uncertain",
    );
    expect(f.send).toHaveBeenCalledOnce();
  });
  it("holds uncertainty after timeout or missing durable finish", async () => {
    const f = fixture();
    f.send.mockRejectedValue(new Error("timeout"));
    expect((await dispatchPilotEmailInvitation(input, f, "synthetic", f.send)).outcome).toBe(
      "uncertain",
    );
    expect(f.finish).toHaveBeenCalledWith(id, "uncertain");
    f.send.mockResolvedValue(new Response(null, { status: 201 }));
    f.finish.mockRejectedValue(new Error("lost"));
    expect((await dispatchPilotEmailInvitation(input, f, "synthetic", f.send)).outcome).toBe(
      "uncertain",
    );
    expect(f.send).toHaveBeenCalledTimes(2);
  });
  it("does not send after lease expiry", async () => {
    const f = fixture();
    f.prepare.mockResolvedValue({ attemptId: id, dispatchUntil: new Date(0).toISOString() });
    expect((await dispatchPilotEmailInvitation(input, f, "synthetic", f.send)).outcome).toBe(
      "uncertain",
    );
    expect(f.send).not.toHaveBeenCalled();
  });
});
