import type { ManagedIdentityProvider } from "./managed-identity-provider";
import { IdentityRejectedError } from "./managed-identity-provider";
import type { IdentitySessionRepository } from "./identity-session-repository";
import type { PatientSessionProof } from "./patient-session-service";
import type { PortalAccount, PortalView } from "@/domain/identity/patient-portal";

export type PortalContext = Readonly<{
  tenantId: string;
  subjectId: string;
  sessionId: string;
  providerSubject: string;
  providerSessionId: string;
  verifiedEmail: string;
  purpose: "account";
}>;
export interface PatientPortalRepository {
  readOwnAccount(context: PortalContext): Promise<PortalAccount>;
}

export class PatientPortalService {
  constructor(
    private readonly provider: Pick<ManagedIdentityProvider, "verifyAccessToken">,
    private readonly sessions: Pick<IdentitySessionRepository, "findActive" | "touch">,
    private readonly repository: PatientPortalRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async read(proof: PatientSessionProof): Promise<PortalView> {
    const session = await this.sessions.findActive(proof.providerSessionId, this.now());
    if (
      !session ||
      session.id !== proof.sessionId ||
      session.subjectId !== proof.subjectId ||
      session.sessionClass !== "patient"
    )
      throw new IdentityRejectedError();
    const identity = await this.provider.verifyAccessToken(proof.accessToken);
    if (
      identity.providerSessionId !== proof.providerSessionId ||
      identity.expiresAt <= this.now() ||
      identity.verifiedContact.kind !== "email"
    )
      throw new IdentityRejectedError();
    // SQL rechecks the live Auth session, mapping, membership, contact and exact receipts
    // in one snapshot; neither a cached JWT nor cookie IDs alone authorize a profile read.
    const account = await this.repository.readOwnAccount({
      tenantId: proof.tenantId,
      subjectId: proof.subjectId,
      sessionId: proof.sessionId,
      providerSubject: identity.providerSubject,
      providerSessionId: identity.providerSessionId,
      verifiedEmail: identity.verifiedContact.value.trim().toLowerCase(),
      purpose: "account",
    });
    const touched = await this.sessions.touch(session, this.now());
    const expiresAt = new Date(
      Math.min(
        touched.idleExpiresAt.getTime(),
        touched.absoluteExpiresAt.getTime(),
        identity.expiresAt.getTime(),
      ),
    );
    if (expiresAt <= this.now()) throw new IdentityRejectedError();
    return { account, expiresAt: expiresAt.toISOString() };
  }
}
