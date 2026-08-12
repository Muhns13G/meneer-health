import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProfileErrorSummary, ProfileFields } from "@/components/ProfileFields";
import { validateProfileDraft } from "@/domain/journey/profile-form";

const emptyProfile = { firstName: "", email: "", whatsapp: "", password: "" };

describe("profile form accessibility", () => {
  it("associates required labels, instructions, autocomplete, and input modes", () => {
    render(<ProfileFields profile={emptyProfile} errors={{}} onChange={vi.fn()} />);

    expect(screen.getByLabelText(/First name/)).toHaveAttribute("autocomplete", "given-name");
    expect(screen.getByLabelText(/Email/)).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText(/Email/)).toHaveAttribute("inputmode", "email");
    expect(screen.getByLabelText(/WhatsApp number/)).toHaveAttribute("autocomplete", "tel");
    expect(screen.getByLabelText(/WhatsApp number/)).toHaveAttribute("inputmode", "tel");
    expect(screen.getByLabelText(/Password/)).toHaveAttribute("autocomplete", "new-password");
    for (const input of screen.getAllByRole("textbox")) expect(input).toBeRequired();
  });

  it("links invalid fields to visible errors and a navigable summary", async () => {
    const user = userEvent.setup();
    const errors = validateProfileDraft(emptyProfile);
    render(
      <>
        <ProfileErrorSummary errors={errors} />
        <ProfileFields profile={emptyProfile} errors={errors} onChange={vi.fn()} />
      </>,
    );

    const email = screen.getByLabelText(/Email/);
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription(/Required.*Enter a valid email address/);
    const summary = screen.getByRole("alert");
    expect(summary).toHaveTextContent("Check the highlighted details");
    await user.click(screen.getByRole("link", { name: "Enter a valid email address." }));
    expect(window.location.hash).toBe("#profile-email");
  });

  it("accepts a minimally valid synthetic profile", () => {
    expect(
      validateProfileDraft({
        firstName: "Synthetic",
        email: "synthetic@example.invalid",
        whatsapp: "+27 82 000 0000",
        password: "synthetic-password",
      }),
    ).toEqual({});
  });
});
