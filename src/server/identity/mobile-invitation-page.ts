import "@tanstack/react-start/server-only";

// A deliberately standalone document: the bearer is stripped synchronously before parsing
// the form, and no marketing shell, router, third-party assets or telemetry runs here.
const controller = String.raw`
(() => {
  let bearer = location.hash.slice(1);
  history.replaceState(null, "", location.pathname);
  if (!/^[A-Za-z0-9_-]{43}$/.test(bearer)) bearer = "";
  let requestKey = crypto.randomUUID();
  let busy = false;
  let timer;
  let stopped = false;
  document.addEventListener("DOMContentLoaded", () => {
    const status = document.getElementById("status");
    const email = document.getElementById("email");
    const form = document.getElementById("email-form");
    const continueButton = document.getElementById("continue");
    const declineButton = document.getElementById("decline");
    const confirmButton = document.getElementById("confirm-decline");
    const controls = [...document.querySelectorAll("button, input")];
    const say = (text) => { status.textContent = text; status.focus(); };
    const stop = (text) => {
      stopped = true; bearer = ""; requestKey = ""; email.value = "";
      clearTimeout(timer); form.hidden = true;
      controls.forEach((control) => { control.disabled = true; });
      say(text);
    };
    async function post(action, fields) {
      if (busy || stopped) return null;
      busy = true; controls.forEach((control) => { control.disabled = true; });
      form.setAttribute("aria-busy", "true"); say("Checking your invitation…");
      const abort = new AbortController();
      const timeout = setTimeout(() => abort.abort(), 12000);
      try {
        const response = await fetch("/mobile-invitation/" + action, {
          method: "POST", body: new URLSearchParams(fields),
          credentials: "same-origin", cache: "no-store", redirect: "error", signal: abort.signal,
        });
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (stopped) return null;
        if (result.status === "unavailable") {
          stop("This invitation cannot be used right now. It may be expired, replaced or already in use. Contact support for help.");
          return null;
        }
        return result;
      } catch {
        if (!stopped) say("We could not confirm that request. Try again with the same details. Do not assume it was saved.");
        return null;
      } finally {
        clearTimeout(timeout); busy = false; form.setAttribute("aria-busy", "false");
        if (!stopped) controls.forEach((control) => { control.disabled = false; });
      }
    }
    function showClaim(result) {
      const expiry = Date.parse(result.expiresAt);
      if (!Number.isFinite(expiry) || expiry <= Date.now()) {
        stop("Your claim has expired. Reopen the original invitation or contact support."); return;
      }
      bearer = ""; continueButton.hidden = true;
      confirmButton.hidden = true;
      clearTimeout(timer);
      timer = setTimeout(() => stop("Your claim has expired. Reopen the original invitation or contact support."), Math.min(expiry - Date.now(), 900000));
      form.hidden = result.emailBound;
      if (result.emailBound) {
        email.value = "";
        say("Your email is saved for this invitation. Email verification and registration are not enabled yet. No account has been created.");
      } else {
        say("Invitation checked. Enter your own email address. This claim lasts up to 15 minutes; the invitation remains valid for at most 48 hours from issue.");
        email.focus();
      }
    }
    continueButton.addEventListener("click", async () => {
      const result = await post(bearer ? "redeem" : "read", bearer ? { token: bearer, requestKey } : {});
      if (result) showClaim(result);
    });
    declineButton.addEventListener("click", () => {
      confirmButton.hidden = false;
      say("Declining cancels this invitation. No account will be created. Confirm only if this invitation is not for you or you do not want it.");
      confirmButton.focus();
    });
    confirmButton.addEventListener("click", async () => {
      const result = await post("decline", bearer ? { token: bearer, requestKey } : {});
      if (result) stop("Your invitation has been declined. No account was created. Contact support if this was a mistake.");
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const result = await post("bind", { email: email.value });
      if (result) showClaim(result);
    });
    window.addEventListener("pagehide", () => stop("Reopen the invitation to continue."));
    window.addEventListener("pageshow", (event) => { if (event.persisted) stop("Reopen the invitation to continue."); });
  }, { once: true });
})();`;

export function mobileInvitationDocument(): Response {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  return new Response(
    `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><meta name="referrer" content="no-referrer">
<title>Your pilot invitation — Meneer Health</title>
<script nonce="${nonce}">${controller}</script>
<style nonce="${nonce}">body{margin:0;background:#171918;color:#f5f2e8;font:1.125rem/1.6 system-ui,sans-serif}main{max-width:36rem;margin:auto;padding:2rem 1rem}h1{line-height:1.2}input{display:block;box-sizing:border-box;width:100%;padding:.8rem;font:inherit;margin:.5rem 0 1rem}button{font:inherit;cursor:pointer;min-height:44px;padding:.6rem 1rem;margin:.5rem .5rem .5rem 0}a{color:#e8cc89}button:focus-visible,input:focus-visible,a:focus-visible,[tabindex]:focus{outline:3px solid #e8cc89;outline-offset:4px}[hidden]{display:none!important}</style>
</head><body><main><h1>Your pilot invitation</h1>
<p>Continue only if Meneer Health invited you. Do not forward this link. Access to the link is not independent proof of your identity.</p>
<p id="status" role="status" aria-live="polite" tabindex="-1">Opening this page does not accept or use your invitation. Choose Continue to check it, or decline below.</p>
<button id="continue" type="button">Continue</button><button id="decline" type="button">Decline invitation</button>
<button id="confirm-decline" type="button" hidden>Confirm decline</button>
<form id="email-form" hidden><label for="email">Your email address</label>
<input id="email" name="email" type="email" autocomplete="email" maxlength="254" required aria-describedby="email-help">
<p id="email-help">Use your own mailbox. Once saved it cannot be changed here; ask support to revoke and reissue the invitation if it is wrong. No marketing consent or clinical information is collected.</p>
<button type="submit">Save email</button></form>
<noscript><p>JavaScript is required for this secure invitation step. No account has been created. Contact support for help.</p></noscript>
<p>Help: <a href="mailto:support@meneerhealth.co.za">support@meneerhealth.co.za</a></p>
</main></body></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store, max-age=0",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow",
        "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'`,
      },
    },
  );
}
