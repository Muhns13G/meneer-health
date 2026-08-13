import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StepProgress } from "@/components/SteppedFlow";
import { PreservedPeptidesPage } from "@/routes/peptides";
import { PreservedStartFlow } from "@/routes/start";
import { renderWithRouter } from "@/test/render-with-router";

vi.mock("@/config/public-environment", () => ({
  publicEnvironment: {},
}));

const syntheticProfile = {
  firstName: "Synthetic",
  email: "synthetic@example.invalid",
  whatsapp: "+27 82 000 0000",
  password: "synthetic-password",
};

async function completeProfile(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/name/i), syntheticProfile.firstName);
  await user.type(screen.getByLabelText(/email/i), syntheticProfile.email);
  await user.type(screen.getByLabelText(/WhatsApp number/i), syntheticProfile.whatsapp);
  await user.type(screen.getByLabelText(/password/i), syntheticProfile.password);
}

describe("stepped-flow accessibility", () => {
  it("exposes determinate progress and announces its current step", () => {
    render(<StepProgress current={2} total={5} label="Consent" />);

    expect(screen.getByRole("progressbar", { name: "Consultation progress" })).toHaveAttribute(
      "aria-valuetext",
      "Step 2 of 5: Consent",
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
    expect(screen.getByText("Step 2 of 5: Consent")).toHaveAttribute("aria-live", "polite");
  });

  it("moves start-flow focus, announces errors, and preserves profile state on Back", async () => {
    const user = userEvent.setup();
    await renderWithRouter(<PreservedStartFlow />);

    await user.click(screen.getByRole("button", { name: /Hair Loss/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "POPIA & informed consent." })).toHaveFocus();

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Create your private account." })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByRole("alert")).toHaveFocus();

    await completeProfile(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByRole("heading", { name: "A few questions about you." })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText(/First name/i)).toHaveValue(syntheticProfile.firstName);
    expect(screen.getByLabelText(/Email/i)).toHaveValue(syntheticProfile.email);
  });

  it("moves peptide-flow focus and preserves profile state on Back", async () => {
    const user = userEvent.setup();
    await renderWithRouter(<PreservedPeptidesPage />);

    await user.click(screen.getByRole("button", { name: "Create your profile" }));
    expect(screen.getByRole("heading", { name: "Create your profile" })).toHaveFocus();

    await completeProfile(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Before you continue." })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText(/Full name/i)).toHaveValue(syntheticProfile.firstName);
    expect(screen.getByLabelText(/WhatsApp number/i)).toHaveValue(syntheticProfile.whatsapp);
  });
});
