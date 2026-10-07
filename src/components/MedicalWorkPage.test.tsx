import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithRouter } from "@/test/render-with-router";
import { MedicalWorkPage } from "./MedicalWorkPage";
const id = "d3000000-0000-4000-8000-000000000001";
afterEach(() => vi.unstubAllGlobals());
it("does not infer medical-answer access from ordinary staff entry", async () => {
  const fetch = vi.fn(async () => new Response(null, { status: 403 }));
  vi.stubGlobal("fetch", fetch);
  await renderWithRouter(<MedicalWorkPage />);
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Load granted work" }));
  await screen.findByText(/Current MFA, role, assignment/);
  expect(
    screen.queryByRole("heading", { name: "Granted snapshot fields" }),
  ).not.toBeInTheDocument();
});
it("clears granted medical fields when the purpose changes or the page exits", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const expiresAt = new Date(Date.now() + 60000).toISOString();
      return new Response(
        JSON.stringify(
          body.action === "list"
            ? {
                items: [
                  {
                    intakeId: id,
                    snapshotId: id,
                    version: 1,
                    state: "submitted",
                    safetyHold: false,
                  },
                ],
                expiresAt,
              }
            : {
                intakeId: id,
                snapshotId: id,
                version: 1,
                state: "submitted",
                safetyHold: false,
                fields: { full_name: "Synthetic protected client" },
                expiresAt,
              },
        ),
      );
    }),
  );
  await renderWithRouter(<MedicalWorkPage />);
  fireEvent.click(screen.getByRole("button", { name: "Load granted work" }));
  fireEvent.click(await screen.findByRole("button", { name: /^Intake / }));
  await screen.findByText("Synthetic protected client");
  fireEvent.change(screen.getByRole("combobox", { name: "Medical purpose" }), {
    target: { value: "medical_safety" },
  });
  expect(screen.queryByText("Synthetic protected client")).not.toBeInTheDocument();
  fireEvent(window, new Event("pagehide"));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("hidden"));
});
