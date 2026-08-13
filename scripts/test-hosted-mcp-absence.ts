const baseUrl = process.env.HOSTED_MCP_BASE_URL?.trim();

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

invariant(
  process.env.HOSTED_MCP_EXERCISE_CONFIRM === "retired-routes-only",
  "Hosted MCP proof requires HOSTED_MCP_EXERCISE_CONFIRM=retired-routes-only.",
);
invariant(baseUrl?.startsWith("https://"), "A hosted HTTPS base URL is required.");

const probes = [
  { method: "GET", path: "/mcp", status: 404, contentType: "text/html" },
  {
    method: "POST",
    path: "/mcp",
    status: 405,
    contentType: "application/json",
    errorCode: "VALIDATION_FAILED",
  },
  { method: "GET", path: "/.mcp/list-tools", status: 404, contentType: "text/html" },
  {
    method: "POST",
    path: "/.mcp/invoke-tool/about_meneer",
    status: 404,
    contentType: "application/json",
    errorCode: "NOT_FOUND",
  },
  {
    method: "GET",
    path: "/.well-known/oauth-protected-resource",
    status: 404,
    contentType: "text/html",
  },
] as const;

const prohibitedResponseMarkers = [
  "application/json",
  "application/oauth-authz-req+jwt",
  "authorization_servers",
  "resource_name",
  "tools/list",
  "about_meneer",
  "list_treatments",
  "how_it_works",
] as const;

for (const probe of probes) {
  const response = await fetch(new URL(probe.path, baseUrl), {
    method: probe.method,
    redirect: "manual",
    headers: {
      Accept: probe.method === "GET" ? "text/html" : "application/json, text/event-stream",
      Origin: "https://mcp-boundary-canary.invalid",
      ...(probe.method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    body:
      probe.method === "POST"
        ? JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })
        : undefined,
  });
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();

  invariant(
    response.status === probe.status,
    `${probe.method} ${probe.path} did not return ${probe.status}.`,
  );
  invariant(
    contentType.startsWith(probe.contentType),
    `${probe.method} ${probe.path} returned the wrong content type.`,
  );
  invariant(!response.headers.has("set-cookie"), `${probe.method} ${probe.path} created state.`);
  invariant(
    !response.headers.has("access-control-allow-origin"),
    `${probe.method} ${probe.path} enabled CORS.`,
  );
  invariant(
    prohibitedResponseMarkers.every((marker) => !body.toLowerCase().includes(marker)),
    `${probe.method} ${probe.path} exposed MCP or OAuth protocol material.`,
  );
  if ("errorCode" in probe) {
    const payload = JSON.parse(body) as { error?: { code?: string } };
    invariant(
      payload.error?.code === probe.errorCode,
      `${probe.method} ${probe.path} did not return the stable security denial.`,
    );
  } else {
    invariant(
      body.includes("404"),
      `${probe.method} ${probe.path} did not use the ordinary 404 page.`,
    );
  }
}

console.log(
  JSON.stringify({
    exercise: "hosted-mcp-absence",
    probes: probes.length,
    getBoundary: "ordinary-html-404",
    postBoundary: "stable-security-denial",
    protocolPayloads: 0,
    persistentCookies: 0,
    corsAllowed: false,
  }),
);

export {};
