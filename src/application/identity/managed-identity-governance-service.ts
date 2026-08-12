import type { ManagedIdentityProvider } from "@/application/identity/managed-identity-provider";
import type {
  IdentityGovernanceRepository,
  CreatePatientInvitation,
  CreateRecoveryCase,
} from "@/application/identity/identity-governance-repository";
import type { IdentityInvitation, IdentityRecoveryCase } from "@/domain/access/identity";

export class ManagedIdentityGovernanceService {
  constructor(
    private readonly provider: ManagedIdentityProvider,
    private readonly repository: IdentityGovernanceRepository,
  ) {}

  async invitePatient(
    input: CreatePatientInvitation &
      Readonly<{ email: string; redirectTo: string; observedAt: Date }>,
  ): Promise<IdentityInvitation> {
    const invitation = await this.repository.createPatientInvitation(input);
    const providerSubject = await this.provider.invitePatient(input.email, input.redirectTo);

    return this.repository.bindInvitationProviderSubject(
      invitation.id,
      providerSubject,
      input.observedAt,
    );
  }

  async requestPatientRecovery(
    input: Omit<CreateRecoveryCase, "recoveryClass"> &
      Readonly<{ email: string; redirectTo: string }>,
  ): Promise<IdentityRecoveryCase> {
    const recoveryCase = await this.repository.createRecoveryCase({
      ...input,
      recoveryClass: "patient",
    });
    await this.provider.requestRecovery(input.email, input.redirectTo);
    return recoveryCase;
  }
}
