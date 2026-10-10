import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithRouter } from "@/test/render-with-router";
import { ClientProductsPage } from "./ClientProductsPage";
import { clientProductsFixture } from "@/test/client-products-fixture";
afterEach(() => vi.restoreAllMocks());
it("shows private prices without images or checkout and records interest separately", async () => {
  let interested = false;
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
    const command = JSON.parse(String(init?.body));
    if (command.action === "register_interest") {
      expect(Object.keys(command).sort()).toEqual([
        "action",
        "catalogueId",
        "productId",
        "requestKey",
      ]);
      expect(new Headers(init?.headers).get("Idempotency-Key")).toBe(command.requestKey);
      interested = true;
    }
    const view = clientProductsFixture();
    view.items[0]!.interested = interested;
    return new Response(JSON.stringify(view));
  });
  await renderWithRouter(<ClientProductsPage />);
  await screen.findByRole("heading", { name: "Synthetic item one" });
  expect(screen.queryByRole("button", { name: /pay|checkout/i })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Express interest: Synthetic item one" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("interest is recorded"));
  expect(
    screen.getByRole("button", { name: "Interest recorded: Synthetic item one" }),
  ).toBeDisabled();
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("rejects extra private fields and never prints provider errors", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ ...clientProductsFixture(), wholesaleCost: "private" })),
  );
  await renderWithRouter(<ClientProductsPage />);
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("could not be confirmed"),
  );
  expect(screen.queryByText("Synthetic item one")).not.toBeInTheDocument();
  expect(screen.queryByText("private", { exact: true })).not.toBeInTheDocument();
});
it("clears private products on page exit and discards late responses", async () => {
  let resolve: ((v: Response) => void) | undefined;
  vi.spyOn(globalThis, "fetch").mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  await renderWithRouter(<ClientProductsPage />);
  fireEvent(window, new Event("pagehide"));
  resolve?.(new Response(JSON.stringify(clientProductsFixture())));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("hidden"));
  expect(screen.queryByText("Synthetic item one")).not.toBeInTheDocument();
});
