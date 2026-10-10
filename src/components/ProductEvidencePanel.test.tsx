import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ProductEvidencePanel } from "./ProductEvidencePanel";
import { evidenceFixtureId as id, productEvidenceFixture } from "@/test/product-evidence-fixture";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it.each(["operations", "clinician"] as const)(
  "records %s evidence with exact draft and no clinical answers",
  async (role) => {
    const fetcher = vi.fn().mockImplementation((_url, options) => {
      const command = JSON.parse(options.body);
      return Promise.resolve(
        new Response(
          JSON.stringify({
            ...productEvidenceFixture(role),
            evidence:
              command.action === "record"
                ? [
                    {
                      id,
                      kind: command.kind,
                      current: true,
                      canRevoke: true,
                      expiresAt: command.expiresAt,
                    },
                  ]
                : [],
          }),
        ),
      );
    });
    vi.stubGlobal("fetch", fetcher);
    const target = role === "clinician" ? { intakeId: id } : { caseId: id };
    render(<ProductEvidencePanel target={target} />);
    fireEvent.click(screen.getByRole("button", { name: "Load / reconcile product evidence" }));
    await screen.findByText(/Synthetic item/);
    fireEvent.change(screen.getByLabelText("Private source evidence reference"), {
      target: { value: id },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", {
        name:
          role === "clinician"
            ? "Record exact clinical approval"
            : "Record independent provider evidence",
      }),
    );
    await screen.findByText(/Attributed evidence recorded/);
    const sent = JSON.parse(fetcher.mock.calls[1]![1].body);
    expect(sent).toEqual({
      action: "record",
      target,
      draftId: id,
      kind: role === "clinician" ? "clinical" : "provider_stock",
      evidenceReference: id,
      expiresAt: expect.any(String),
      requestKey: expect.any(String),
    });
    expect(sent.requestKey).toBe(fetcher.mock.calls[1]![1].headers["Idempotency-Key"]);
  },
);
it("draft preparer cannot use independent record controls", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ...productEvidenceFixture(), canRecord: false })),
      ),
  );
  render(<ProductEvidencePanel target={{ caseId: id }} />);
  fireEvent.click(screen.getByRole("button", { name: /Load \/ reconcile/ }));
  await screen.findByText(/draft preparer cannot/);
  expect(
    screen.getByRole("button", { name: "Record independent provider evidence" }),
  ).toBeDisabled();
});
it("clears data and source reference on hide and expiry", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ...productEvidenceFixture(),
          expiresAt: new Date(Date.now() + 60000).toISOString(),
        }),
      ),
    ),
  );
  render(<ProductEvidencePanel target={{ caseId: id }} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Load \/ reconcile/ }));
  });
  expect(screen.getByText(/Synthetic item/)).toBeVisible();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60001);
  });
  expect(screen.queryByText(/Synthetic item/)).toBeNull();
  expect(screen.getByRole("status")).toHaveTextContent("expired");
  fireEvent(window, new Event("pagehide"));
  expect(screen.queryByLabelText("Private source evidence reference")).toBeNull();
});
it("redacts uncertainty and never automatically repeats", async () => {
  const f = vi.fn().mockResolvedValue(new Response("private detail", { status: 503 }));
  vi.stubGlobal("fetch", f);
  render(<ProductEvidencePanel target={{ caseId: id }} />);
  fireEvent.click(screen.getByRole("button", { name: /Load \/ reconcile/ }));
  await screen.findByText(/result is uncertain/);
  expect(f).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("private detail")).toBeNull();
});
