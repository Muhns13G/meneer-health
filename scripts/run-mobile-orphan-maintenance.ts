import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { openWorkforceProof } from "../src/server/identity/workforce-session-cookie";
import { SupabaseManagedIdentityProvider } from "../src/adapters/identity/supabase/supabase-managed-identity-provider";
import { SupabaseWorkforceContextRepository } from "../src/adapters/identity/supabase/supabase-workforce-context-repository";
import { SupabaseMobileOrphanRetirementRepository } from "../src/adapters/identity/supabase/supabase-mobile-orphan-retirement-repository";
import { SupabaseMobileOrphanRetirementProvider } from "../src/adapters/identity/supabase/supabase-mobile-orphan-retirement-provider";
import {
  MobileOrphanRetirementService,
  mobileOrphanRetirementCommandSchema,
} from "../src/application/identity/mobile-orphan-retirement-service";
import { maintainMobileOrphanCopies } from "../src/application/identity/mobile-orphan-copy-maintenance";
import { S3R2RecoveryArchiveStore } from "../src/adapters/recovery/hosted-recovery-support";
import {
  CloudflareR2MaintenanceStore,
  readWranglerOAuthToken,
} from "./lib/cloudflare-r2-maintenance";

// Deliberate exact-ID maintenance; no sweep, invitation send, secret logging or retry loop.
const env = z
  .object({
    MOBILE_ORPHAN_MAINTENANCE_CONFIRM: z.literal("exact-id-fresh-operations-totp"),
    MOBILE_ORPHAN_MAINTENANCE_FILE: z.string().regex(/^\.[\w.-]+\.local$/),
    SUPABASE_URL: z.literal("https://gibfpolrdjotwvewgfsz.supabase.co"),
    SUPABASE_SECRET_KEY: z.string().min(20),
    IDENTITY_SESSION_KEY_BASE64: z.string().min(40),
    RECOVERY_ENCRYPTION_KEY_BASE64: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
    RECOVERY_R2_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/),
    CLOUDFLARE_ACCOUNT_ID: z.string().regex(/^[a-f0-9]{32}$/),
    MOBILE_ORPHAN_R2_AUTH: z.enum(["s3", "wrangler-oauth"]).default("s3"),
    R2_ACCESS_KEY_ID: z.string().min(20).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(32).optional(),
  })
  .refine(
    (value) =>
      value.MOBILE_ORPHAN_R2_AUTH === "wrangler-oauth" ||
      Boolean(value.R2_ACCESS_KEY_ID && value.R2_SECRET_ACCESS_KEY),
    "R2 credentials required",
  )
  .parse(process.env);
const oauthStore =
  env.MOBILE_ORPHAN_R2_AUTH === "wrangler-oauth"
    ? new CloudflareR2MaintenanceStore(
        env.CLOUDFLARE_ACCOUNT_ID,
        env.RECOVERY_R2_BUCKET,
        readWranglerOAuthToken(),
      )
    : undefined;
const input = z
  .object({
    cookie: z.string().min(1),
    command: mobileOrphanRetirementCommandSchema,
    reissue: z.unknown().optional(),
    reviewReference: z.uuid().optional(),
  })
  .strict()
  .parse(JSON.parse(readFileSync(env.MOBILE_ORPHAN_MAINTENANCE_FILE, "utf8")));
if ((statSync(env.MOBILE_ORPHAN_MAINTENANCE_FILE).mode & 0o077) !== 0)
  throw new Error("ORPHAN_MAINTENANCE_PRIVATE_FILE_REQUIRED");
const client = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const proof = await openWorkforceProof(
  new Request("https://meneerhealth.co.za/staff", {
    headers: { cookie: input.cookie },
  }),
  env.IDENTITY_SESSION_KEY_BASE64,
);
if (!proof?.sessionId) throw new Error("ORPHAN_MAINTENANCE_SESSION_REQUIRED");
const provider = new SupabaseManagedIdentityProvider(client, async () => {
  throw new Error("ORPHAN_MAINTENANCE_NO_SESSION_MUTATION");
});
const identity = await provider.verifyAccessToken(proof.providerSession.accessToken);
const context = await new SupabaseWorkforceContextRepository(client).resolve(identity, proof);
if (
  JSON.stringify(context) !== JSON.stringify(proof.context) ||
  context.role !== "operations" ||
  input.command.tenantId !== context.tenantId
)
  throw new Error("ORPHAN_MAINTENANCE_CONTEXT_REJECTED");
const repository = new SupabaseMobileOrphanRetirementRepository(client, identity, proof);
const authority = {
  p_provider_subject: identity.providerSubject,
  p_provider_session_id: identity.providerSessionId,
  p_verified_email: identity.verifiedContact.value,
  p_session_id: proof.sessionId,
  p_subject_id: context.subjectId,
  p_tenant_id: context.tenantId,
};
async function rpc(name: string, fields: Record<string, unknown>) {
  const result = await client.rpc(name, { ...authority, ...fields });
  if (result.error) throw new Error("ORPHAN_MAINTENANCE_RPC_REJECTED");
  return result.data;
}
// Avoid an irreversible provider call if the required copy-maintenance migration is absent.
await rpc("read_mobile_orphan_maintenance", {
  p_email_invitation_id: input.command.emailInvitationId,
});
const state = await new MobileOrphanRetirementService(
  repository,
  new SupabaseMobileOrphanRetirementProvider(client),
).retire(input.command);
let copyState = state;
if (state === "copies_pending") {
  const current = await rpc("read_mobile_orphan_maintenance", {
    p_email_invitation_id: input.command.emailInvitationId,
  });
  const store =
    oauthStore ??
    new S3R2RecoveryArchiveStore(
      env.RECOVERY_R2_BUCKET,
      env.CLOUDFLARE_ACCOUNT_ID,
      env.R2_ACCESS_KEY_ID!,
      env.R2_SECRET_ACCESS_KEY!,
    );
  const result = await maintainMobileOrphanCopies(
    current,
    Uint8Array.from(Buffer.from(env.RECOVERY_ENCRYPTION_KEY_BASE64, "base64")),
    {
      store,
      async inventory() {
        if (oauthStore) return oauthStore.inventory();
        const objects: Array<{ key: string; lastModified: string }> = [];
        const seen = new Set<string>();
        let token: string | undefined;
        do {
          const page = z
            .object({
              IsTruncated: z.boolean(),
              NextContinuationToken: z.string().optional(),
              Contents: z.array(z.object({ Key: z.string(), LastModified: z.string() })).optional(),
            })
            .parse(
              JSON.parse(
                execFileSync(
                  "aws",
                  [
                    "s3api",
                    "list-objects-v2",
                    "--no-paginate",
                    "--output",
                    "json",
                    "--endpoint-url",
                    `https://${env.CLOUDFLARE_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`,
                    "--bucket",
                    env.RECOVERY_R2_BUCKET,
                    ...(token ? ["--continuation-token", token] : []),
                  ],
                  {
                    encoding: "utf8",
                    stdio: ["ignore", "pipe", "pipe"],
                    timeout: 30000,
                    maxBuffer: 16 * 1024 * 1024,
                    env: {
                      ...process.env,
                      AWS_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
                      AWS_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
                      AWS_DEFAULT_REGION: "auto",
                    },
                  },
                ),
              ),
            );
          objects.push(
            ...(page.Contents ?? []).map((item) => ({
              key: item.Key,
              lastModified: item.LastModified,
            })),
          );
          token = page.IsTruncated ? page.NextContinuationToken : undefined;
          if (page.IsTruncated && (!token || seen.has(token)))
            throw new Error("ORPHAN_INVENTORY_PAGINATION_REJECTED");
          if (token) seen.add(token);
        } while (token);
        return objects;
      },
      async complete(operationId, evidence) {
        if (
          (await rpc("complete_mobile_orphan_copy_retirement", {
            p_operation_id: operationId,
            p_evidence: evidence,
          })) !== true
        )
          throw new Error("ORPHAN_COPY_COMPLETION_REJECTED");
      },
    },
  );
  copyState = result.state;
}
if (input.reissue !== undefined) {
  const current = await rpc("read_mobile_orphan_maintenance", {
    p_email_invitation_id: input.command.emailInvitationId,
  });
  const { mobileInvitationCommandSchema } =
    await import("../src/application/identity/mobile-invitation");
  const command = mobileInvitationCommandSchema.parse(input.reissue);
  if (!input.reviewReference || !["copies_pending", "completed"].includes(copyState))
    throw new Error("ORPHAN_REISSUE_REVIEW_REQUIRED");
  await repository.prepareReviewedReissue(
    z.uuid().parse(current.operationId),
    input.reviewReference,
    command,
  );
}
console.log(
  JSON.stringify({
    exercise: "mobile-orphan-maintenance",
    state: copyState,
    reissueDraftPrepared: input.reissue !== undefined,
    messagesSent: 0,
    contactsPrinted: 0,
  }),
);
