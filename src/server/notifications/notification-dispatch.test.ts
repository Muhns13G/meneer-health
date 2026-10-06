import { describe, expect, it, vi } from "vitest";
import {
  dispatchTransactionalNotifications,
  notificationTemplates,
  type NotificationOutcome,
  type NotificationRepository,
} from "@/application/notifications/transactional-notifications";
import {
  runScheduledTransactionalNotifications,
  sendTransactionalNotification,
} from "./notification-dispatch";

const claim = {
  notificationId: "f1200000-0000-4000-8000-000000000001",
  leaseId: "f1200000-0000-4000-8000-000000000002",
  recipient: "client@example.invalid",
  template: "account-v1" as const,
};

describe("private transactional transport", () => {
  it.each([
    [201, "accepted"],
    [200, "uncertain"],
    [302, "uncertain"],
    [429, "retryable"],
    [400, "failed"],
    [401, "failed"],
    [403, "failed"],
    [500, "uncertain"],
    [503, "uncertain"],
  ] as const)("classifies %s as %s without inferring inbox delivery", async (status, expected) => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status }));
    expect(await sendTransactionalNotification("synthetic-api-key", claim, send)).toBe(expected);
    const [url, options] = send.mock.calls[0]!;
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(options?.redirect).toBe("manual");
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(options!.body as string);
    expect(Object.keys(body).sort()).toEqual(["headers", "sender", "subject", "textContent", "to"]);
    expect(body.headers).toEqual({ idempotencyKey: claim.notificationId });
    expect(body.to).toEqual([{ email: claim.recipient }]);
    expect(body.textContent).toBe(
      `${notificationTemplates[claim.template].text}\n\nhttps://meneerhealth.co.za/account/sign-in`,
    );
    expect(body.textContent).not.toMatch(
      /f120|example.invalid|token|R999|diagnosis|protocol|compound/,
    );
  });

  it.each(Object.keys(notificationTemplates) as (keyof typeof notificationTemplates)[])(
    "sends only versioned static %s text",
    async (template) => {
      const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 201 }));
      await sendTransactionalNotification("synthetic-api-key", { ...claim, template }, send);
      const body = JSON.parse(send.mock.calls[0]![1]!.body as string);
      expect(body.subject).toBe(notificationTemplates[template].subject);
      expect(body.textContent).toContain(notificationTemplates[template].text);
      expect(body).not.toHaveProperty("params");
      expect(body).not.toHaveProperty("htmlContent");
    },
  );

  it("rejects unknown templates, extra sensitive fields and recipient header injection", async () => {
    const send = vi.fn<typeof fetch>();
    for (const input of [
      { ...claim, template: "clinical-success" },
      { ...claim, answers: { diagnosis: "synthetic" } },
      { ...claim, recipient: "client@example.invalid\r\nBcc: other@example.invalid" },
      { ...claim, notificationId: "client-reference" },
    ]) {
      expect(await sendTransactionalNotification("synthetic", input as typeof claim, send)).toBe(
        "failed",
      );
    }
    expect(send).not.toHaveBeenCalled();
  });

  it("does not consume provider diagnostic bodies or retry an ambiguous timeout", async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("private diagnostic"));
      },
    });
    const response = new Response(body, { status: 201 });
    const send = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response)
      .mockRejectedValueOnce(new Error("private failure"));
    expect(await sendTransactionalNotification("synthetic", claim, send)).toBe("accepted");
    expect(response.body?.locked).toBe(false);
    expect(await sendTransactionalNotification("synthetic", claim, send)).toBe("uncertain");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("stays disabled without network and rejects invalid opt-in configuration", async () => {
    await expect(runScheduledTransactionalNotifications({})).resolves.toBeUndefined();
    await expect(
      runScheduledTransactionalNotifications({ TRANSACTIONAL_NOTIFICATIONS_MODE: "disabled" }),
    ).resolves.toBeUndefined();
    await expect(
      runScheduledTransactionalNotifications({ TRANSACTIONAL_NOTIFICATIONS_MODE: "typo" }),
    ).rejects.toThrow("NOTIFICATION_CONFIGURATION_INVALID");
    await expect(
      runScheduledTransactionalNotifications({ TRANSACTIONAL_NOTIFICATIONS_MODE: "brevo" }),
    ).rejects.toThrow("NOTIFICATION_CONFIGURATION_INVALID");
  });

  it.each([true, false])(
    "binds the provider reference before persisting acceptance (binding success: %s)",
    async (bindingSucceeds) => {
      const tenantId = "f1200000-0000-4000-8000-000000000003";
      const calls: { path: string; body: Record<string, unknown> }[] = [];
      let claims = 0;
      const send = vi.fn<typeof fetch>(async (input, options) => {
        const path = new URL(String(input)).pathname;
        const body = JSON.parse(options!.body as string);
        calls.push({ path, body });
        let data: unknown;
        if (path.endsWith("claim_transactional_notification")) data = claims++ === 0 ? claim : null;
        else if (path === "/v3/smtp/email")
          return Response.json(
            { messageId: "<synthetic.reference@relay.example.invalid>" },
            { status: 201 },
          );
        else if (path.endsWith("bind_transactional_message")) data = bindingSucceeds;
        else if (path.endsWith("finish_transactional_notification")) data = true;
        else throw new Error("Unexpected synthetic request");
        return Response.json(data);
      });
      vi.stubGlobal("fetch", send);
      try {
        await runScheduledTransactionalNotifications({
          TRANSACTIONAL_NOTIFICATIONS_MODE: "brevo",
          TRANSACTIONAL_NOTIFICATIONS_TENANT_ID: tenantId,
          BREVO_API_KEY: "synthetic-private-brevo-key",
          SUPABASE_URL: "https://synthetic.supabase.invalid",
          SUPABASE_SECRET_KEY: "synthetic-private-service-key",
        });
        expect(calls.map(({ path }) => path)).toEqual([
          "/rest/v1/rpc/claim_transactional_notification",
          "/v3/smtp/email",
          "/rest/v1/rpc/bind_transactional_message",
          "/rest/v1/rpc/finish_transactional_notification",
          "/rest/v1/rpc/claim_transactional_notification",
        ]);
        expect(calls[2]!.body).toEqual({
          p_tenant_id: tenantId,
          p_notification_id: claim.notificationId,
          p_lease_id: claim.leaseId,
          p_message_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
        });
        expect(calls[3]!.body).toEqual({
          p_tenant_id: tenantId,
          p_notification_id: claim.notificationId,
          p_lease_id: claim.leaseId,
          p_outcome: bindingSucceeds ? "accepted" : "uncertain",
        });
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );
});

describe("bounded durable orchestration", () => {
  function repository(): NotificationRepository {
    return {
      claim: vi.fn().mockResolvedValue(claim),
      finish: vi.fn().mockResolvedValue(undefined),
    };
  }
  it("bounds each scheduled invocation to three claimed messages", async () => {
    const repo = repository();
    const send = vi.fn().mockResolvedValue("accepted");
    expect(await dispatchTransactionalNotifications(repo, send)).toBe(3);
    expect(send).toHaveBeenCalledTimes(3);
    expect(repo.finish).toHaveBeenLastCalledWith(claim, "accepted");
  });
  it.each(["accepted", "retryable", "failed", "uncertain"] as NotificationOutcome[])(
    "persists %s once; does not retry inside the dispatcher",
    async (outcome) => {
      const repo = repository();
      vi.mocked(repo.claim).mockResolvedValueOnce(claim).mockResolvedValueOnce(null);
      const send = vi.fn().mockResolvedValue(outcome);
      expect(await dispatchTransactionalNotifications(repo, send)).toBe(1);
      expect(repo.finish).toHaveBeenCalledExactlyOnceWith(claim, outcome);
      expect(send).toHaveBeenCalledTimes(1);
    },
  );
  it("persists thrown transport as uncertain but leaves failed receipt storage to lease expiry", async () => {
    const repo = repository();
    const send = vi.fn().mockRejectedValue(new Error("private error"));
    vi.mocked(repo.finish).mockRejectedValue(new Error("storage unavailable"));
    await expect(dispatchTransactionalNotifications(repo, send)).rejects.toThrow(
      "storage unavailable",
    );
    expect(repo.finish).toHaveBeenCalledExactlyOnceWith(claim, "uncertain");
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("never sends a malformed persisted claim or a null queue", async () => {
    const repo = repository();
    const send = vi.fn();
    vi.mocked(repo.claim).mockResolvedValueOnce(null);
    expect(await dispatchTransactionalNotifications(repo, send)).toBe(0);
    vi.mocked(repo.claim).mockResolvedValueOnce({ ...claim, extra: "private" } as typeof claim);
    await expect(dispatchTransactionalNotifications(repo, send)).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});
