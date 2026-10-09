import { act, renderHook, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { useActionToast } from "./use-action-toast";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(() => "synthetic-toast"), dismiss: vi.fn() },
}));
afterEach(() => vi.restoreAllMocks());

it("emits only fixed action text and replaces its previous notification", () => {
  const { result } = renderHook(useActionToast);
  expect(toast.success).not.toHaveBeenCalled();
  act(() => result.current.notify("draftSaved"));
  expect(toast.success).toHaveBeenCalledWith("Your draft is saved.");
  act(() => result.current.notify("paymentRefreshed"));
  expect(toast.dismiss).toHaveBeenCalledWith("synthetic-toast");
  expect(toast.success).toHaveBeenLastCalledWith("Payment status refreshed.");
});

it("dismisses on hidden/pagehide/unmount and ignores late notifications", () => {
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  const { result, unmount } = renderHook(useActionToast);
  const notify = result.current.notify;
  act(() => notify("codeRequested"));
  hidden.mockReturnValue(true);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(toast.dismiss).toHaveBeenCalledWith("synthetic-toast");
  act(() => notify("draftSaved"));
  expect(toast.success).toHaveBeenCalledTimes(1);
  hidden.mockReturnValue(false);
  act(() => notify("supportRefreshed"));
  act(() => window.dispatchEvent(new Event("pagehide")));
  expect(toast.dismiss).toHaveBeenCalledTimes(2);
  act(() => notify("draftSaved"));
  unmount();
  expect(toast.dismiss).toHaveBeenCalledTimes(3);
  act(() => notify("draftSaved"));
  expect(toast.success).toHaveBeenCalledTimes(3);
});

it("restores a disabled action's focus without overriding a new focus target", () => {
  let frame: FrameRequestCallback | undefined;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frame = callback;
    return 1;
  });
  render(createElement("button", null, "Save synthetic draft"));
  const button = screen.getByRole("button");
  const { result } = renderHook(useActionToast);
  button.focus();
  act(() => result.current.begin());
  button.blur();
  act(() => result.current.notify("draftSaved"));
  act(() => frame?.(0));
  expect(button).toHaveFocus();
  act(() => result.current.begin());
  render(createElement("input", { "aria-label": "Another control" }));
  const input = screen.getByLabelText("Another control");
  input.focus();
  act(() => result.current.notify("draftSaved"));
  act(() => frame?.(0));
  expect(input).toHaveFocus();
});
