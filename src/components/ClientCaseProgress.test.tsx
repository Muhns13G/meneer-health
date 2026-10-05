import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClientCaseProgress } from "./ClientCaseProgress";
import { clientCaseProjectionSchema } from "@/domain/identity/patient-portal";

describe("minimum own-client case progress", () => {
  it("does not invent progress when no case exists", () => {
    render(<ClientCaseProgress cases={[]} />);
    expect(
      screen.getByText("No administrative case has been started for this account."),
    ).toBeVisible();
  });
  it.each([
    "waiting",
    "action_required",
    "handoff_pending",
    "handoff_recorded",
    "paused",
    "completed",
  ] as const)("renders %s as administrative only", (status) => {
    render(
      <ClientCaseProgress
        cases={[
          {
            reference: "c8000000-0000-4000-8000-000000000001",
            status,
            updatedAt: "2026-10-05T00:00:00Z",
          },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { level: 3 })).toBeVisible();
    expect(
      screen.getByText(/These statuses describe administrative processing only/),
    ).toBeVisible();
    expect(screen.getByText(/Reference:/)).toHaveTextContent(
      "c8000000-0000-4000-8000-000000000001",
    );
  });
  it("rejects internal and clinical state or extra fields at the response boundary", () => {
    const base = {
      reference: "c8000000-0000-4000-8000-000000000001",
      status: "waiting",
      updatedAt: "2026-10-05T00:00:00Z",
    };
    for (const field of [
      "outcome",
      "reason",
      "staffId",
      "protocol",
      "clinicalState",
      "paymentState",
    ])
      expect(clientCaseProjectionSchema.safeParse({ ...base, [field]: "private" }).success).toBe(
        false,
      );
    expect(
      clientCaseProjectionSchema.safeParse({ ...base, status: "provider_review_pending" }).success,
    ).toBe(false);
  });
});
