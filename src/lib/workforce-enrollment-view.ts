import { z } from "zod";

// Supabase's URL-encoded TOTP QR SVG can exceed 450 KB. Keep a bounded response
// without rejecting the real provider image before authenticator enrolment.
export const workforceEnrollmentView = z
  .object({
    enrollment: z
      .object({ qrCode: z.string().max(1_000_000), secret: z.string().max(128) })
      .strict()
      .nullable(),
  })
  .strict();
