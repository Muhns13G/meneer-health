import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { validatePublicBuildEnvironment } from "../../config/public-environment";

export default defineConfig({
  envDir: false,
  define: { MENEER_PUBLIC_ENV: JSON.stringify(validatePublicBuildEnvironment({})) },
  build: { outDir: "dist-product-rehearsal" },
  plugins: [
    cloudflare({
      configPath: "operations/product-rehearsal/wrangler.jsonc",
      viteEnvironment: { name: "ssr" },
    }),
    tailwindcss(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "./product-rehearsal-server.ts" },
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    react(),
  ],
  resolve: {
    alias: { "@": resolve("src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
});
