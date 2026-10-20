import "@tanstack/react-start/server-only";
import { env } from "cloudflare:workers";
import app from "./server";
import { createProductRehearsalBoundary } from "./server/security/product-rehearsal-boundary";

// No scheduled export and no production entry import of this wrapper.
export default {
  fetch: (...args: Parameters<typeof app.fetch>) =>
    createProductRehearsalBoundary(
      (request) => {
        if (new URL(request.url).pathname.startsWith("/assets/")) {
          const assets = (env as unknown as { REHEARSAL_ASSETS?: Fetcher }).REHEARSAL_ASSETS;
          return assets
            ? assets.fetch(request)
            : Promise.resolve(new Response(null, { status: 503 }));
        }
        return Promise.resolve(app.fetch(request, args[1]));
      },
      env as unknown as Record<string, unknown>,
    )(args[0]),
};
