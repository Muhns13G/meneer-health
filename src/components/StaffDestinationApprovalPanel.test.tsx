import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { StaffDestinationApprovalPanel } from "./StaffDestinationApprovalPanel";

afterEach(cleanup);
const id = "a1000000-0000-4000-8000-000000000001";

it("submits only opaque approval authority, never a browser-selected URL", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ destinationId: id }), { status: 200 }));
  vi.stubGlobal("fetch", fetcher);
  render(<StaffDestinationApprovalPanel />);
  fireEvent.change(screen.getByLabelText("Independent approval reference"), {
    target: { value: id },
  });
  fireEvent.submit(screen.getByRole("button").closest("form")!);
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("approval recorded"));
  expect([...fetcher.mock.calls[0][1].body.keys()].sort()).toEqual([
    "approvalReference",
    "requestKey",
  ]);
});

it("does not treat a rejected approval as success", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
  render(<StaffDestinationApprovalPanel />);
  fireEvent.change(screen.getByLabelText("Independent approval reference"), {
    target: { value: id },
  });
  fireEvent.submit(screen.getByRole("button").closest("form")!);
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("could not be confirmed"),
  );
});
