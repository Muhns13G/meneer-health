import { z } from "zod";
import {
  intakeAnswersSchema,
  submittedIntake,
  intakeScopeSchema,
  intakeVersion,
  intakeControlVersion,
  type IntakeScope,
  type IntakeAnswers,
} from "../../../contracts/medical-intake";
import type { PatientPortalService, PortalContext } from "../identity/patient-portal-service";
import type { PatientSessionProof } from "../identity/patient-session-service";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "../identity/managed-identity-provider";

export const intakePatientCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read"), intakeId: z.uuid().nullable() }).strict(),
  z.object({ action: z.literal("rights_read") }).strict(),
  z
    .object({
      action: z.enum(["save", "save_amendment", "submit", "amend"]),
      intakeId: z.uuid(),
      expectedVersion: z.number().int().min(0),
      publicationId: z.uuid(),
      privacyAcknowledged: z.literal(true),
      requestKey: z.uuid(),
      answers: intakeAnswersSchema,
    })
    .strict(),
  z.object({ action: z.literal("export"), intakeId: z.uuid() }).strict(),
  z
    .object({
      action: z.literal("authorise_transfer"),
      intakeId: z.uuid(),
      snapshotId: z.uuid(),
      publicationId: z.uuid(),
      requestKey: z.uuid(),
    })
    .strict(),
  z
    .object({
      action: z.literal("restrict"),
      intakeId: z.uuid(),
      expectedVersion: z.number().int().min(1),
      requestKey: z.uuid(),
    })
    .strict(),
]);
export type IntakePatientCommand = z.infer<typeof intakePatientCommandSchema>;
export const intakePayloadSchema = z
  .object({
    answers: intakeAnswersSchema,
    contact: z
      .object({
        email: z.email(),
        mobile: z.string().regex(/^\+[1-9][0-9]{1,14}$/),
        profileVersion: z.number().int().positive(),
      })
      .strict(),
  })
  .strict();
export const intakeStoredViewSchema = z
  .object({
    record: z
      .object({
        id: z.uuid(),
        caseId: z.uuid(),
        version: z.number().int().min(1),
        snapshotId: z.uuid(),
        envelope: z.unknown(),
        state: z.enum(["draft", "submitted"]),
        hasSubmitted: z.boolean(),
        safetyHold: z.boolean(),
        expiresAt: z.iso.datetime({ offset: true }),
      })
      .strict()
      .nullable(),
    publication: z
      .object({
        id: z.uuid(),
        catalogueHash: z.string().regex(/^[a-f0-9]{64}$/),
        privacy: z.string().min(1).max(20000),
        reviewDeclaration: z.string().min(1).max(20000),
        recipientReference: z.uuid(),
        urgentGuidance: z.string().min(1).max(4000),
        afterHoursGuidance: z.string().min(1).max(4000),
        transferNotice: z.string().min(1).max(20000).nullable(),
      })
      .strict(),
    profile: z
      .object({
        givenName: z.string(),
        familyName: z.string(),
        verifiedEmail: z.email(),
        mobileE164: z.string(),
        mobileVerificationStatus: z.string(),
        contactPreference: z.string(),
        status: z.literal("active"),
        version: z.number(),
        createdAt: z.string(),
        updatedAt: z.string(),
      })
      .strict(),
  })
  .strict();
export const intakeWriteResultSchema = z
  .object({
    intakeId: z.uuid(),
    caseId: z.uuid(),
    version: z.number().int().positive(),
    snapshotId: z.uuid(),
    state: z.enum(["draft", "submitted", "restricted"]),
    safetyHold: z.boolean(),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export const intakePatientViewSchema = z
  .object({
    record: intakeStoredViewSchema.shape.record
      .unwrap()
      .omit({ envelope: true })
      .extend({ answers: intakeAnswersSchema })
      .strict()
      .nullable(),
    publication: intakeStoredViewSchema.shape.publication,
    contact: intakePayloadSchema.shape.contact,
    expiresAt: z.number().int().positive(),
  })
  .strict();
export type IntakePatientView = z.infer<typeof intakePatientViewSchema>;
export const intakeHistoryEntrySchema = z
  .object({
    snapshotId: z.uuid(),
    version: z.number().int().positive(),
    envelope: z.unknown(),
    publicationId: z.uuid(),
    profileVersion: z.number().int().positive(),
    signatureAt: z.iso.datetime({ offset: true }),
    previousSnapshotId: z.uuid().nullable(),
  })
  .strict();
export const intakeExportSchema = z
  .object({
    record: intakePatientViewSchema.shape.record
      .unwrap()
      .extend({
        state: z.enum(["draft", "submitted", "restricted", "deleted"]),
        answers: intakeAnswersSchema.nullable(),
      })
      .nullable(),
    publication: intakeStoredViewSchema.shape.publication,
    contact: intakePayloadSchema.shape.contact,
    expiresAt: z.number().int().positive(),
    history: z
      .array(
        intakeHistoryEntrySchema.omit({ envelope: true }).extend({
          answers: intakeAnswersSchema.nullable(),
          contact: intakePayloadSchema.shape.contact.nullable(),
        }),
      )
      .max(100),
  })
  .strict();
export interface IntakeRepository {
  read(context: PortalContext, id: string | null): Promise<unknown>;
  exportView(context: PortalContext, id: string): Promise<unknown>;
  rightsRecord(context: PortalContext): Promise<unknown>;
  write(context: PortalContext, value: Record<string, unknown>): Promise<unknown>;
  restrict(context: PortalContext, id: string, version: number, key: string): Promise<unknown>;
  history(context: PortalContext, id: string): Promise<unknown>;
  authoriseTransfer(
    context: PortalContext,
    command: { intakeId: string; snapshotId: string; publicationId: string; requestKey: string },
  ): Promise<unknown>;
}
export interface MedicalEnvelope {
  encrypt(value: unknown, scope: IntakeScope): Promise<unknown>;
  decrypt(value: unknown, scope: IntakeScope): Promise<unknown>;
  digests(value: unknown): Promise<string[]>;
}
export class IntakeConflictError extends Error {
  constructor() {
    super("INTAKE_CONFLICT");
  }
}
export class IntakeValidationError extends Error {
  constructor() {
    super("INTAKE_INVALID");
  }
}
export class MedicalIntakeService {
  constructor(
    private readonly portal: Pick<PatientPortalService, "authorise">,
    private readonly repository: IntakeRepository,
    private readonly envelope: MedicalEnvelope,
    private readonly catalogueHash: string,
    private readonly now = () => new Date(),
  ) {}
  private scope(c: PortalContext, id: string, snapshot: string) {
    return intakeScopeSchema.parse({
      tenantId: c.tenantId,
      subjectId: c.subjectId,
      intakeId: id,
      snapshotId: snapshot,
      collectionVersion: intakeVersion,
      controlVersion: intakeControlVersion,
    });
  }
  async execute(proof: PatientSessionProof, input: unknown) {
    const p = intakePatientCommandSchema.safeParse(input);
    if (!p.success) throw new IntakeValidationError();
    const command = p.data;
    const { context, session, identity } = await this.portal.authorise(proof);
    const deadline = Math.min(
      proof.providerExpiresAt,
      session.idleExpiresAt.getTime(),
      session.absoluteExpiresAt.getTime(),
      identity.expiresAt.getTime(),
    );
    if (command.action === "rights_read") {
      const record = z
        .object({
          intakeId: z.uuid(),
          state: z.enum(["draft", "submitted", "restricted", "deleted"]),
        })
        .strict()
        .nullable()
        .parse(await this.repository.rightsRecord(context));
      await this.portal.authorise(proof);
      return { record, expiresAt: deadline };
    }
    if (command.action === "export") {
      const stored = intakeStoredViewSchema
        .extend({
          record: intakeStoredViewSchema.shape.record
            .unwrap()
            .extend({ state: z.enum(["draft", "submitted", "restricted", "deleted"]) }),
        })
        .parse(await this.repository.exportView(context, command.intakeId));
      const record = stored.record;
      const payload =
        record.envelope === null
          ? null
          : intakePayloadSchema.parse(
              await this.envelope.decrypt(
                record.envelope,
                this.scope(context, command.intakeId, record.snapshotId),
              ),
            );
      const rows = z
        .array(intakeHistoryEntrySchema)
        .max(100)
        .parse(await this.repository.history(context, command.intakeId));
      const history = [];
      for (const row of rows) {
        const decrypted =
          row.envelope === null
            ? { answers: null, contact: null }
            : intakePayloadSchema.parse(
                await this.envelope.decrypt(
                  row.envelope,
                  this.scope(context, command.intakeId, row.snapshotId),
                ),
              );
        const { envelope: _envelope, ...receipt } = row;
        history.push({ ...receipt, ...decrypted });
      }
      const checked = intakeStoredViewSchema
        .extend({
          record: intakeStoredViewSchema.shape.record
            .unwrap()
            .extend({ state: z.enum(["draft", "submitted", "restricted", "deleted"]) }),
        })
        .parse(await this.repository.exportView(context, command.intakeId));
      if (JSON.stringify(checked.record) !== JSON.stringify(record))
        throw new IdentityRejectedError();
      await this.portal.authorise(proof);
      const { envelope: _currentEnvelope, ...currentReceipt } = record;
      return intakeExportSchema.parse({
        record: { ...currentReceipt, answers: payload?.answers ?? null },
        publication: stored.publication,
        contact: payload?.contact ?? {
          email: stored.profile.verifiedEmail,
          mobile: stored.profile.mobileE164,
          profileVersion: stored.profile.version,
        },
        history,
        expiresAt: deadline,
      });
    }
    // Restriction is idempotent even once ordinary patient reads are denied.
    if (command.action === "restrict") {
      const result = intakeWriteResultSchema.parse(
        await this.repository.restrict(
          context,
          command.intakeId,
          command.expectedVersion,
          command.requestKey,
        ),
      );
      await this.portal.authorise(proof);
      return result;
    }
    const view = intakeStoredViewSchema.safeParse(
      await this.repository.read(
        context,
        command.action === "read"
          ? command.intakeId
          : command.action === "save" && command.expectedVersion === 0
            ? null
            : command.intakeId,
      ),
    );
    if (!view.success || view.data.publication.catalogueHash !== this.catalogueHash)
      throw new IdentityUnavailableError();
    const v = view.data;
    if (command.action === "authorise_transfer") {
      if (
        command.publicationId !== v.publication.id ||
        command.snapshotId !== v.record?.snapshotId ||
        !v.publication.transferNotice
      )
        throw new IdentityRejectedError();
      const reference = z.uuid().parse(await this.repository.authoriseTransfer(context, command));
      await this.portal.authorise(proof);
      return { reference, outcome: "recorded" as const };
    }
    if (command.action === "read") {
      const payload = v.record
        ? intakePayloadSchema.parse(
            await this.envelope.decrypt(
              v.record.envelope,
              this.scope(context, v.record.id, v.record.snapshotId),
            ),
          )
        : null;
      const result = {
        record: v.record ? { ...v.record, envelope: undefined, answers: payload!.answers } : null,
        publication: v.publication,
        contact: payload?.contact ?? {
          email: v.profile.verifiedEmail,
          mobile: v.profile.mobileE164,
          profileVersion: v.profile.version,
        },
        expiresAt: Math.min(
          proof.providerExpiresAt,
          session.idleExpiresAt.getTime(),
          session.absoluteExpiresAt.getTime(),
          identity.expiresAt.getTime(),
        ),
      };
      await this.portal.authorise(proof);
      return result;
    }
    if (command.publicationId !== v.publication.id) throw new IdentityRejectedError();
    let answers: IntakeAnswers;
    try {
      answers = ["save", "save_amendment"].includes(command.action)
        ? intakeAnswersSchema.parse(command.answers)
        : submittedIntake(command.answers, this.now());
    } catch {
      throw new IntakeValidationError();
    }
    const snapshotId = crypto.randomUUID();
    const safetyFlag = answers.mental_safety === "yes" || answers.sti_symptoms === "yes";
    // Bind contact to verified account, not browser-supplied identity fields.
    const payload = {
      answers,
      contact: {
        email: v.profile.verifiedEmail,
        mobile: v.profile.mobileE164,
        profileVersion: v.profile.version,
      },
    };
    const replayDigests = await this.envelope.digests({
      tenantId: context.tenantId,
      subjectId: context.subjectId,
      ...command,
      answers,
      payload,
    });
    const result = intakeWriteResultSchema.safeParse(
      await this.repository.write(context, {
        action: command.action,
        intakeId: command.intakeId,
        publicationId: command.publicationId,
        expectedVersion: command.expectedVersion,
        requestKey: command.requestKey,
        snapshotId,
        envelope: await this.envelope.encrypt(
          payload,
          this.scope(context, command.intakeId, snapshotId),
        ),
        safetyFlag,
        digest: replayDigests[0],
        replayDigests,
      }),
    );
    if (!result.success || result.data.intakeId !== command.intakeId)
      throw new IdentityUnavailableError();
    await this.portal.authorise(proof);
    return result.data;
  }
}
