import { readSupabaseIntegrationEnvironment } from "./lib/supabase-integration-environment";

const PILOT_TENANT = Object.freeze({
  id: "80000000-0000-4000-8000-000000000001",
  slug: "meneer-pilot",
  displayName: "Meneer Health Pilot",
  status: "suspended",
});
const HOSTED_PROJECT_REF = "gibfpolrdjotwvewgfsz";

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const confirmation = process.env.HOSTED_PILOT_BASELINE_CONFIRM;
invariant(
  confirmation === "inventory-redacted" || confirmation === "read-only-redacted",
  "Hosted pilot-baseline checks require an approved redacted inventory or verification confirmation.",
);
const verifyBaseline = confirmation === "read-only-redacted";

const environment = readSupabaseIntegrationEnvironment();
invariant(environment.target === "hosted-synthetic", "A hosted Supabase target is required.");
invariant(
  new URL(environment.API_URL).hostname === `${HOSTED_PROJECT_REF}.supabase.co`,
  "The hosted Supabase target is not the approved Meneer pilot project.",
);

const serviceHeaders = {
  apikey: environment.SECRET_KEY,
  Authorization: `Bearer ${environment.SECRET_KEY}`,
};

const openApiResponse = await fetch(new URL("/rest/v1/", environment.API_URL), {
  headers: serviceHeaders,
});
invariant(openApiResponse.ok, "The hosted Data API catalogue could not be read.");
const openApi = (await openApiResponse.json()) as { paths?: Record<string, unknown> };
const tableNames = Object.keys(openApi.paths ?? {})
  .filter((path) => /^\/[a-z][a-z0-9_]*$/.test(path))
  .map((path) => path.slice(1))
  .sort();
invariant(tableNames.includes("tenants"), "The hosted Data API omitted the tenants table.");

const nonEmptyTables: Record<string, number> = {};
const unreadableTableResources: string[] = [];
for (const tableName of tableNames) {
  const response = await fetch(new URL(`/rest/v1/${tableName}?select=*`, environment.API_URL), {
    method: "HEAD",
    headers: {
      ...serviceHeaders,
      Prefer: "count=exact",
      Range: "0-0",
    },
  });
  if (response.status === 401 || response.status === 403) {
    unreadableTableResources.push(tableName);
    continue;
  }
  invariant(response.ok, `The hosted ${tableName} count could not be read.`);
  const contentRange = response.headers.get("content-range");
  const count = Number.parseInt(contentRange?.split("/")[1] ?? "", 10);
  invariant(Number.isSafeInteger(count), `The hosted ${tableName} count was invalid.`);
  if (count > 0) nonEmptyTables[tableName] = count;
}

const usersResponse = await fetch(
  new URL("/auth/v1/admin/users?page=1&per_page=1", environment.API_URL),
  { headers: serviceHeaders },
);
invariant(usersResponse.ok, "The hosted Auth inventory could not be read.");
const users = (await usersResponse.json()) as { users?: unknown[]; total?: number };
const authUserCount = users.total ?? users.users?.length;

const anonymousResponse = await fetch(new URL("/rest/v1/tenants?select=id", environment.API_URL), {
  headers: { apikey: environment.PUBLISHABLE_KEY },
});
invariant(
  anonymousResponse.status === 401 || anonymousResponse.status === 403,
  "Anonymous tenant access did not fail closed.",
);

if (verifyBaseline) {
  const tenantResponse = await fetch(
    new URL(
      `/rest/v1/tenants?id=eq.${PILOT_TENANT.id}&select=id,slug,display_name,status`,
      environment.API_URL,
    ),
    { headers: serviceHeaders },
  );
  invariant(tenantResponse.ok, "The hosted tenant baseline could not be read.");
  const tenants = (await tenantResponse.json()) as Array<{
    id: string;
    slug: string;
    display_name: string;
    status: string;
  }>;
  invariant(tenants.length === 1, "The hosted pilot tenant is missing or duplicated.");
  const [tenant] = tenants;
  invariant(
    tenant?.id === PILOT_TENANT.id &&
      tenant.slug === PILOT_TENANT.slug &&
      tenant.display_name === PILOT_TENANT.displayName &&
      tenant.status === PILOT_TENANT.status,
    "The hosted pilot tenant does not match the approved fail-closed baseline.",
  );
  invariant(
    JSON.stringify(nonEmptyTables) ===
      JSON.stringify({ fulfilment_provider_gates: 12, tenants: 1 }),
    "Hosted service-readable tables contain data outside the approved pilot baseline.",
  );
  invariant(authUserCount === 0, "Hosted Auth contains an unintended identity.");
}

console.log(
  JSON.stringify({
    exercise: verifyBaseline ? "hosted-pilot-baseline" : "hosted-pilot-inventory",
    projectRef: HOSTED_PROJECT_REF,
    publicTableResources: tableNames.length,
    serviceUnreadableTableResources: unreadableTableResources.length,
    nonEmptyApplicationTables: nonEmptyTables,
    authUsers: authUserCount,
    ...(verifyBaseline
      ? { pilotTenant: { slug: PILOT_TENANT.slug, status: PILOT_TENANT.status } }
      : {}),
    anonymousTenantReadDenied: true,
    rowContentLogged: false,
  }),
);
