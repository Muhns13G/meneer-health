import "@tanstack/react-start/server-only";

import type { BackupHeartbeat, RecoveryArchiveStore } from "@/application/recovery/recovery-job";

export type R2RecoveryBucket = Readonly<{
  put(
    key: string,
    value: string,
    options: { httpMetadata: { contentType: string }; customMetadata: Record<string, string> },
  ): Promise<unknown>;
}>;

export class CloudflareR2RecoveryArchiveStore implements RecoveryArchiveStore {
  constructor(private readonly bucket: R2RecoveryBucket) {}

  async put(objectKey: string, body: string): Promise<void> {
    if (!/^\d{4}-\d{2}-\d{2}\/[a-f0-9-]{36}\.json\.enc$/.test(objectKey)) {
      throw new Error("RECOVERY_OBJECT_KEY_INVALID");
    }
    await this.bucket.put(objectKey, body, {
      httpMetadata: { contentType: "application/octet-stream" },
      customMetadata: { classification: "encrypted-recovery", retentionDays: "35" },
    });
  }
}

export class HttpBackupHeartbeat implements BackupHeartbeat {
  private readonly target: URL;

  constructor(
    target: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    this.target = new URL(target);
    if (this.target.protocol !== "https:") throw new Error("RECOVERY_HEARTBEAT_URL_INVALID");
  }

  async success(): Promise<void> {
    const response = await this.fetcher(this.target, {
      method: "GET",
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) throw new Error("RECOVERY_HEARTBEAT_FAILED");
  }
}
