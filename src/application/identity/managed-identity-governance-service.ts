import type { ManagedIdentityProvider } from "@/application/identity/managed-identity-provider";
import type {
  IdentityGovernanceRepository,
  CreateRecoveryCase,
} from "@/application/identity/identity-governance-repository";
import type { IdentityRecoveryCase } from "@/domain/access/identity";

export class ManagedIdentityGovernanceService {
  constructor(
    private readonly provider: ManagedIdentityProvider,
    private readonly repository: IdentityGovernanceRepository,
  ) {}

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
