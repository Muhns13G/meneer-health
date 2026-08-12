import { execFileSync } from "node:child_process";

export type SupabaseIntegrationEnvironment = Readonly<{
  API_URL: string;
  PUBLISHABLE_KEY: string;
  SECRET_KEY: string;
  target: "local" | "hosted-synthetic";
}>;

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function readSupabaseIntegrationEnvironment(): SupabaseIntegrationEnvironment {
  const hosted = {
    API_URL: process.env.SUPABASE_URL?.trim(),
    PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY?.trim(),
    SECRET_KEY: process.env.SUPABASE_SECRET_KEY?.trim(),
  };
  const hostedValues = Object.values(hosted).filter(Boolean).length;

  if (hostedValues > 0) {
    invariant(
      hostedValues === 3 && hosted.API_URL && hosted.PUBLISHABLE_KEY && hosted.SECRET_KEY,
      "Hosted Supabase integration variables must be all-or-none.",
    );
    invariant(
      process.env.SUPABASE_INTEGRATION_TARGET === "hosted-synthetic",
      "Hosted Supabase tests require SUPABASE_INTEGRATION_TARGET=hosted-synthetic.",
    );
    invariant(
      hosted.API_URL?.startsWith("https://") && hosted.API_URL.endsWith(".supabase.co"),
      "Hosted Supabase URL is invalid.",
    );
    return {
      API_URL: hosted.API_URL,
      PUBLISHABLE_KEY: hosted.PUBLISHABLE_KEY,
      SECRET_KEY: hosted.SECRET_KEY,
      target: "hosted-synthetic",
    };
  }

  const stdout = execFileSync("bunx", ["supabase", "status", "-o", "json"], {
    encoding: "utf8",
  });
  const jsonStart = stdout.indexOf("{");
  invariant(jsonStart >= 0, "Local Supabase status did not return JSON.");
  const status = JSON.parse(stdout.slice(jsonStart)) as Partial<
    Omit<SupabaseIntegrationEnvironment, "target">
  >;
  invariant(
    status.API_URL && status.PUBLISHABLE_KEY && status.SECRET_KEY,
    "Local Supabase services are not running.",
  );
  return { ...status, target: "local" } as SupabaseIntegrationEnvironment;
}
