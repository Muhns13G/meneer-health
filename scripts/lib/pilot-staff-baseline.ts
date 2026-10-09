import { z } from "zod";

const rowSchema = z
  .object({
    schemaname: z.string().min(1),
    tablename: z.string().min(1),
    row_count: z.number().int().nonnegative(),
  })
  .strict();
const attributionSchema = z
  .object({
    authorised_staff_accounts: z.literal(4),
    unexpected_auth_accounts: z.literal(0),
    unexpected_subjects: z.literal(0),
    unexpected_contacts: z.literal(0),
    unexpected_identity_links: z.literal(0),
    unexpected_tenants: z.literal(0),
  })
  .strict();

/** Count-only pre-provisioning check. Does not read contacts, create grants or clean data.
 * Attribution must be independently queried through exact Auth -> application relationships.
 * The old empty-Auth baseline is invalid after the four authorised permanent invitations.
 */
export function verifyPilotStaffBaseline(inventory: unknown, attribution: unknown): void {
  const rows = z.array(rowSchema).parse(inventory);
  attributionSchema.parse(attribution);
  const seen = new Set<string>();
  const expected = new Map([
    ["auth.users", 4],
    ["auth.identities", 4],
    ["public.subjects", 4],
    ["public.external_identities", 4],
    ["public.tenants", 1],
    ["public.fulfilment_provider_gates", 12],
  ]);
  for (const row of rows) {
    const key = `${row.schemaname}.${row.tablename}`;
    if (seen.has(key)) throw new Error("STAFF_BASELINE_DUPLICATE_RELATION");
    seen.add(key);
    if (key === "auth.schema_migrations" || key === "storage.migrations") continue;
    // Initial invitation tokens expire normally; confirmed contacts may subsequently appear.
    if (key === "auth.one_time_tokens" || key === "public.subject_contacts") {
      if (row.row_count > 4) throw new Error("STAFF_BASELINE_UNEXPECTED_CONTACT_OR_TOKEN");
      continue;
    }
    if (row.row_count !== (expected.get(key) ?? 0))
      throw new Error("STAFF_BASELINE_UNEXPECTED_DATA");
  }
  if ([...expected.keys()].some((key) => !seen.has(key)))
    throw new Error("STAFF_BASELINE_INCOMPLETE_INVENTORY");
}

export const initialOperatorRoster = Object.freeze({
  state: "grants-provisioned-tenant-suspended",
  operators: ["mansoer", "mikhail"] as const,
  grantedContexts: ["operations", "auditor", "admin"] as const,
  invitationOnly: ["tasneem", "ziyaad"] as const,
  clinicalGrants: 0,
  requiresIndependentApproval: true,
  requiresOwnContactVerificationAndTotp: true,
});
