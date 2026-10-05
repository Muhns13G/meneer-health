import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { MedicalIntakePage } from "./MedicalIntakePage";
import { renderWithRouter } from "@/test/render-with-router";
import catalogue from "../../content/medical-intake-catalogue.json";
import { completeSyntheticAnswers } from "../../contracts/fixtures/medical-intake-synthetic";
const id = "d3000000-0000-4000-8000-000000000001";
const publication = {
  id,
  catalogueHash: "a".repeat(64),
  privacy: "Synthetic private notice",
  reviewDeclaration: "Synthetic doctor review",
  recipientReference: id,
  urgentGuidance: "Synthetic urgent guidance",
  afterHoursGuidance: "Synthetic after-hours guidance",
  transferNotice: "Synthetic disclosure only",
};
const contact = { email: "intake@example.invalid", mobile: "+27820000000", profileVersion: 1 };
function view(record: unknown = null) {
  return { record, publication, contact, expiresAt: Date.now() + 60000 };
}
function saved(answers: unknown = {}) {
  return {
    id,
    caseId: id,
    version: 1,
    snapshotId: id,
    state: "draft",
    hasSubmitted: false,
    safetyHold: false,
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    answers,
  };
}
afterEach(() => vi.unstubAllGlobals());
it("does not collect medical answers before a durable notice acknowledgement", async () => {
  const calls: Record<string, unknown>[] = [];
  const fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const command = JSON.parse(String(init?.body)) as Record<string, unknown>;
    calls.push(command);
    if (command.action === "read")
      return new Response(
        JSON.stringify(view(calls.some((c) => c.action === "save") ? saved() : null)),
      );
    return new Response(
      JSON.stringify({
        intakeId: id,
        caseId: id,
        version: 1,
        snapshotId: id,
        state: "draft",
        safetyHold: false,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      }),
    );
  });
  vi.stubGlobal("fetch", fetch);
  await renderWithRouter(<MedicalIntakePage />);
  await screen.findByText(publication.privacy);
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: /acknowledge this medical-intake/ }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByText(catalogue.sections[0]!.title);
  expect(calls.find((c) => c.action === "save")?.answers).toEqual({});
  expect(screen.getByLabelText("Sex")).toHaveValue("");
  expect(location.search + location.hash).not.toContain("intake");
});
it("preserves source prompts, branch choices and erases visible information on page exit", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(view(saved(completeSyntheticAnswers))))),
  );
  await renderWithRouter(<MedicalIntakePage />);
  await screen.findByText(catalogue.sections[0]!.title);
  for (let section = 1; section <= 8; section++) {
    for (const item of catalogue.items.filter((i) => i.section === section)) {
      if (item.id.startsWith("category_") && item.id !== "category_peptides") continue;
      if (item.id === "doctor_review_consent")
        expect(screen.getByText(publication.reviewDeclaration, { exact: false })).toBeVisible();
      else
        expect(
          screen.getByText((text) => text === item.prompt || text === item.prompt + " (optional)"),
        ).toBeVisible();
    }
    if (section < 8) fireEvent.click(screen.getByRole("button", { name: "Next section" }));
  }
  fireEvent(window, new Event("pagehide"));
  await waitFor(() => expect(screen.queryByRole("textbox")).not.toBeInTheDocument());
  expect(screen.getByRole("status")).toHaveTextContent("hidden");
});
it("fails closed without presenting fields when the server has not enabled intake", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(null, { status: 412 })),
  );
  await renderWithRouter(<MedicalIntakePage />);
  await screen.findByText(/not currently available/);
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});
it("offers retained-data export after a separately authorised restriction check without collecting answers", async () => {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: unknown, init?: RequestInit) => {
      const action = JSON.parse(String(init?.body)).action;
      calls.push(action);
      return action === "rights_read"
        ? new Response(
            JSON.stringify({
              record: { intakeId: id, state: "restricted" },
              expiresAt: Date.now() + 60000,
            }),
          )
        : new Response(null, { status: 401 });
    }),
  );
  await renderWithRouter(<MedicalIntakePage />);
  await screen.findByRole("button", { name: "Export retained questionnaire information" });
  expect(calls).toEqual(["read", "rights_read"]);
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  fireEvent(window, new Event("pagehide"));
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Export retained questionnaire information" }),
    ).not.toBeInTheDocument(),
  );
});
it("focuses an invalid field even when its section is already displayed", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(view(saved())))),
  );
  await renderWithRouter(<MedicalIntakePage />);
  await screen.findByText(catalogue.sections[0]!.title);
  for (let section = 1; section < 8; section++)
    fireEvent.click(screen.getByRole("button", { name: "Next section" }));
  fireEvent.click(screen.getByRole("button", { name: "Review answers" }));
  fireEvent.click(screen.getByRole("button", { name: /^Sex:/ }));
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Sex" })).toHaveFocus());
  fireEvent.click(screen.getByRole("button", { name: /^Full name:/ }));
  await waitFor(() => expect(screen.getByRole("textbox", { name: "Full name" })).toHaveFocus());
});
