import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { MedicalIntakePage } from "./MedicalIntakePage";
import { renderWithRouter } from "@/test/render-with-router";
import catalogue from "../../content/medical-intake-catalogue.json";
import { completeSyntheticAnswers } from "../../contracts/fixtures/medical-intake-synthetic";
import { createIntakeFlow } from "@/lib/intake-flow";
const { intakeSteps } = createIntakeFlow(catalogue);
async function openAboutYou() {
  fireEvent.change(await screen.findByRole("combobox", { name: "Go to section" }), {
    target: { value: "2" },
  });
}
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
it("retains saved answers while requiring two genuine successor-notice actions", async () => {
  const commands: Record<string, unknown>[] = [];
  let acknowledged = false;
  const transition = {
    publicationId: "d3000000-0000-4000-8000-000000000099",
    privacy: "Synthetic current-company privacy",
    reviewDeclaration: "I consent to synthetic current-company clinical review",
    privacyHash: "b".repeat(64),
    reviewHash: "c".repeat(64),
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, init) => {
      const command = JSON.parse(String(init.body));
      if (command.action === "acknowledge_notice") {
        commands.push(command);
        if (commands.length === 1) return new Response(null, { status: 503 });
        acknowledged = true;
        return Response.json({ recorded: true });
      }
      return Response.json({
        ...view(
          saved({ health_history: { disposition: "provided", text: "Synthetic retained answer" } }),
        ),
        noticeTransition: { ...transition, acknowledged },
      });
    }),
  );
  await renderWithRouter(<MedicalIntakePage />);
  await screen.findByRole("heading", { name: "Updated questionnaire notices" });
  const save = screen.getByRole("button", { name: "Save notices and continue" });
  expect(save).toBeDisabled();
  const boxes = screen.getAllByRole("checkbox");
  for (const box of boxes) {
    expect(box).not.toBeChecked();
    fireEvent.click(box);
  }
  fireEvent.click(save);
  await screen.findByText(/could not confirm your notice actions/);
  expect(screen.queryByDisplayValue("Synthetic retained answer")).not.toBeInTheDocument();
  fireEvent.click(save);
  await waitFor(() =>
    expect(
      screen.queryByRole("heading", { name: "Updated questionnaire notices" }),
    ).not.toBeInTheDocument(),
  );
  expect(commands).toHaveLength(2);
  expect(commands[0].requestKey).toBe(commands[1].requestKey);
  expect(commands[1]).toMatchObject({
    publicationId: transition.publicationId,
    privacyHash: transition.privacyHash,
    reviewHash: transition.reviewHash,
    action: "acknowledge_notice",
    intakeId: id,
    privacyAcknowledged: true,
    reviewConsent: true,
  });
  expect(commands[1]).not.toHaveProperty("answers");
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
  await openAboutYou();
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
  await openAboutYou();
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
  await openAboutYou();
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
  await openAboutYou();
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
  await screen.findByRole("heading", { name: intakeSteps[0]!.title });
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: intakeSteps[0]!.title })).toHaveFocus(),
  );
  expect(calls.find((c) => c.action === "save")?.answers).toEqual({});
  expect(screen.getByRole("checkbox", { name: "Peptides" })).not.toBeChecked();
  await openAboutYou();
  expect(screen.getByLabelText("Sex")).toHaveValue("");
  expect(location.search + location.hash).not.toContain("intake");
});
it("preserves source prompts, branch choices and erases visible information on page exit", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(view(saved(completeSyntheticAnswers))))),
  );
  await renderWithRouter(<MedicalIntakePage />);
  await screen.findByRole("heading", { name: intakeSteps[0]!.title });
  for (let step = 1; step <= intakeSteps.length; step++) {
    const { section, title } = intakeSteps[step - 1]!;
    // Text can commit before React's passive focus effect settles after the async read.
    await waitFor(() => expect(screen.getByRole("heading", { name: title })).toHaveFocus());
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
    if (step < intakeSteps.length)
      fireEvent.click(screen.getByRole("button", { name: "Next section" }));
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
it("uses the current publication declaration in answer review, not the retired catalogue consent", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(view(saved(completeSyntheticAnswers)))),
  );
  await renderWithRouter(<MedicalIntakePage />);
  await screen.findByRole("heading", { name: intakeSteps[0]!.title });
  for (let section = 1; section < 8; section++) {
    fireEvent.click(screen.getByRole("button", { name: "Next section" }));
    await screen.findByRole("heading", { name: intakeSteps[section]!.title });
  }
  fireEvent.click(screen.getByRole("button", { name: "Review answers" }));
  await screen.findByRole("heading", { name: "Review your answers" });
  const declaration = screen.getByText(publication.reviewDeclaration, { exact: true });
  expect(declaration).toBeVisible();
  expect(declaration.tagName).toBe("DT");
  const retired = catalogue.items.find((item) => item.id === "doctor_review_consent")!.prompt;
  expect(screen.queryByText(retired, { exact: true })).not.toBeInTheDocument();
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
  await screen.findByRole("heading", { name: intakeSteps[0]!.title });
  for (let section = 1; section < 8; section++)
    fireEvent.click(screen.getByRole("button", { name: "Next section" }));
  fireEvent.click(screen.getByRole("button", { name: "Review answers" }));
  fireEvent.click(screen.getByRole("button", { name: /^Sex:/ }));
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Sex" })).toHaveFocus());
  fireEvent.click(screen.getByRole("button", { name: /^Full name:/ }));
  await waitFor(() => expect(screen.getByRole("textbox", { name: "Full name" })).toHaveFocus());
});

function draftTransport(onWrite?: (command: Record<string, unknown>) => Promise<void>) {
  let record = saved();
  const writes: Record<string, unknown>[] = [];
  const transport = vi.fn(async (url, init?: RequestInit) => {
    if (url === "/account/session/renew") return new Response(null, { status: 204 });
    const command = JSON.parse(String(init?.body));
    if (command.action === "save") {
      writes.push(command);
      await onWrite?.(command);
      record = { ...saved(command.answers), version: record.version + 1 };
      return Response.json({
        intakeId: id,
        caseId: id,
        version: record.version,
        snapshotId: id,
        state: "draft",
        safetyHold: false,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      });
    }
    return Response.json(view(record));
  });
  vi.stubGlobal("fetch", transport);
  return {
    writes,
    transport,
    get record() {
      return record;
    },
  };
}

it("starts with treatment interests and lets saved clients resume by unanswered fields", async () => {
  draftTransport();
  await renderWithRouter(<MedicalIntakePage />);
  await screen.findByRole("heading", { name: "Treatment interests" });
  expect(screen.queryByRole("textbox", { name: "Full name" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox", { name: "Peptides" }));
  const prompt = catalogue.items.find((item) => item.id === "category_peptides")!.prompt;
  fireEvent.change(screen.getByRole("combobox", { name: prompt }), { target: { value: "none" } });
  fireEvent.click(screen.getByRole("button", { name: "Resume at first unanswered section" }));
  await screen.findByRole("heading", { name: "About you" });
});

it("does not treat implicit form submission or multiline entry as answer review", async () => {
  const fixture = draftTransport();
  await renderWithRouter(<MedicalIntakePage />);
  await openAboutYou();
  const name = screen.getByRole("textbox", { name: "Full name" });
  fireEvent.change(name, { target: { value: "Synthetic typed name" } });
  fireEvent.submit(name.closest("form")!);
  expect(name).toHaveValue("Synthetic typed name");
  expect(screen.queryByRole("heading", { name: "Review your answers" })).not.toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(fixture.writes).toHaveLength(0);
});

it("waits for IME composition to end before autosaving", async () => {
  const fixture = draftTransport();
  await renderWithRouter(<MedicalIntakePage />);
  await openAboutYou();
  const name = screen.getByRole("textbox", { name: "Full name" });
  fireEvent.compositionStart(name);
  fireEvent.change(name, { target: { value: "Synthetic composed answer" } });
  await new Promise((resolve) => setTimeout(resolve, 2700));
  expect(fixture.writes).toHaveLength(0);
  fireEvent.compositionEnd(name);
  await screen.findByText("Draft saved.", {}, { timeout: 4000 });
  expect(fixture.record.answers).toMatchObject({ full_name: "Synthetic composed answer" });
}, 10000);

it("keeps typing and navigation available during autosave and saves subsequent edits separately", async () => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const fixture = draftTransport(async () => {
    if (fixture.writes.length === 1) await held;
  });
  await renderWithRouter(<MedicalIntakePage />);
  await openAboutYou();
  const name = screen.getByRole("textbox", { name: "Full name" });
  name.focus();
  fireEvent.change(name, { target: { value: "Synthetic first edit" } });
  await waitFor(() => expect(fixture.writes).toHaveLength(1), { timeout: 4000 });
  expect(name).toHaveFocus();
  expect(name).not.toBeDisabled();
  fireEvent.change(name, { target: { value: "Synthetic later edit" } });
  expect(screen.getByRole("button", { name: "Next section" })).not.toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Next section" }));
  await screen.findByRole("heading", { name: "Your health today" });
  release();
  await waitFor(() => expect(fixture.writes).toHaveLength(2), { timeout: 4000 });
  await screen.findByText("Draft saved.");
  expect(fixture.record.answers).toMatchObject({ full_name: "Synthetic later edit" });
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByRole("textbox", { name: "Full name" })).toHaveValue("Synthetic later edit");
}, 12000);

it("retries an unconfirmed write with the same payload and idempotency key", async () => {
  let first = true;
  const fixture = draftTransport(async () => {
    if (first) {
      first = false;
      throw Error("Synthetic response loss");
    }
  });
  await renderWithRouter(<MedicalIntakePage />);
  await openAboutYou();
  fireEvent.change(screen.getByRole("textbox", { name: "Full name" }), {
    target: { value: "Synthetic retry" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await screen.findByText(
    "The save could not be confirmed. Your changes are not recorded until a save succeeds.",
  );
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await screen.findByText("Draft saved.");
  expect(fixture.writes).toHaveLength(2);
  expect(fixture.writes[0]).toEqual(fixture.writes[1]);
});

it("does not silently overwrite a concurrently changed saved draft on tab return", async () => {
  let version = 1;
  const fetcher = vi.fn(async (url) =>
    url === "/account/session/renew"
      ? new Response(null, { status: 204 })
      : Response.json(view({ ...saved({ full_name: "Synthetic server name" }), version })),
  );
  vi.stubGlobal("fetch", fetcher);
  await renderWithRouter(<MedicalIntakePage />);
  await openAboutYou();
  fireEvent.change(screen.getByRole("textbox", { name: "Full name" }), {
    target: { value: "Synthetic unsaved name" },
  });
  const hidden = vi.spyOn(document, "hidden", "get");
  hidden.mockReturnValue(true);
  fireEvent(document, new Event("visibilitychange"));
  version = 2;
  hidden.mockReturnValue(false);
  fireEvent(document, new Event("visibilitychange"));
  await screen.findByRole("button", { name: "Load latest saved draft" });
  expect(screen.getByRole("textbox", { name: "Full name" })).toHaveValue("Synthetic unsaved name");
  expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Load latest saved draft" }));
  await openAboutYou();
  expect(screen.getByRole("textbox", { name: "Full name" })).toHaveValue("Synthetic server name");
});

it("clears private fields when the authoritative read deadline expires", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ ...view(saved()), expiresAt: Date.now() + 500 })),
  );
  await renderWithRouter(<MedicalIntakePage />);
  await openAboutYou();
  fireEvent.change(screen.getByRole("textbox", { name: "Full name" }), {
    target: { value: "Synthetic private edit" },
  });
  await screen.findByRole("link", { name: "Sign in to resume your saved questionnaire" });
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(screen.queryByDisplayValue("Synthetic private edit")).not.toBeInTheDocument();
});

it("reconciles a committed save after response loss with the original key and version", async () => {
  let record = saved();
  const commands: Record<string, unknown>[] = [];
  let receipt: Record<string, unknown> | null = null;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, init?: RequestInit) => {
      if (url === "/account/session/renew") return new Response(null, { status: 204 });
      const command = JSON.parse(String(init?.body));
      if (command.action === "save") {
        commands.push(command);
        if (!receipt) {
          record = { ...saved(command.answers), version: 2 };
          receipt = {
            intakeId: id,
            caseId: id,
            version: 2,
            snapshotId: id,
            state: "draft",
            safetyHold: false,
            expiresAt: new Date(Date.now() + 60000).toISOString(),
          };
          return new Response(null, { status: 503 });
        }
        return Response.json(receipt);
      }
      return Response.json(view(record));
    }),
  );
  await renderWithRouter(<MedicalIntakePage />);
  await openAboutYou();
  fireEvent.change(screen.getByRole("textbox", { name: "Full name" }), {
    target: { value: "Synthetic committed answer" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await screen.findByText(
    "The save could not be confirmed. Your changes are not recorded until a save succeeds.",
  );
  expect(screen.queryByText("Draft saved.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await screen.findByText("Draft saved.");
  expect(commands[0]).toEqual(commands[1]);
  expect(record.version).toBe(2);
});

it("quarantines a save conflict instead of retrying new edits against a stale version", async () => {
  const commands: Record<string, unknown>[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, init?: RequestInit) => {
      if (url === "/account/session/renew") return new Response(null, { status: 204 });
      const command = JSON.parse(String(init?.body));
      if (command.action === "save") {
        commands.push(command);
        return new Response(null, { status: 409 });
      }
      return Response.json(view(saved()));
    }),
  );
  await renderWithRouter(<MedicalIntakePage />);
  await openAboutYou();
  const name = screen.getByRole("textbox", { name: "Full name" });
  fireEvent.change(name, { target: { value: "Synthetic conflicting edit" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await screen.findByRole("button", { name: "Load latest saved draft" });
  fireEvent.change(name, { target: { value: "Synthetic later edit" } });
  await new Promise((resolve) => setTimeout(resolve, 2700));
  expect(commands).toHaveLength(1);
  expect(name).toHaveValue("Synthetic later edit");
  expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
});

it("clears old answers rather than unmasking them when a different account record is returned", async () => {
  let differentAccount = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) =>
      url === "/account/session/renew"
        ? new Response(null, { status: 204 })
        : Response.json(
            view(
              differentAccount
                ? { ...saved(), id: "d3000000-0000-4000-8000-000000000002" }
                : saved(),
            ),
          ),
    ),
  );
  await renderWithRouter(<MedicalIntakePage />);
  await openAboutYou();
  fireEvent.change(screen.getByRole("textbox", { name: "Full name" }), {
    target: { value: "Synthetic old account edit" },
  });
  const hidden = vi.spyOn(document, "hidden", "get");
  hidden.mockReturnValue(true);
  fireEvent(document, new Event("visibilitychange"));
  differentAccount = true;
  hidden.mockReturnValue(false);
  fireEvent(document, new Event("visibilitychange"));
  await openAboutYou();
  expect(screen.getByRole("textbox", { name: "Full name" })).toHaveValue("");
  expect(screen.queryByDisplayValue("Synthetic old account edit")).not.toBeInTheDocument();
});

it("restores only saved answers after browser pagehide/pageshow", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, init?: RequestInit) => {
      expect(init?.signal?.aborted).not.toBe(true);
      return Response.json(view(saved({ full_name: "Synthetic saved answer" })));
    }),
  );
  await renderWithRouter(<MedicalIntakePage />);
  await openAboutYou();
  fireEvent.change(screen.getByRole("textbox", { name: "Full name" }), {
    target: { value: "Synthetic unsaved answer" },
  });
  fireEvent(window, new Event("pagehide"));
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  fireEvent(window, new Event("pageshow"));
  await openAboutYou();
  expect(screen.getByRole("textbox", { name: "Full name" })).toHaveValue("Synthetic saved answer");
});

it("does not unmask a late successful session check after the tab is hidden again", async () => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => {
      if (url === "/account/session/renew") {
        await held;
        return new Response(null, { status: 204 });
      }
      return Response.json(view(saved()));
    }),
  );
  await renderWithRouter(<MedicalIntakePage />);
  await openAboutYou();
  const hidden = vi.spyOn(document, "hidden", "get");
  hidden.mockReturnValue(true);
  fireEvent(document, new Event("visibilitychange"));
  hidden.mockReturnValue(false);
  fireEvent(document, new Event("visibilitychange"));
  hidden.mockReturnValue(true);
  fireEvent(document, new Event("visibilitychange"));
  release();
  await waitFor(() => expect(screen.queryByRole("textbox")).not.toBeInTheDocument());
  hidden.mockReturnValue(false);
  fireEvent(document, new Event("visibilitychange"));
  await screen.findByRole("textbox", { name: "Full name" });
});
