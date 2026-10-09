import "@tanstack/react-start/server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { RecoveryArchiveStore } from "../recovery/recovery-job";
import { decryptRecoveryArchive, encryptRecoveryArchive } from "../recovery/recovery-archive";

export const orphanMaintenanceSchema = z
  .object({
    operationId: z.uuid(),
    state: z.enum([
      "reserved",
      "uncertain",
      "held",
      "provider_absent",
      "copies_pending",
      "completed",
    ]),
    operationFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    manifest: z
      .object({
        observedAt: z.iso.datetime({ offset: true }),
        retirements: z
          .array(
            z
              .object({
                operationId: z.uuid(),
                tenantId: z.uuid(),
                emailInvitationId: z.uuid(),
                subjectId: z.uuid(),
                providerSubjectId: z.uuid(),
                contactDigest: z.string().regex(/^[a-f0-9]{64}$/),
                providerAbsentAt: z.iso.datetime({ offset: true }),
              })
              .strict(),
          )
          .length(1),
      })
      .strict(),
  })
  .strict();
export type OrphanMaintenance = z.infer<typeof orphanMaintenanceSchema>;
export type RecoveryObject = { key: string; lastModified: string };
export interface OrphanCopyPorts {
  store: RecoveryArchiveStore & { get(key: string): Promise<string> };
  /** Must exhaust every provider continuation token; never use a truncated first-page listing. */
  inventory(): Promise<RecoveryObject[]>;
  complete(operationId: string, evidence: Record<string, unknown>): Promise<void>;
}
const hash = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");

/** Persist a fresh, independently encrypted disposition BEFORE inspecting older archive copies.
 * No older backups are deleted here. SQL independently enforces freshness, age and authority.
 * Call again after expiry; copies_pending is an honest outcome, not failed provider erasure.
 */
export async function maintainMobileOrphanCopies(
  input: unknown,
  key: Uint8Array<ArrayBuffer>,
  ports: OrphanCopyPorts,
  now = new Date(),
): Promise<{
  state: "copies_pending" | "completed";
  dispositionStored: true;
  olderObjectCount: number;
}> {
  const current = orphanMaintenanceSchema.parse(input);
  const retirement = current.manifest.retirements[0]!;
  if (
    current.state !== "copies_pending" ||
    retirement.operationId !== current.operationId ||
    Date.parse(current.manifest.observedAt) > now.getTime() ||
    now.getTime() - Date.parse(current.manifest.observedAt) > 60_000 ||
    Date.parse(retirement.providerAbsentAt) > now.getTime()
  )
    throw new Error("ORPHAN_COPY_MAINTENANCE_REJECTED");
  const payload = new TextEncoder().encode(JSON.stringify(current.manifest));
  const backupId = randomUUID();
  const objectKey = `${now.toISOString().slice(0, 10)}/${backupId}.json.enc`;
  const archive = await encryptRecoveryArchive(
    {
      contract: "recovery.manifest",
      version: 1,
      backupId,
      createdAt: now.toISOString(),
      environment: "production",
      schemaVersion: "20261009132624",
      recordCounts: { orphan_dispositions: 1 },
      checksum: hash(payload),
    },
    payload,
    key,
    "meneer-health-recovery-key-v1",
  );
  const serialized = JSON.stringify(archive);
  await ports.store.put(objectKey, serialized);
  const downloaded = await ports.store.get(objectKey);
  if (downloaded !== serialized) throw new Error("ORPHAN_DISPOSITION_DURABILITY_FAILED");
  const restored = await decryptRecoveryArchive(JSON.parse(downloaded), key);
  if (restored.manifest.backupId !== backupId || hash(restored.payload) !== hash(payload))
    throw new Error("ORPHAN_DISPOSITION_RECONCILIATION_FAILED");
  const objects = z
    .array(
      z.object({ key: z.string().min(1), lastModified: z.iso.datetime({ offset: true }) }).strict(),
    )
    .parse(await ports.inventory())
    .sort((a, b) => a.key.localeCompare(b.key));
  if (
    new Set(objects.map((item) => item.key)).size !== objects.length ||
    !objects.some((item) => item.key === objectKey)
  )
    throw new Error("ORPHAN_COPY_INVENTORY_INVALID");
  const boundary = new Date(Date.parse(retirement.providerAbsentAt) + 24 * 60 * 60 * 1000);
  const olderObjectCount = objects.filter((item) => {
    const date = /^\d{4}-\d{2}-\d{2}\//.exec(item.key)?.[0].slice(0, 10);
    // Unknown keys cannot be assumed safe; old prefixes also catch later reuploads.
    return (
      !date ||
      date <= boundary.toISOString().slice(0, 10) ||
      Date.parse(item.lastModified) <= boundary.getTime()
    );
  }).length;
  if (olderObjectCount || now.getTime() < boundary.getTime() + 35 * 24 * 60 * 60 * 1000)
    return { state: "copies_pending", dispositionStored: true, olderObjectCount };
  await ports.complete(current.operationId, {
    objectKey,
    operationFingerprint: current.operationFingerprint,
    archiveChecksum: hash(downloaded),
    inventoryChecksum: hash(JSON.stringify(objects)),
    observedAt: new Date().toISOString(),
    olderObjectCount: 0,
  });
  return { state: "completed", dispositionStored: true, olderObjectCount: 0 };
}
