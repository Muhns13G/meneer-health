import type { PatientPortalService, PortalContext } from "./patient-portal-service";
import type { PatientSessionProof } from "./patient-session-service";
import {
  patientRightsCommandSchema,
  patientRightsResultSchema,
  type PatientRightsCommand,
  type PatientRightsResult,
} from "@/domain/identity/patient-rights";
import { IdentityRejectedError, IdentityUnavailableError } from "./managed-identity-provider";

export interface PatientRightsRepository {
  execute(context: PortalContext, command: PatientRightsCommand): Promise<PatientRightsResult>;
}
export class PatientRightsService {
  constructor(
    private readonly portal: Pick<PatientPortalService, "authorise">,
    private readonly repository: PatientRightsRepository,
  ) {}
  async execute(proof: PatientSessionProof, input: unknown) {
    const command = patientRightsCommandSchema.safeParse(input);
    if (!command.success) throw new IdentityRejectedError();
    const { context } = await this.portal.authorise(proof);
    // The transaction rechecks live authority, versions and replay before writing any fact.
    const result = patientRightsResultSchema.safeParse(
      await this.repository.execute(context, command.data),
    );
    if (
      !result.success ||
      result.data.outcome !== (command.data.action === "correct" ? "corrected" : "received")
    )
      throw new IdentityUnavailableError();
    return result.data;
  }
}
