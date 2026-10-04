import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { expect, it, vi, afterEach, describe } from "vitest";
import { StaffHandoffEvidencePanel } from "./StaffHandoffEvidencePanel";
import type { QueueDetail } from "@/application/operations/queue-projection";
const id = "a1000000-0000-4000-8000-000000000001";
const detail: QueueDetail = {
  caseId: id,
  state: "ready_for_handoff",
  version: 2,
  assignedOwner: id,
  createdAt: "2026-10-03T12:00:00Z",
  updatedAt: "2026-10-03T12:00:00Z",
  profileActive: true,
  emailVerified: true,
  exceptionCode: null,
  handoffReadiness: "not_evaluated",
  paymentReadiness: "not_evaluated",
  claim: "yours",
  handoff: null,
  profile: null,
  readiness: {
    profileActive: true,
    accountActive: true,
    emailVerified: true,
    instrumentsCurrent: true,
    authorisationCurrent: true,
    paymentReadiness: "integration_pending",
    recipientReadiness: "integration_pending",
    ready: false,
  },
};
afterEach(cleanup);
describe("private handoff controls", () => {
  const ready: QueueDetail = {
    ...detail,
    claim: "other",
    handoff: {
      attemptId: id,
      attemptState: "delivery_pending",
      authorisationId: id,
      exceptionId: null,
    },
  };
  it("prevents claimant self-verification at the UI boundary", () => {
    render(
      <StaffHandoffEvidencePanel detail={{ ...ready, claim: "yours" }} onInvalidate={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Verify inspected record" })).toBeDisabled();
  });
  it("submits only inspected nonclinical state and opaque references", async () => {
    const invalidate = vi.fn();
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ evidenceId: id }), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    render(<StaffHandoffEvidencePanel detail={ready} onInvalidate={invalidate} />);
    fireEvent.change(screen.getByLabelText("Opaque external record reference"), {
      target: { value: id },
    });
    fireEvent.change(screen.getByLabelText("Opaque observation reference"), {
      target: { value: id },
    });
    fireEvent.change(screen.getByLabelText("Observed at (ISO date/time with timezone)"), {
      target: { value: new Date().toISOString() },
    });
    fireEvent.submit(screen.getByRole("button").closest("form")!);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Verified evidence reference"),
    );
    expect([...fetcher.mock.calls[0][1].body.keys()].sort()).toEqual(
      [
        "attemptId",
        "caseId",
        "externalReference",
        "kind",
        "observedAt",
        "requestKey",
        "sourceReference",
      ].sort(),
    );
    expect(invalidate).not.toHaveBeenCalled();
  });
  it("rejects a pasted link before network access", () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    render(<StaffHandoffEvidencePanel detail={ready} onInvalidate={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Opaque external record reference"), {
      target: { value: "https://provider.example.invalid/private" },
    });
    fireEvent.submit(screen.getByRole("button").closest("form")!);
    expect(screen.getByRole("status")).toHaveTextContent("opaque UUID");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
