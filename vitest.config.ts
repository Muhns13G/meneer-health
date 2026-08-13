import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] }), react()],
  resolve: {
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  test: {
    clearMocks: true,
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "https://meneer.test.invalid/",
      },
    },
    fileParallelism: false,
    include: ["content/**/*.test.ts", "contracts/**/*.test.ts", "src/**/*.test.{ts,tsx}"],
    mockReset: true,
    passWithNoTests: false,
    restoreMocks: true,
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: 5000,
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      reporter: ["text", "json-summary", "html"],
      include: ["content/**/*.ts", "contracts/**/*.ts", "src/**/*.{ts,tsx}"],
      exclude: [
        "content/**/*.test.ts",
        "contracts/**/*.test.ts",
        "contracts/fixtures/**",
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/routeTree.gen.ts",
        "src/tanstack-start-env.d.ts",
      ],
    },
  },
});
