import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PaymentStatusPanel } from "./PaymentStatusPanel";
import { paymentStatusFixture } from "@/test/payment-status-fixture";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("shows verified facts separately from clinical and delivery status, then clears on denial", async () => {
  const fixture = paymentStatusFixture();
  fixture.payments[0]!.refundedMinor = 20000;
  fixture.payments[0]!.requiresReview = true;
  fixture.payments[0]!.dispute = true;
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json(fixture))
    .mockResolvedValueOnce(new Response(null, { status: 403 }));
  vi.stubGlobal("fetch", fetcher);
  render(<PaymentStatusPanel />);
  fireEvent.click(screen.getByRole("button", { name: "Refresh payment status" }));
  await screen.findByText(/— Payment confirmed/);
  expect(screen.getByText(/Refund evidence received/)).toBeInTheDocument();
  expect(screen.getByText(/They do not confirm clinical approval/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Refresh payment status" }));
  await screen.findByText(/Payment status is unavailable/);
  expect(screen.queryByText(/— Payment confirmed/)).not.toBeInTheDocument();
  expect(localStorage.length).toBe(0);
});
it("clears stale facts on expiry and sends scoped staff pagination without URL state", async () => {
  vi.useFakeTimers();
  const fixture = paymentStatusFixture();
  fixture.expiresAt = new Date(Date.now() + 1000).toISOString();
  fixture.nextCursor = {
    id: fixture.payments[0]!.reference,
    createdAt: fixture.payments[0]!.createdAt,
  };
  const fetcher = vi.fn().mockResolvedValue(Response.json(fixture));
  vi.stubGlobal("fetch", fetcher);
  render(<PaymentStatusPanel caseId={fixture.payments[0]!.reference} />);
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Refresh payment status" })),
  );
  expect(screen.getByText(/— Payment confirmed/)).toBeInTheDocument();
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Next payment records" })),
  );
  expect(fetcher.mock.calls[1]![0]).toBe("/staff/payments/read");
  expect(JSON.parse(fetcher.mock.calls[1]![1].body)).toEqual({
    cursor: fixture.nextCursor,
    caseId: fixture.payments[0]!.reference,
  });
  await act(async () => vi.advanceTimersByTime(1001));
  expect(screen.queryByText(/— Payment confirmed/)).not.toBeInTheDocument();
});
it("aborts outstanding reads when the private view unmounts", async () => {
  const fetcher = vi.fn<typeof fetch>(() => new Promise(() => {}));
  vi.stubGlobal("fetch", fetcher);
  const view = render(<PaymentStatusPanel />);
  fireEvent.click(screen.getByRole("button", { name: "Refresh payment status" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
  view.unmount();
  expect(fetcher.mock.calls[0]![1]!.signal!.aborted).toBe(true);
});
it("automatically checks payment without stealing focus and invalidates its parent on expiry", async () => {
  vi.useFakeTimers();
  const fixture = paymentStatusFixture();
  fixture.expiresAt = new Date(Date.now() + 1000).toISOString();
  const changed = vi.fn();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(fixture)));
  render(
    <>
      <button autoFocus>Keep focus</button>
      <PaymentStatusPanel autoLoad onChange={changed} />
    </>,
  );
  await act(async () => {});
  expect(screen.getByText(/— Payment confirmed/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Keep focus" })).toHaveFocus();
  expect(changed).toHaveBeenLastCalledWith(fixture);
  await act(async () => vi.advanceTimersByTime(1001));
  expect(changed).toHaveBeenLastCalledWith(null);
  expect(screen.queryByText(/No further payment is needed/)).not.toBeInTheDocument();
});
