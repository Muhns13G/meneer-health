import { afterEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { SupportPanel } from "./SupportPanel";
const view = {
  outcome: "view",
  routes: [
    { purpose: "privacy", available: true },
    { purpose: "complaint", available: false },
    { purpose: "clinical", available: false },
  ],
  requests: [],
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("requires verified availability and never asks for sensitive free text", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json(view));
  vi.stubGlobal("fetch", fetcher);
  render(<SupportPanel onInvalidate={vi.fn()} />);
  const submit = screen.getByRole("button", { name: "Request secure follow-up" });
  expect(submit).toBeDisabled();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Refresh support availability and status" }));
  await waitFor(() => expect(submit).toBeEnabled());
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "clinical" } });
  expect(submit).toBeDisabled();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("keeps emergency guidance out of the asynchronous send path", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  render(<SupportPanel onInvalidate={vi.fn()} />);
  fireEvent.click(screen.getByRole("checkbox"));
  expect(screen.getByRole("alert")).toHaveTextContent("112, 10177");
  expect(screen.getByRole("button", { name: "Request secure follow-up" })).toBeDisabled();
  expect(fetcher).not.toHaveBeenCalled();
});
it("shows a committed receipt without claiming human acknowledgement", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json(view))
    .mockResolvedValueOnce(
      Response.json({ outcome: "received", reference: "f1300000-0000-4000-8000-000000000001" }),
    );
  vi.stubGlobal("fetch", fetcher);
  render(<SupportPanel onInvalidate={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Refresh support availability and status" }));
  const submit = screen.getByRole("button", { name: "Request secure follow-up" });
  await waitFor(() => expect(submit).toBeEnabled());
  fireEvent.click(submit);
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("not human acknowledgement"),
  );
  const body = JSON.parse(fetcher.mock.calls[1]![1].body);
  expect(Object.keys(body).sort()).toEqual(["action", "purpose", "requestKey", "urgent"]);
  expect(fetcher.mock.calls[1]![1].headers["Idempotency-Key"]).toBe(body.requestKey);
});
it("retains the same request key across uncertain retry and clears cached availability", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json(view))
    .mockRejectedValueOnce(new Error("private failure"))
    .mockResolvedValueOnce(Response.json(view))
    .mockResolvedValueOnce(
      Response.json({ outcome: "received", reference: "f1300000-0000-4000-8000-000000000001" }),
    );
  vi.stubGlobal("fetch", fetcher);
  render(<SupportPanel onInvalidate={vi.fn()} />);
  const refresh = screen.getByRole("button", { name: "Refresh support availability and status" });
  const submit = screen.getByRole("button", { name: "Request secure follow-up" });
  fireEvent.click(refresh);
  await waitFor(() => expect(submit).toBeEnabled());
  fireEvent.click(submit);
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("do not assume"));
  expect(submit).toBeDisabled();
  fireEvent.click(refresh);
  await waitFor(() => expect(submit).toBeEnabled());
  fireEvent.click(submit);
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(4));
  expect(JSON.parse(fetcher.mock.calls[1]![1].body).requestKey).toBe(
    JSON.parse(fetcher.mock.calls[3]![1].body).requestKey,
  );
});
it("invalidates the parent session on authority loss", async () => {
  const invalidate = vi.fn();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
  render(<SupportPanel onInvalidate={invalidate} />);
  fireEvent.click(screen.getByRole("button", { name: "Refresh support availability and status" }));
  await waitFor(() => expect(invalidate).toHaveBeenCalledOnce());
});
