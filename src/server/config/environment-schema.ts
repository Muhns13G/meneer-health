import { z } from "zod";

// Task 5.3 intentionally requires no server secret. Add named fields only with a real consumer.
export const serverEnvironmentSchema = z.object({}).strict();

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
