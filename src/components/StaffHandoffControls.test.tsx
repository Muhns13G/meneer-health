import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StaffHandoffControls } from "./StaffHandoffControls";
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
  it("submits only opaque references and current version, never a delivery checkbox", async () => {
    const submit = vi.fn();
    render(<StaffHandoffControls detail={detail} busy={false} submit={submit} />);
    await userEvent.type(screen.getByLabelText("authorisation Id"), id);
    await userEvent.click(screen.getByRole("button", { name: "Record hand-off command" }));
    expect(submit).toHaveBeenCalledWith({
      action: "prepare",
      caseId: id,
      expectedVersion: 2,
      requestKey: expect.any(String),
      authorisationId: id,
    });
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
  it.each(["onboarding_pending", "cancelled", "provider_outcome_recorded"] as const)(
    "disables %s",
    (state) => {
      render(<StaffHandoffControls detail={{ ...detail, state }} busy={false} submit={vi.fn()} />);
      expect(screen.getByRole("button")).toBeDisabled();
    },
  );
  it("cannot mutate an unclaimed case", () => {
    render(
      <StaffHandoffControls
        detail={{ ...detail, claim: "unclaimed" }}
        busy={false}
        submit={vi.fn()}
      />,
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });
  it("rejects pasted URLs and replaces stale reference fields on action change", async () => {
    const submit = vi.fn();
    render(<StaffHandoffControls detail={detail} busy={false} submit={submit} />);
    await userEvent.type(
      screen.getByLabelText("authorisation Id"),
      "https://provider.invalid/intake",
    );
    await userEvent.click(screen.getByRole("button"));
    expect(await screen.findByText(/Use valid opaque UUID/)).toBeVisible();
    expect(submit).not.toHaveBeenCalled();
    await userEvent.selectOptions(screen.getByLabelText("Hand-off action"), "acknowledge");
    expect(screen.getByLabelText("attempt Id")).toHaveValue("");
    expect(screen.getByLabelText("evidence Id")).toHaveValue("");
    expect(screen.queryByLabelText("authorisation Id")).toBeNull();
  });
});
