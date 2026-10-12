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
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("masks backgrounded fields and retains unsaved edits only after same-account revalidation", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) =>
      url === "/account/session/renew"
        ? new Response(null, { status: 204 })
        : Response.json(view(saved())),
    ),
  );
  await renderWithRouter(<MedicalIntakePage />);
  const name = await screen.findByRole("textbox", { name: "Full name" });
  fireEvent.change(name, { target: { value: "Synthetic unsaved" } });
  const hidden = vi.spyOn(document, "hidden", "get");
  hidden.mockReturnValue(true);
  fireEvent(document, new Event("visibilitychange"));
  expect(screen.queryByRole("textbox", { name: "Full name" })).not.toBeInTheDocument();
  hidden.mockReturnValue(false);
  fireEvent(document, new Event("visibilitychange"));
  expect(await screen.findByRole("textbox", { name: "Full name" })).toHaveValue(
    "Synthetic unsaved",
  );
});

it("does not redisplay retained edits when foreground session verification fails", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) =>
      url === "/account/session/renew"
        ? new Response(null, { status: 401 })
        : Response.json(view(saved())),
    ),
  );
  await renderWithRouter(<MedicalIntakePage />);
  await screen.findByRole("textbox", { name: "Full name" });
  const hidden = vi.spyOn(document, "hidden", "get");
  hidden.mockReturnValue(true);
  fireEvent(document, new Event("visibilitychange"));
  hidden.mockReturnValue(false);
  fireEvent(document, new Event("visibilitychange"));
  await screen.findByRole("link", { name: "Sign in to resume your saved questionnaire" });
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});

it("retains written edits after a temporary renewal failure and permits an explicit save retry", async () => {
  let record = saved();
  let failed = false;
  const fetch = vi.fn(async (url, init?: RequestInit) => {
    if (url === "/account/session/renew") {
      if (!failed) {
        failed = true;
        return new Response(null, { status: 503 });
      }
      return new Response(null, { status: 204 });
    }
    const command = JSON.parse(String(init?.body));
    if (command.action === "save") {
      record = { ...saved(command.answers), version: 2 };
      return Response.json({
        intakeId: id,
        caseId: id,
        version: 2,
        snapshotId: id,
        state: "draft",
        safetyHold: false,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      });
    }
    return Response.json(view(record));
  });
  vi.stubGlobal("fetch", fetch);
  await renderWithRouter(<MedicalIntakePage />);
  fireEvent.change(await screen.findByRole("textbox", { name: "Full name" }), {
    target: { value: "Synthetic retained text" },
  });
  await screen.findByText(
    "Draft save not confirmed. Keep this tab open and retry Save draft.",
    {},
    { timeout: 4000 },
  );
  expect(screen.getByRole("textbox", { name: "Full name" })).toHaveValue("Synthetic retained text");
  expect(
    screen.queryByRole("link", { name: "Sign in to resume your saved questionnaire" }),
  ).not.toBeInTheDocument();
  expect(record.answers).toEqual({});
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await screen.findByText("Draft saved.");
  expect(screen.getByRole("button", { name: "Save draft" })).toHaveFocus();
  expect(record.answers).toMatchObject({ full_name: "Synthetic retained text" });
});

it("automatically saves a draft through authenticated commands without browser storage", async () => {
  let record = saved();
  const fetch = vi.fn(async (url, init?: RequestInit) => {
    if (url === "/account/session/renew") return new Response(null, { status: 204 });
    const command = JSON.parse(String(init?.body));
    if (command.action === "save") {
      record = { ...saved(command.answers), version: 2 };
      return Response.json({
        intakeId: id,
        caseId: id,
        version: 2,
        snapshotId: id,
        state: "draft",
        safetyHold: false,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      });
    }
    return Response.json(view(record));
  });
  vi.stubGlobal("fetch", fetch);
  await renderWithRouter(<MedicalIntakePage />);
  fireEvent.change(await screen.findByRole("textbox", { name: "Full name" }), {
    target: { value: "Synthetic autosave" },
  });
  await screen.findByText("Draft saved.", {}, { timeout: 4000 });
  expect(record.answers).toMatchObject({ full_name: "Synthetic autosave" });
  expect(fetch).toHaveBeenCalledWith("/account/session/renew", expect.anything());
});
it.each([false, true])(
  "shows an explicit next step after submission without bypassing a safety hold (%s)",
  async (safetyHold) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          view({
            ...saved(completeSyntheticAnswers),
            state: "submitted",
            hasSubmitted: true,
            safetyHold,
          }),
        ),
      ),
    );
    await renderWithRouter(<MedicalIntakePage />);
    await screen.findByRole("heading", { name: "Questionnaire received" });
    if (safetyHold) {
      expect(
        screen.queryByRole("link", { name: "Continue to deposit review" }),
      ).not.toBeInTheDocument();
      expect(screen.getByText(/Your next step is private review/)).toBeInTheDocument();
    } else {
      expect(screen.getByRole("link", { name: "Continue to deposit review" })).toHaveAttribute(
        "href",
        "/portal/order",
      );
    }
  },
);
it("does not collect medical answers before a durable notice acknowledgement", async () => {
  const calls: Record<string, unknown>[] = [];
  const fetch = vi.fn(async (url: unknown, init?: RequestInit) => {
    if (url === "/account/session/renew") return new Response(null, { status: 204 });
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
    // Text can commit before React's passive focus effect settles after the async read.
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: catalogue.sections[section - 1]!.title }),
      ).toHaveFocus(),
    );
    expect(screen.queryByRole("heading", { name: "Review your answers" })).not.toBeInTheDocument();
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
