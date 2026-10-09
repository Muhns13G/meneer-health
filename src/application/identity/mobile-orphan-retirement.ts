import "@tanstack/react-start/server-only";
import { z } from "zod";

const reference = z.uuid();
const timestamp = z.iso.datetime({ offset: true });
const retentionMilliseconds = 30 * 24 * 60 * 60 * 1000;

/** Private authoritative snapshot, never a browser command or a deletion authorisation. */
const snapshotSchema = z
  .object({
    tenantId: reference,
    invitationId: reference,
    invitationVersion: z.number().int().positive(),
    currentVersion: z.number().int().positive(),
    claimId: reference,
    emailInvitationId: reference,
    subjectId: reference,
    providerSubjectId: reference,
    contactDigest: z.string().regex(/^[a-f0-9]{64}$/),
    terminalState: z.enum(["expired", "revoked", "declined", "converted", "active"]),
    terminalAt: timestamp.nullable(),
    observedAt: timestamp,
    // Creation, not merely email matching or a successful invite API response, must be proven.
    creationProvenance: z.enum(["mobile-created", "pre-existing", "unknown"]),
    linkedTenantId: reference,
    linkedInvitationId: reference,
    linkedClaimId: reference,
    linkedEmailInvitationId: reference,
    linkedSubjectId: reference,
    linkedProviderSubjectId: reference,
    linkedContactDigest: z.string().regex(/^[a-f0-9]{64}$/),
    converted: z.boolean(),
    emailAccepted: z.boolean(),
    liveClaim: z.boolean(),
    liveProviderSession: z.boolean(),
    activeMembership: z.boolean(),
    anotherInvitation: z.boolean(),
    crossTenantAssociation: z.boolean(),
    profileExists: z.boolean(),
    domainRecordsExist: z.boolean(),
    held: z.boolean(),
    providerOutcomeUncertain: z.boolean(),
  })
  .strict();

export type MobileOrphanSnapshot = z.infer<typeof snapshotSchema>;
export type MobileOrphanDecision =
  | { status: "held"; reason: "invalid" | "provenance" | "version" | "protected" | "not-due" }
  | { status: "candidate"; dueAt: string };

/** Candidate selection only. A repository must recheck under its shared lock before reservation. */
export function evaluateMobileOrphanRetirement(input: unknown, now: Date): MobileOrphanDecision {
  const result = snapshotSchema.safeParse(input);
  if (!result.success || !Number.isFinite(now.getTime()))
    return { status: "held", reason: "invalid" };
  const value = result.data;
  if (Date.parse(value.observedAt) > now.getTime()) return { status: "held", reason: "invalid" };
  if (
    value.creationProvenance !== "mobile-created" ||
    value.tenantId !== value.linkedTenantId ||
    value.invitationId !== value.linkedInvitationId ||
    value.claimId !== value.linkedClaimId ||
    value.emailInvitationId !== value.linkedEmailInvitationId ||
    value.subjectId !== value.linkedSubjectId ||
    value.providerSubjectId !== value.linkedProviderSubjectId ||
    value.contactDigest !== value.linkedContactDigest
  )
    return { status: "held", reason: "provenance" };
  if (value.invitationVersion !== value.currentVersion)
    return { status: "held", reason: "version" };
  if (
    value.terminalState === "converted" ||
    value.terminalState === "active" ||
    value.converted ||
    value.emailAccepted ||
    value.liveClaim ||
    value.liveProviderSession ||
    value.activeMembership ||
    value.anotherInvitation ||
    value.crossTenantAssociation ||
    value.profileExists ||
    value.domainRecordsExist ||
    value.held ||
    value.providerOutcomeUncertain
  )
    return { status: "held", reason: "protected" };
  if (value.terminalAt === null) return { status: "held", reason: "not-due" };
  const terminal = Date.parse(value.terminalAt);
  const observed = Date.parse(value.observedAt);
  if (terminal > observed) return { status: "held", reason: "invalid" };
  const due = terminal + retentionMilliseconds;
  if (due > now.getTime()) return { status: "held", reason: "not-due" };
  return { status: "candidate", dueAt: new Date(due).toISOString() };
}

const observationSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("absent"), providerSubjectId: reference }).strict(),
  z.object({ status: z.literal("present"), providerSubjectId: reference }).strict(),
  z.object({ status: z.literal("unknown") }).strict(),
]);

/** A delete acknowledgement or timeout is not independently reconciled provider absence. */
export function providerRetirementReconciled(
  expectedProviderSubjectId: string,
  observation: unknown,
): boolean {
  if (!reference.safeParse(expectedProviderSubjectId).success) return false;
  const parsed = observationSchema.safeParse(observation);
  return (
    parsed.success &&
    parsed.data.status === "absent" &&
    parsed.data.providerSubjectId === expectedProviderSubjectId
  );
}
