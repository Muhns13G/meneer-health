import "@tanstack/react-start/server-only";
import { z } from "zod";
import {
  evaluateMobileOrphanRetirement,
  providerRetirementReconciled,
} from "./mobile-orphan-retirement";
import { IdentityRejectedError, IdentityUnavailableError } from "./managed-identity-provider";

export const mobileOrphanRetirementCommandSchema = z
  .object({
    tenantId: z.uuid(),
    emailInvitationId: z.uuid(),
    requestKey: z.uuid(),
  })
  .strict();
export type MobileOrphanRetirementCommand = z.infer<typeof mobileOrphanRetirementCommandSchema>;
const reservationSchema = z
  .object({
    operationId: z.uuid(),
    tenantId: z.uuid(),
    emailInvitationId: z.uuid(),
    requestKey: z.uuid(),
    providerSubjectId: z.uuid(),
    contactDigest: z.string().regex(/^[a-f0-9]{64}$/),
    dispatch: z.boolean(),
    state: z.enum(["reserved", "uncertain", "provider_absent", "copies_pending", "completed"]),
    // This must be the current locked database observation, not caller-supplied candidate data.
    snapshot: z.unknown(),
  })
  .strict();
export type MobileOrphanRetirementReservation = z.infer<typeof reservationSchema>;
export type MobileOrphanRetirementState = "held" | "uncertain" | "copies_pending" | "completed";

/** Implementations must resolve fresh AAL2 operations authority, shared tenant/subject locks,
 * exact creation receipt and all preservation vetoes, and freeze application/claim/provider-session
 * authority atomically. Exactly one reservation may return dispatch=true. No browser-facing port.
 * Provider calls MUST occur outside database locks. An exception never grants a second dispatch.
 */
export interface MobileOrphanRetirementRepository {
  reserve(command: MobileOrphanRetirementCommand): Promise<unknown>;
  markUncertain(operationId: string): Promise<void>;
  markProtected(operationId: string): Promise<void>;
  /** Recheck the manifest/vetoes under lock before contact-only tombstoning. Never disable guards.
   * Provider absence is not backup erasure; return copies_pending until every copy is reconciled.
   */
  finishProviderAbsence(operationId: string, providerSubjectId: string): Promise<"copies_pending">;
}
export interface MobileOrphanRetirementProvider {
  observe(providerSubjectId: string): Promise<unknown>;
  /** Only the exact attributed unconfirmed identity; must independently recheck contact digest.
   * Confirmed/pre-existing/changed identities are protected. No email search or cascading delete.
   */
  removeUnconfirmed(
    providerSubjectId: string,
    contactDigest: string,
  ): Promise<"attempted" | "protected">;
}

/** Private coordinator only. Not wired into a route, Cron, or retention sweep until the native
 * locked repository and provider/session race acceptance pass. Candidate policy is NOT authority.
 */
export class MobileOrphanRetirementService {
  constructor(
    private readonly repository: MobileOrphanRetirementRepository,
    private readonly provider: MobileOrphanRetirementProvider,
    private readonly now = () => new Date(),
  ) {}
  async retire(input: unknown): Promise<MobileOrphanRetirementState> {
    const parsed = mobileOrphanRetirementCommandSchema.safeParse(input);
    if (!parsed.success) throw new IdentityRejectedError();
    const command = parsed.data;
    const reserved = await this.repository.reserve(command);
    if (reserved === null) return "held";
    const result = reservationSchema.safeParse(reserved);
    if (!result.success) throw new IdentityUnavailableError();
    const reservation = result.data;
    if (
      reservation.tenantId !== command.tenantId ||
      reservation.emailInvitationId !== command.emailInvitationId ||
      reservation.requestKey !== command.requestKey ||
      (reservation.dispatch && reservation.state !== "reserved")
    )
      throw new IdentityUnavailableError();
    if (reservation.state === "completed" || reservation.state === "copies_pending") {
      if (reservation.dispatch) throw new IdentityUnavailableError();
      return reservation.state;
    }
    // Defensive observation validation; the real lock/veto decision belongs in the repository.
    const instant = this.now();
    const decision = evaluateMobileOrphanRetirement(reservation.snapshot, instant);
    const observation = reservation.snapshot as Record<string, unknown>;
    if (
      decision.status !== "candidate" ||
      observation.tenantId !== command.tenantId ||
      observation.emailInvitationId !== command.emailInvitationId ||
      observation.providerSubjectId !== reservation.providerSubjectId ||
      observation.contactDigest !== reservation.contactDigest ||
      instant.getTime() - Date.parse(String(observation.observedAt)) > 30_000
    ) {
      await this.repository.markProtected(reservation.operationId);
      return "held";
    }
    // Persist uncertainty BEFORE the external side effect. Lost acknowledgement can only lead
    // to exact-ID observation/reconciliation, never an automatic repeat delete or a resend.
    if (reservation.dispatch) {
      await this.repository.markUncertain(reservation.operationId);
      try {
        if (
          (await this.provider.removeUnconfirmed(
            reservation.providerSubjectId,
            reservation.contactDigest,
          )) === "protected"
        ) {
          await this.repository.markProtected(reservation.operationId);
          return "held";
        }
      } catch {
        return "uncertain";
      }
    }
    let providerObservation: unknown;
    try {
      providerObservation = await this.provider.observe(reservation.providerSubjectId);
    } catch {
      return "uncertain";
    }
    if (!providerRetirementReconciled(reservation.providerSubjectId, providerObservation))
      return "uncertain";
    return this.repository.finishProviderAbsence(
      reservation.operationId,
      reservation.providerSubjectId,
    );
  }
}
