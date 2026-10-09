import { Toaster } from "sonner";

export function ActionToaster() {
  return (
    <Toaster
      theme="dark"
      position="top-center"
      closeButton
      duration={6000}
      visibleToasts={2}
      containerAriaLabel="Action notifications"
      mobileOffset={{ top: "24px", left: "16px", right: "16px" }}
      toastOptions={{
        closeButtonAriaLabel: "Dismiss notification",
        style: {
          background: "var(--surface)",
          color: "var(--foreground)",
          border: "1px solid var(--gold)",
          fontFamily: "inherit",
        },
      }}
    />
  );
}
