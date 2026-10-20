import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ProductFulfilmentPanel } from "./ProductFulfilmentPanel";
import {
  productFulfilmentFixture,
  fulfilmentFixtureId as id,
} from "@/test/product-fulfilment-fixture";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("records only an attested exact version and opaque reference", async () => {
  const fetcher = vi.fn().mockImplementation((_url, options) =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          ...productFulfilmentFixture(),
          ...(JSON.parse(options.body).action === "record"
            ? { version: 1, stage: "provider_ordered", nextEvent: "pharmacy_released" }
            : {}),
        }),
      ),
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  render(<ProductFulfilmentPanel caseId={id} />);
  fireEvent.click(screen.getByRole("button", { name: "Check fulfilment progress" }));
  await screen.findByText(/Record version 0/);
  const advance = screen.getByRole("button", { name: "Record provider ordered" });
  expect(advance).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Private evidence reference"), {
    target: { value: "not-a-reference" },
  });
  fireEvent.click(screen.getByRole("checkbox"));
  expect(advance).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Private evidence reference"), { target: { value: id } });
  fireEvent.click(advance);
  await screen.findByText(/Evidence recorded/);
  const request = fetcher.mock.calls[1]![1];
  expect(JSON.parse(request.body)).toEqual({
    action: "record",
    caseId: id,
    offerId: id,
    expectedVersion: 0,
    event: "provider_ordered",
    evidenceReference: id,
    requestKey: request.headers["Idempotency-Key"],
  });
  expect(screen.getByRole("checkbox")).not.toBeChecked();
  expect(screen.getByLabelText("Private evidence reference")).toHaveValue("");
  expect(screen.getByText(/Wait for the pharmacy's actual release evidence/)).toBeVisible();
  expect(screen.getByRole("link", { name: "Open assigned support work" })).toHaveAttribute(
    "href",
    "/staff/support",
  );
});
it("shows only coarse client progress without staff controls", async () => {
  const f = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        progress: "dispatched",
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      }),
    ),
  );
  vi.stubGlobal("fetch", f);
  render(<ProductFulfilmentPanel />);
  fireEvent.click(screen.getByRole("button", { name: "Check fulfilment progress" }));
  await screen.findByText("Progress: dispatched.");
  expect(f.mock.calls[0]![0]).toBe("/portal/order/fulfilment");
  expect(JSON.parse(f.mock.calls[0]![1].body)).toEqual({});
  expect(screen.queryByLabelText("Private evidence reference")).toBeNull();
  expect(screen.getByText(/Your order is with the courier/)).toBeVisible();
  expect(screen.getByRole("link", { name: "Get secure order help" })).toHaveAttribute(
    "href",
    "/portal/support",
  );
});
it("clears expired private state", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ...productFulfilmentFixture(),
          expiresAt: new Date(Date.now() + 60000).toISOString(),
        }),
      ),
    ),
  );
  render(<ProductFulfilmentPanel caseId={id} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Check fulfilment progress" }));
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60001);
  });
  expect(screen.queryByText(/Record version/)).toBeNull();
  expect(screen.queryByText(/Next step:/)).toBeNull();
  expect(screen.getByRole("status")).toHaveTextContent("expired");
});
it("clears a changed case and ignores late results", async () => {
  let resolve!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(
      () =>
        new Promise<Response>((r) => {
          resolve = r;
        }),
    ),
  );
  const rendered = render(<ProductFulfilmentPanel caseId={id} />);
  fireEvent.click(screen.getByRole("button", { name: "Check fulfilment progress" }));
  rendered.rerender(<ProductFulfilmentPanel caseId="15700000-0000-4000-8000-000000000002" />);
  await act(async () => {
    resolve(new Response(JSON.stringify(productFulfilmentFixture())));
  });
  expect(screen.queryByText(/Record version/)).toBeNull();
});
it("never retries an uncertain mutation or exposes the private response", async () => {
  const f = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(productFulfilmentFixture())))
    .mockResolvedValue(new Response("private address", { status: 503 }));
  vi.stubGlobal("fetch", f);
  render(<ProductFulfilmentPanel caseId={id} />);
  fireEvent.click(screen.getByRole("button", { name: "Check fulfilment progress" }));
  await screen.findByText(/Record version 0/);
  fireEvent.change(screen.getByLabelText("Private evidence reference"), { target: { value: id } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Record provider ordered" }));
  await screen.findByText(/result is uncertain/);
  expect(f).toHaveBeenCalledTimes(2);
  expect(screen.queryByText("private address")).toBeNull();
  expect(screen.queryByLabelText("Private evidence reference")).toBeNull();
});
it("keeps load errors distinct from access failure and clears stale guidance", async () => {
  const f = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(productFulfilmentFixture())))
    .mockResolvedValueOnce(new Response(null, { status: 403 }));
  vi.stubGlobal("fetch", f);
  render(<ProductFulfilmentPanel caseId={id} />);
  const refresh = screen.getByRole("button", { name: "Check fulfilment progress" });
  expect(refresh).not.toHaveFocus();
  fireEvent.click(refresh);
  await screen.findByText(/Check the exact paid quote/);
  fireEvent.click(refresh);
  await screen.findByText(/Sign in again/);
  expect(screen.queryByText(/Next step:/)).toBeNull();
  expect(f).toHaveBeenCalledTimes(2);
});
