import { execFileSync } from "node:child_process";
import { z } from "zod";

/** Existing interactive Wrangler credentials only; no token creation, output or persistence. */
export function readWranglerOAuthToken(): string {
  const output = execFileSync(
    "bun",
    ["--no-env-file", "x", "wrangler", "auth", "token", "--json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  return z
    .object({ type: z.literal("oauth"), token: z.string().min(20) })
    .parse(JSON.parse(output.slice(output.indexOf("{")))).token;
}
/** Private EU recovery-object adapter. Mutations accept only governed opaque archive keys. */
export class CloudflareR2MaintenanceStore {
  private readonly base: string;
  constructor(
    account: string,
    bucket: string,
    private readonly token: string,
    private readonly request: typeof fetch = fetch,
  ) {
    if (
      !/^[a-f0-9]{32}$/.test(account) ||
      !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket) ||
      token.length < 20
    )
      throw new Error("R2_MAINTENANCE_CONFIGURATION_INVALID");
    this.base = `https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/${bucket}`;
  }
  private async call(path: string, method = "GET", body?: string) {
    const response = await this.request(this.base + path, {
      method,
      body,
      redirect: "error",
      signal: AbortSignal.timeout(30000),
      headers: {
        Authorization: `Bearer ${this.token}`,
        "cf-r2-jurisdiction": "eu",
        ...(body ? { "Content-Type": "application/octet-stream" } : {}),
      },
    });
    if (!response.ok) throw new Error(`R2_MAINTENANCE_HTTP_${response.status}`);
    return response;
  }
  private objectPath(key: string) {
    if (!/^\d{4}-\d{2}-\d{2}\/[a-f0-9-]{36}\.json\.enc$/.test(key))
      throw new Error("R2_MAINTENANCE_OBJECT_REJECTED");
    return `/objects/${encodeURIComponent(key)}`;
  }
  async put(key: string, body: string) {
    await this.call(this.objectPath(key), "PUT", body);
  }
  async get(key: string) {
    return (await this.call(this.objectPath(key))).text();
  }
  async delete(key: string) {
    await this.call(this.objectPath(key), "DELETE");
  }
  async inventory() {
    const objects: Array<{ key: string; lastModified: string }> = [];
    const seen = new Set<string>();
    let cursor: string | undefined;
    let startAfter: string | undefined;
    let pages = 0;
    do {
      if (++pages > 10000) throw new Error("R2_MAINTENANCE_INVENTORY_INCOMPLETE");
      const page = z
        .object({
          success: z.literal(true),
          result: z.array(
            z.object({ key: z.string(), last_modified: z.iso.datetime({ offset: true }) }),
          ),
          result_info: z
            .object({ is_truncated: z.boolean(), cursor: z.string().optional() })
            .optional(),
        })
        .parse(
          await (
            await this.call(
              `/objects?per_page=1000${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}${startAfter ? `&start_after=${encodeURIComponent(startAfter)}` : ""}`,
            )
          ).json(),
        );
      if (startAfter && page.result.some((item) => item.key <= startAfter!))
        throw new Error("R2_MAINTENANCE_INVENTORY_INCOMPLETE");
      objects.push(
        ...page.result.map((item) => ({ key: item.key, lastModified: item.last_modified })),
      );
      cursor = page.result_info?.is_truncated ? page.result_info.cursor : undefined;
      if (page.result_info?.is_truncated && (!cursor || seen.has(cursor)))
        throw new Error("R2_MAINTENANCE_INVENTORY_INCOMPLETE");
      if (cursor) seen.add(cursor);
      // Some final pages omit result_info. Prove exhaustion with an advancing
      // lexicographic request instead of treating absent pagination as completion.
      startAfter =
        !page.result_info && page.result.length
          ? page.result
              .map((item) => item.key)
              .sort()
              .at(-1)
          : undefined;
    } while (cursor || startAfter);
    if (new Set(objects.map((o) => o.key)).size !== objects.length)
      throw new Error("R2_MAINTENANCE_INVENTORY_DUPLICATE");
    return objects;
  }
}
