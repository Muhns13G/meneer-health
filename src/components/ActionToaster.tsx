import { Toaster } from "sonner";

export function ActionToaster() {
  // Only supplementary confirmations expire. Errors and required actions stay on the page.
  return (
    <Toaster
      theme="dark"
      position="top-center"
      closeButton
      duration={10000}
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
