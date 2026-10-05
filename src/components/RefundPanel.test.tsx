import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RefundPanel } from "./RefundPanel";
const id = "a4700000-0000-4000-8000-000000000001";
const view = () => ({
  requestState: "not_requested",
  refunds: [],
  expiresAt: new Date(Date.now() + 60000).toISOString(),
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("requires explicit request confirmation and never treats request acceptance as refunded", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json(view()))
    .mockResolvedValueOnce(Response.json({ ...view(), requestState: "requested" }));
  vi.stubGlobal("fetch", fetcher);
  render(<RefundPanel offerId={id} />);
  fireEvent.click(screen.getByRole("button", { name: "Check cancellation / refund request" }));
  await screen.findByText("Request: not requested");
  expect(
    screen.getByRole("button", { name: "Submit cancellation / refund request" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Submit cancellation / refund request" }));
  await screen.findByText("Request: requested");
  expect(JSON.parse(fetcher.mock.calls[1]![1].body)).toMatchObject({
    action: "request",
    offerId: id,
  });
  expect(screen.queryByText(/refund confirmed/i)).not.toBeInTheDocument();
  expect(localStorage.length).toBe(0);
});
it("clears private facts on expiry, denial and offer remount", async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({ ...view(), expiresAt: new Date(Date.now() + 1000).toISOString() }),
    );
  vi.stubGlobal("fetch", fetcher);
  const page = render(<RefundPanel offerId={id} />);
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Check cancellation / refund request" })),
  );
  await act(async () => vi.advanceTimersByTime(1001));
  expect(screen.queryByText("Request: not requested")).not.toBeInTheDocument();
  page.rerender(<RefundPanel offerId={crypto.randomUUID()} />);
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
});
