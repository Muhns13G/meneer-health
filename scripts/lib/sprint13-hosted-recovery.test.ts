import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { runHostedRecoveryRefund, runHostedRecoverySupport } from "./sprint13-hosted-recovery";
import type { HostedBridgePorts } from "./sprint13-hosted-bridge";

const id = "e1360000-0000-4000-8000-000000000010";
function harness() {
  const commands: { role?: string; body: Record<string, unknown> }[] = [];
  const statements: string[] = [];
  const stages: string[] = [];
  const ports: HostedBridgePorts = {
    tenant: "e1360000-0000-4000-8000-000000000001",
    caseId: id,
    actors: new Map(
      ["patient", "operations", "alternate", "admin"].map((role) => [
        role,
        {
          id,
          subjectId: id,
          email: "synthetic@example.invalid",
        },
      ]),
    ),
    async request(_path, body, role) {
      commands.push({ role, body });
      if (role === "alternate") return new Response(null, { status: 403 });
      const state = body.action === "request" ? "requested" : "queued";
      return Response.json({
        requestState: state,
        refunds:
          body.action === "request"
            ? []
            : [
                {
                  reference: id,
                  amountMinor: 99900,
                  state:
                    body.action === "review"
                      ? "queued"
                      : body.action === "dispatch"
                        ? "submitted"
                        : "confirmed",
                },
              ],
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      });
    },
    async sql(query) {
      statements.push(query);
      if (query.includes("refund_provider_facts")) return [{ confirmed: true }];
      if (query.includes("deposit_ready"))
        return [{ held: true, one_request: true, no_clinical_advance: true }];
      return [];
    },
    async portalRead() {
      throw new Error("UNEXPECTED_PORTAL_READ");
    },
    manifest(stage) {
      stages.push(stage);
    },
  };
  return { ports, commands, statements, stages };
}
describe("fresh hosted recovery refund packet", () => {
  it("requests/reviews idempotently, dispatches once and requires independent signed proof", async () => {
    const h = harness();
    await runHostedRecoveryRefund(h.ports, id);
    const requests = h.commands.filter((c) => c.body.action === "request");
    expect(requests).toHaveLength(2);
    expect(requests[0]!.body).toEqual(requests[1]!.body);
    expect(h.commands.filter((c) => c.body.action === "dispatch")).toHaveLength(1);
    expect(h.statements.join("\n")).toContain("f.job_reference=j.id");
    expect(h.statements.join("\n")).toContain("f.account_id=j.account_id");
    expect(h.statements.join("\n")).toContain("f.status='succeeded'");
    expect(h.statements.join("\n")).not.toMatch(
      /insert into commerce_private\.(settlements|refund_provider_facts)/i,
    );
    expect(h.stages).toEqual(["routed-cancellation-signed-refund-confirmed"]);
  });
  it("rejects wrong tenant or unsafe identifiers before any side effects", async () => {
    const h = harness();
    await expect(runHostedRecoveryRefund({ ...h.ports, tenant: "wrong" }, id)).rejects.toThrow(
      "RECOVERY_SCOPE_INVALID",
    );
    await expect(runHostedRecoveryRefund(h.ports, "';commit;")).rejects.toThrow(
      "RECOVERY_SCOPE_INVALID",
    );
    expect(h.commands).toHaveLength(0);
    expect(h.statements).toHaveLength(0);
  });
  it("stops on uncertain dispatch without a second send or false success", async () => {
    const h = harness(),
      original = h.ports.request;
    h.ports.request = async (...args) =>
      args[1].action === "dispatch" ? new Response(null, { status: 503 }) : original(...args);
    await expect(runHostedRecoveryRefund(h.ports, id)).rejects.toThrow(
      "RECOVERY_DISPATCH_STATUS_503",
    );
    expect(h.stages).toHaveLength(0);
    expect(h.statements.join("\n")).not.toContain("refund_provider_facts");
  });
});

describe("hosted recovery support fault packet", () => {
  it("keeps no-payment continuation and service-role RPCs separate from Auth bootstrap", () => {
    const source = readFileSync("scripts/test-sprint13-hosted-payment.ts", "utf8");
    expect(source).toContain('SPRINT13_RECOVERY_SUPPORT_ONLY === "no-payment"');
    expect(source).toContain("if (!supportOnly)");
    expect(source).toContain("serviceClient.rpc(name, args)");
    expect(source).not.toContain("admin.rpc(name, args)");
    const cleanup = readFileSync("scripts/sql/sprint-13-onboarding-cleanup.sql", "utf8");
    expect(cleanup).toContain(
      "t.tgrelid='commerce_private.refund_jobs'::regclass and t.tgname='refund_jobs_guard'",
    );
    expect(cleanup).toContain("enable trigger %I");
    expect(cleanup).toContain("ONBOARDING_UNRELATED_DATA_CHANGED");
  });
  function supportHarness(empty = false) {
    const h = harness();
    const ids = [1, 2, 3].map((n) => `e1360000-0000-4000-8000-00000000000${n}`);
    let requested = 0;
    h.ports.sql = async (query) => {
      h.statements.push(query);
      return query.includes(" as owned") ? [{ owned: true }] : [];
    };
    h.ports.request = async (path, body, role) => {
      h.commands.push({ role, body });
      if (path === "/portal/support/command" && body.action === "request")
        return Response.json({ outcome: "received", reference: ids[requested++] });
      if (body.action === "read")
        return Response.json({
          outcome: "view",
          routes: ["privacy", "complaint", "clinical"].map((purpose) => ({
            purpose,
            available: true,
          })),
          requests: empty
            ? []
            : ids.map((reference) => ({
                reference,
                purpose: "complaint",
                state: "escalated",
                recordedAt: new Date().toISOString(),
              })),
        });
      return new Response(null, {
        status: role === "operations" ? 401 : body.action === "resend" ? 409 : 200,
      });
    };
    let claimed = 0;
    const outcomes: unknown[] = [];
    const rpc = async (name: string, args: Record<string, unknown>) => {
      if (name === "finish_transactional_notification") {
        outcomes.push(args.p_outcome);
        return true;
      }
      if (claimed === 3) return null;
      return {
        notificationId: ids[claimed++],
        leaseId: id,
        template: "support-v1",
        recipient: "synthetic@example.invalid",
      };
    };
    return { ...h, rpc, outcomes };
  }
  it("journals injected failures and refuses uncertainty/suppression resend before alternate escalation", async () => {
    const h = supportHarness();
    await runHostedRecoverySupport(h.ports, h.rpc);
    expect(h.outcomes).toEqual(["failed", "uncertain", "uncertain"]);
    expect(h.commands.filter((c) => c.body.action === "resend")).toHaveLength(2);
    expect(h.statements.join("\n")).toContain("recipient_requested");
    expect(h.stages).toEqual([
      "hosted-injected-notification-faults-suppression-alternate-escalation-passed",
    ]);
  });
  it("does not accept an empty projection as proof of escalation", async () => {
    const h = supportHarness(true);
    await expect(runHostedRecoverySupport(h.ports, h.rpc)).rejects.toThrow(
      "RECOVERY_ALTERNATE_ESCALATION_MISSING",
    );
    expect(h.stages).toHaveLength(0);
  });
  it("rejects an out-of-scope tenant before journal writes", async () => {
    const h = supportHarness();
    await expect(runHostedRecoverySupport({ ...h.ports, tenant: "wrong" }, h.rpc)).rejects.toThrow(
      "RECOVERY_SUPPORT_SCOPE_INVALID",
    );
    expect(h.statements).toHaveLength(0);
  });
});
