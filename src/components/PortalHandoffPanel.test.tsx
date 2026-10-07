import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PortalHandoffPanel } from "./PortalHandoffPanel";
it("requests the same opaque issuance key without putting the destination in DOM or storage", async () => {
  const navigate = vi.fn();
  const fetcher = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ url: "https://protocols.example.invalid/intake/synthetic" }), {
      status: 200,
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  const { container } = render(<PortalHandoffPanel navigate={navigate} />);
  fireEvent.click(screen.getByRole("button", { name: "Continue to private intake" }));
  await waitFor(() =>
    expect(navigate).toHaveBeenCalledWith("https://protocols.example.invalid/intake/synthetic"),
  );
  expect(container.innerHTML).not.toContain("protocols.example.invalid");
  const request = fetcher.mock.calls[0][1];
  expect([...request.body.keys()]).toEqual(["requestKey"]);
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
});
it("denies unready intake without navigation or a false acknowledgement", async () => {
  const navigate = vi.fn();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 412 })));
  render(<PortalHandoffPanel navigate={navigate} />);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("not ready yet"));
  expect(navigate).not.toHaveBeenCalled();
});
it("does not navigate on malformed/private response expansion", async () => {
  const navigate = vi.fn();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          url: "https://protocols.example.invalid/intake/synthetic",
          clinical: "forbidden",
        }),
        { status: 200 },
      ),
    ),
  );
  render(<PortalHandoffPanel navigate={navigate} />);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("could not be confirmed"),
  );
  expect(navigate).not.toHaveBeenCalled();
});
