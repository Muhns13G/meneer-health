import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { StaffProductQuotePanel } from "./StaffProductQuotePanel";
import { staffQuoteFixture, quoteFixtureId as id } from "@/test/staff-product-quote-fixture";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("clears the private projection at its server deadline", async () => {
  vi.useFakeTimers();
  const view = { ...staffQuoteFixture(), expiresAt: new Date(Date.now() + 60_000).toISOString() };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(view))));
  render(<StaffProductQuotePanel caseId={id} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Load \/ reconcile/ }));
  });
  expect(screen.getByLabelText("Quantity: Synthetic item")).toBeVisible();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60_001);
  });
  expect(screen.queryByLabelText("Quantity: Synthetic item")).toBeNull();
  expect(screen.getByRole("status")).toHaveTextContent("Access expired");
});
it("prepares exact quantities and references without asserting approval/payment", async () => {
  const f = vi.fn().mockImplementation((_url, options) => {
    const body = JSON.parse(options.body);
    return Promise.resolve(
      new Response(
        JSON.stringify({
          ...staffQuoteFixture(),
          draft:
            body.action === "prepare_draft"
              ? {
                  draftId: id,
                  version: 1,
                  items: [
                    {
                      productId: id,
                      description: "Synthetic item",
                      quantity: 2,
                      unitAmountMinor: 150000,
                    },
                  ],
                  productSubtotalMinor: 300000,
                  deliveryMinor: 10000,
                  totalBeforeCreditMinor: 310000,
                }
              : null,
        }),
        { status: 200 },
      ),
    );
  });
  vi.stubGlobal("fetch", f);
  render(<StaffProductQuotePanel caseId={id} />);
  fireEvent.click(screen.getByRole("button", { name: /Load \/ reconcile/ }));
  await screen.findByLabelText("Quantity: Synthetic item");
  fireEvent.change(screen.getByLabelText("Quantity: Synthetic item"), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText("Approved delivery/address reference"), {
    target: { value: id },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save non-payable draft" }));
  await screen.findByText(/Draft saved/);
  const input = JSON.parse(f.mock.calls[1]![1].body);
  expect(input).toEqual({
    action: "prepare_draft",
    caseId: id,
    catalogueId: id,
    expectedCaseVersion: 1,
    expectedDraftVersion: 0,
    deliveryQuoteId: id,
    items: [{ productId: id, quantity: 2 }],
    requestKey: expect.any(String),
  });
  expect(input.requestKey).toBe(f.mock.calls[1]![1].headers["Idempotency-Key"]);
});
it("hides private data on pagehide and rejects late responses", async () => {
  let resolve!: (r: Response) => void;
  vi.stubGlobal(
    "fetch",
    () =>
      new Promise<Response>((r) => {
        resolve = r;
      }),
  );
  render(<StaffProductQuotePanel caseId={id} />);
  fireEvent.click(screen.getByRole("button", { name: /Load \/ reconcile/ }));
  fireEvent(window, new Event("pagehide"));
  resolve(new Response(JSON.stringify(staffQuoteFixture()), { status: 200 }));
  await waitFor(() => expect(screen.queryByLabelText("Quantity: Synthetic item")).toBeNull());
});
it("clears uncertainty and requires reconciliation, never provider error text", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("secret-provider-detail", { status: 503 })),
  );
  render(<StaffProductQuotePanel caseId={id} />);
  fireEvent.click(screen.getByRole("button", { name: /Load \/ reconcile/ }));
  await screen.findByText(/result is uncertain/);
  expect(screen.queryByText("secret-provider-detail")).toBeNull();
});
