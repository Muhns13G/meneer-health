import type { RecoveryManifest } from "../../../contracts/lifecycle";
import { encryptRecoveryArchive } from "./recovery-archive";

export interface RecoveryArchiveStore {
  put(objectKey: string, body: string): Promise<void>;
}

export interface BackupHeartbeat {
  success(): Promise<void>;
}

export type RecoveryJobInput = Readonly<{
  manifest: RecoveryManifest;
  payload: Uint8Array<ArrayBuffer>;
  keyBytes: Uint8Array<ArrayBuffer>;
  keyReference: string;
}>;

export type StoredRecoveryArchive = Readonly<{
  objectKey: string;
  serializedArchive: string;
}>;

export type StoredRecoveryArchiveVerifier = (archive: StoredRecoveryArchive) => Promise<void>;

export async function runRecoveryExportJob(
  input: RecoveryJobInput,
  store: RecoveryArchiveStore,
  heartbeat: BackupHeartbeat,
  verifyStoredArchive?: StoredRecoveryArchiveVerifier,
): Promise<{ backupId: string; heartbeatDelivered: true }> {
  const archive = await encryptRecoveryArchive(
    input.manifest,
    input.payload,
    input.keyBytes,
    input.keyReference,
  );
  const objectKey = `${input.manifest.createdAt.slice(0, 10)}/${input.manifest.backupId}.json.enc`;
  const serializedArchive = JSON.stringify(archive);
  await store.put(objectKey, serializedArchive);
  await verifyStoredArchive?.({ objectKey, serializedArchive });
  await heartbeat.success();
  return { backupId: input.manifest.backupId, heartbeatDelivered: true };
}
