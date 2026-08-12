import { describe, expect, it, vi } from "vitest";

import {
  CloudflareR2RecoveryArchiveStore,
  HttpBackupHeartbeat,
} from "./cloudflare-recovery-adapters";

describe("Cloudflare recovery adapters", () => {
  it("stores only encrypted archives with a 35-day retention marker", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const store = new CloudflareR2RecoveryArchiveStore({ put });
    await store.put("2030-01-01/b0000000-0000-4000-8000-000000000013.json.enc", "encrypted");
    expect(put).toHaveBeenCalledWith(
      expect.any(String),
      "encrypted",
      expect.objectContaining({ customMetadata: expect.objectContaining({ retentionDays: "35" }) }),
    );
    await expect(store.put("patient@example.invalid", "raw")).rejects.toThrow(
      "RECOVERY_OBJECT_KEY_INVALID",
    );
  });

  it("sends a payload-free HTTPS success heartbeat and fails closed", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await new HttpBackupHeartbeat("https://heartbeat.example.invalid/synthetic", fetcher).success();
    expect(fetcher).toHaveBeenCalledWith(
      new URL("https://heartbeat.example.invalid/synthetic"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetcher.mock.calls[0]).toHaveLength(2);
    expect(() => new HttpBackupHeartbeat("http://example.invalid", fetcher)).toThrow(
      "RECOVERY_HEARTBEAT_URL_INVALID",
    );
  });
});
