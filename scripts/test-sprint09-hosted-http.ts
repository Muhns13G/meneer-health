import { proveSprint09HostedDenials } from "./lib/sprint09-hosted-http-proof";

if (process.env.SPRINT09_HOSTED_HTTP_CONFIRM !== "unauthenticated-denials-only")
  throw new Error("SPRINT09_HOSTED_HTTP_CONFIRMATION_REQUIRED");
const origin = process.env.SPRINT09_HOSTED_HTTP_ORIGIN;
if (!origin) throw new Error("SPRINT09_HOSTED_HTTP_ORIGIN_REQUIRED");
console.log(JSON.stringify(await proveSprint09HostedDenials(origin)));
