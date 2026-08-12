import type { AuthorisationDecision } from "@/domain/access/authorisation";
import type { MembershipRole } from "@/domain/access/models";
import type {
  RecordSecurityEvidence,
  SecurityEvidenceReceipt,
  SecurityEvidenceRepository,
} from "./security-evidence-repository";

type HumanEvidenceContext = Omit<
  RecordSecurityEvidence,
  "actorType" | "actorRole" | "assurance" | "action" | "policyVersion" | "reasonCode"
> &
  Readonly<{ role: MembershipRole; assurance: "aal1" | "aal2" }>;

export class SecurityEvidenceService {
  constructor(private readonly repository: SecurityEvidenceRepository) {}

  async recordHumanAuthorisationDenial(
    context: HumanEvidenceContext,
    decision: AuthorisationDecision,
  ): Promise<SecurityEvidenceReceipt> {
    if (decision.allowed) throw new TypeError("Allowed decisions are not denial evidence.");
    const { role, assurance, ...evidence } = context;
    return this.repository.record({
      ...evidence,
      actorType: role === "patient" ? "patient" : "workforce",
      actorRole: role,
      assurance,
      action: "authorisation.denied",
      policyVersion: decision.policyVersion,
      reasonCode: decision.reason,
    });
  }

  async recordBreakGlassDenial(
    context: HumanEvidenceContext & Readonly<{ role: "clinician" | "admin" }>,
    reasonCode: "BREAK_GLASS_DISABLED" | "BREAK_GLASS_CONTEXT_INVALID",
    policyVersion: string,
  ): Promise<SecurityEvidenceReceipt> {
    const { role, assurance, ...evidence } = context;
    return this.repository.record({
      ...evidence,
      actorType: "workforce",
      actorRole: role,
      assurance,
      action: "breakglass.denied",
      policyVersion,
      reasonCode,
    });
  }
}
