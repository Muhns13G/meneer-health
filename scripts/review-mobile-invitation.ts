import { createServer } from "node:http";
import { mobileInvitationDocument } from "../src/server/identity/mobile-invitation-page";
import { assertLocalMobileEnvironment } from "./lib/sprint14-security";

// Deliberately simulated transport, never Auth/Supabase/Telnyx. Not production acceptance.
assertLocalMobileEnvironment(process.env);
let bound = false;
let expiry = 0;
let rejectCode = false;
const origin = "http://127.0.0.1:8086";
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", origin);
  if (request.headers.host !== "127.0.0.1:8086") {
    response.writeHead(404).end();
    return;
  }
  if (
    request.method === "GET" &&
    ["/mobile-invitation", "/review/expiry", "/review/failed-code"].includes(url.pathname)
  ) {
    bound = false;
    expiry = Date.now() + (url.pathname === "/review/expiry" ? 10000 : 900000);
    rejectCode = url.pathname === "/review/failed-code";
    const document = mobileInvitationDocument();
    response.writeHead(200, Object.fromEntries(document.headers));
    response.end(
      (await document.text()).replace(
        "<main>",
        "<main><p>LOCAL SYNTHETIC REVIEW: no messages, accounts or provider verification. Test code: 123456.</p>",
      ),
    );
    return;
  }
  if (request.method === "GET" && url.pathname === "/account/activate") {
    response.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-store" });
    response.end(
      "<html lang='en'><title>Synthetic activation handoff</title><main><h1>Synthetic activation handoff</h1><p>Review finished. No account or session was created.</p></main></html>",
    );
    return;
  }
  const action = url.pathname.replace("/mobile-invitation/", "");
  if (
    request.method !== "POST" ||
    request.headers.origin !== origin ||
    url.search ||
    !["redeem", "read", "bind", "email", "verify", "decline"].includes(action)
  ) {
    response.writeHead(404).end();
    return;
  }
  let body = "";
  for await (const chunk of request) {
    body += chunk.toString();
    if (body.length > 768) {
      response.writeHead(413).end();
      return;
    }
  }
  const fields = new URLSearchParams(body);
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader("Referrer-Policy", "no-referrer");
  await new Promise((resolve) => setTimeout(resolve, 800)); // Audible pending state only.
  if (Date.now() >= expiry) {
    response.end(JSON.stringify({ status: "unavailable" }));
    return;
  }
  if (action === "decline") {
    response.end(JSON.stringify({ status: "declined" }));
    return;
  }
  if (action === "verify") {
    if (rejectCode || fields.get("code") !== "123456") {
      response.writeHead(422).end("null");
      return;
    }
    response.end(JSON.stringify({ status: "verified" }));
    return;
  }
  if (action === "bind") bound = true;
  response.end(
    JSON.stringify(
      action === "email"
        ? { status: "code-requested" }
        : { status: "claimed", emailBound: bound, expiresAt: new Date(expiry).toISOString() },
    ),
  );
});
server.listen(8086, "127.0.0.1", () => {
  console.log(
    "Synthetic mobile review only: http://127.0.0.1:8086/mobile-invitation#" + "A".repeat(43),
  );
  console.log(
    "Expiry: /review/expiry; failed code: /review/failed-code. No emails/SMS or accounts. Ctrl-C stops the fixture.",
  );
});
process.on("SIGINT", () => server.close());
process.on("SIGTERM", () => server.close());
