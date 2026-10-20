import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AccountDocumentsPage } from "@/components/AccountDocumentsPage";
import { renderWithRouter } from "@/test/render-with-router";
const docs = {
  verifiedEmail: "review@example.invalid",
  documents: [
    {
      publicationId: "f9200000-0000-4000-8000-000000000001",
      instrumentId: "pilot-account-terms",
      version: "1.2",
      locale: "en-ZA",
      contentHash: "a".repeat(64),
      body: "Synthetic new-company account terms",
      effectiveAt: "2026-10-13T00:00:00Z",
    },
    {
      publicationId: "f9200000-0000-4000-8000-000000000002",
      instrumentId: "pilot-privacy-notice",
      version: "1.2",
      locale: "en-ZA",
      contentHash: "b".repeat(64),
      body: "Synthetic new-company privacy",
      effectiveAt: "2026-10-13T00:00:00Z",
    },
  ],
};
afterEach(() => vi.unstubAllGlobals());
it("requires two explicit current actions and continues without another code", async () => {
  const calls: URLSearchParams[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, init?: RequestInit) => {
      if (init?.method === "POST") {
        calls.push(new URLSearchParams(String(init.body)));
        return new Response(null, { status: 204 });
      }
      return Response.json(docs);
    }),
  );
  await renderWithRouter(<AccountDocumentsPage />);
  await screen.findByText("Verified email: review@example.invalid");
  expect(screen.getByRole("button", { name: "Save and continue" })).toBeDisabled();
  fireEvent.click(screen.getAllByRole("checkbox")[0]);
  expect(screen.getByRole("button", { name: "Save and continue" })).toBeDisabled();
  fireEvent.click(screen.getAllByRole("checkbox")[1]);
  fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
  await screen.findByRole("link", { name: "Open your private account" });
  expect(calls).toHaveLength(1);
  expect(calls[0].get("termsHash")).toBe("a".repeat(64));
  expect(calls[0].get("privacyHash")).toBe("b".repeat(64));
  expect(screen.getByRole("status")).toHaveTextContent("no additional email code");
});
it("preserves the command key on uncertain retry without claiming success", async () => {
  const calls: URLSearchParams[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, init?: RequestInit) => {
      if (init?.method === "POST") {
        calls.push(new URLSearchParams(String(init.body)));
        return new Response(null, { status: 503 });
      }
      return Response.json(docs);
    }),
  );
  await renderWithRouter(<AccountDocumentsPage />);
  await screen.findByText("Verified email: review@example.invalid");
  for (const box of screen.getAllByRole("checkbox")) fireEvent.click(box);
  fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("could not confirm"));
  fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
  await waitFor(() => expect(calls).toHaveLength(2));
  expect(calls[0].get("requestKey")).toBe(calls[1].get("requestKey"));
  expect(screen.queryByRole("link", { name: "Open your private account" })).not.toBeInTheDocument();
});
it("shows no document actions when review access is unavailable", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(null, { status: 401 })),
  );
  await renderWithRouter(<AccountDocumentsPage />);
  await screen.findByText(/Document review is unavailable/);
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
});
