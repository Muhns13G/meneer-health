import { z } from "zod";

const optionalSupabaseEnvironmentSchema = z
  .object({
    SUPABASE_URL: z.url().startsWith("https://").optional(),
    SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((environment, context) => {
    const hasUrl = environment.SUPABASE_URL !== undefined;
    const hasSecret = environment.SUPABASE_SECRET_KEY !== undefined;

    if (hasUrl !== hasSecret) {
      context.addIssue({
        code: "custom",
        message: "Supabase server configuration must be complete or absent.",
      });
    }
  });

export const serverEnvironmentSchema = optionalSupabaseEnvironmentSchema.transform(
  (environment) => ({
    supabase:
      environment.SUPABASE_URL && environment.SUPABASE_SECRET_KEY
        ? {
            url: environment.SUPABASE_URL,
            secretKey: environment.SUPABASE_SECRET_KEY,
          }
        : undefined,
  }),
);

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export class ServerEnvironmentConfigurationError extends Error {
  readonly code = "SERVER_ENVIRONMENT_INVALID";

  constructor() {
    super("Server configuration is invalid.");
    this.name = "ServerEnvironmentConfigurationError";
  }
}

export function validateServerEnvironment(input: unknown): ServerEnvironment {
  const result = serverEnvironmentSchema.safeParse(input);

  if (!result.success) {
    throw new ServerEnvironmentConfigurationError();
  }

  return Object.freeze(result.data);
}
