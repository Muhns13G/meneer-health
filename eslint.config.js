import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      ".output",
      ".vinxi",
      ".archive/**",
      ".wrangler/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "src/routeTree.gen.ts",
      "supabase/.temp/**",
      "worker-configuration.d.ts",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          reportUsedIgnorePattern: true,
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["contracts/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/**", "../src/**", "../../src/**", "react", "react/**", "@tanstack/**"],
              message:
                "Canonical contracts must remain independent of UI, framework, route, and adapter code.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/domain/**/*.ts", "src/domain/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/routes/**",
                "@/components/**",
                "@/adapters/**",
                "react",
                "react/**",
                "@tanstack/**",
              ],
              message:
                "Domain code may depend on canonical contracts, but not routes, UI, frameworks, or adapters.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/application/**/*.ts", "src/application/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/routes/**", "@/components/**", "@/adapters/**", "react", "react/**"],
              message:
                "Application code may use domain contracts and ports, but not routes, UI, or concrete adapters.",
            },
          ],
        },
      ],
    },
  },
  eslintPluginPrettier,
);
