import { z } from "zod";

const name = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine((value) =>
    [...value].every(
      (character) => character.charCodeAt(0) > 31 && character.charCodeAt(0) !== 127,
    ),
  );
export const activationCommandSchema = z
  .object({
    givenName: name,
    familyName: name,
    mobileE164: z.string().regex(/^\+[1-9][0-9]{1,14}$/),
    contactPreference: z.enum(["email", "whatsapp"]),
    termsPublicationId: z.uuid(),
    termsHash: z.string().regex(/^[a-f0-9]{64}$/),
    privacyPublicationId: z.uuid(),
    privacyHash: z.string().regex(/^[a-f0-9]{64}$/),
    termsAccepted: z.literal(true),
    privacyAcknowledged: z.literal(true),
    requestKey: z.uuid(),
  })
  .strict();

export type ActivationCommand = z.infer<typeof activationCommandSchema>;
export const activationDocumentSchema = z
  .object({
    publicationId: z.uuid(),
    instrumentId: z.enum(["pilot-account-terms", "pilot-privacy-notice"]),
    version: z.string().regex(/^[1-9][0-9]*\.[0-9]+$/),
    locale: z.literal("en-ZA"),
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    body: z.string().min(1).max(100000),
    effectiveAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export const activationViewSchema = z
  .object({
    verifiedEmail: z.email(),
    documents: z.array(activationDocumentSchema).length(2),
  })
  .strict()
  .refine(({ documents }) => new Set(documents.map((d) => d.instrumentId)).size === 2);
export type ActivationView = z.infer<typeof activationViewSchema>;
