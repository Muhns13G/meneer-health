import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ProductQuoteIssuePanel } from "./ProductQuoteIssuePanel";
import {
  productQuoteIssueFixture,
  quoteIssueFixtureId as id,
} from "@/test/product-quote-issue-fixture";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("issues only the exact displayed draft and retains no approval/amount claims", async () => {
  const f = vi.fn().mockImplementation((_u, options) =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          ...productQuoteIssueFixture(),
          ...(JSON.parse(options.body).action === "issue"
            ? { status: "issued", offerId: id, canIssue: false }
            : {}),
        }),
      ),
    ),
  );
  vi.stubGlobal("fetch", f);
  render(<ProductQuoteIssuePanel caseId={id} />);
  fireEvent.click(screen.getByRole("button", { name: "Check / reconcile quote issue" }));
  await screen.findByText(/Draft version 1/);
  fireEvent.click(screen.getByRole("button", { name: "Issue this exact quote" }));
  await screen.findByText(/Quote issued for exact client review/);
  expect(JSON.parse(f.mock.calls[1]![1].body)).toEqual({
    action: "issue",
    caseId: id,
    draftId: id,
    requestKey: expect.any(String),
  });
  expect(screen.getByRole("button", { name: "Issue this exact quote" })).toBeDisabled();
});
it("clears an expired issue projection", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ...productQuoteIssueFixture(),
          expiresAt: new Date(Date.now() + 60000).toISOString(),
        }),
      ),
    ),
  );
  render(<ProductQuoteIssuePanel caseId={id} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Check \/ reconcile/ }));
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60001);
  });
  expect(screen.queryByText(/Draft version/)).toBeNull();
  expect(screen.getByRole("status")).toHaveTextContent("expired");
});
it("never repeats an uncertain issue automatically", async () => {
  const f = vi.fn().mockResolvedValue(new Response("private provider detail", { status: 503 }));
  vi.stubGlobal("fetch", f);
  render(<ProductQuoteIssuePanel caseId={id} />);
  fireEvent.click(screen.getByRole("button", { name: /Check \/ reconcile/ }));
  await screen.findByText(/result is uncertain/);
  expect(f).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("private provider detail")).toBeNull();
});
it("clears the previous case projection when the assigned case changes", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(productQuoteIssueFixture()))),
  );
  const rendered = render(<ProductQuoteIssuePanel caseId={id} />);
  fireEvent.click(screen.getByRole("button", { name: /Check \/ reconcile/ }));
  await screen.findByText(/Draft version 1/);
  rendered.rerender(<ProductQuoteIssuePanel caseId="15600000-0000-4000-8000-000000000002" />);
  expect(screen.queryByText(/Draft version/)).toBeNull();
});
