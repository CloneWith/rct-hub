import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Vitest configuration for RCT Hub front-end.
 *
 * Path aliases (`@/*`) come straight from `tsconfig.json` via
 * `vite-tsconfig-paths`; the old hand-rolled `tests/loader.mjs` is gone.
 *
 * Projects are declared in `vitest.workspace.ts` so `unit` (node) and
 * `component` (jsdom) can share this config while using different
 * environments and include globs.
 *
 * Coverage provider: v8. `app/graphql` (codegen output) and any `.test.*`
 * files are excluded. Thresholds are aspirational (start at 0 and ratchet up);
 * see the project plan for the ratcheting schedule.
 */
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["app/**"],
      exclude: [
        "app/graphql/**",
        "**/*.test.*",
        "app/**/layout.tsx",
        "app/**/loading.tsx",
        "app/**/error.tsx",
        "app/**/not-found.tsx",
        "app/**/route.ts",
      ],
      thresholds: {
        // Start loose; M4 turns these on as real gates.
        lines: 0,
        branches: 0,
        functions: 0,
        statements: 0,
      },
    },
  },
});