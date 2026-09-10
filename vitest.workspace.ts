import { defineWorkspace } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Vitest workspace — splits unit (node) and component (jsdom) tests into
 * separate Vite roots so they can use different environments without
 * fighting over `include` globs.
 *
 * - `unit`:      `tests/unit/**.test.ts`     — node env, MSW + vi.mock
 * - `component`: `tests/component/**.test.ts` — jsdom env, RTL + Providers
 *
 * Each project needs its own plugins because Vitest workspace projects are
 * independent Vite roots; the root `vitest.config.mts` plugins don't apply.
 */
export default defineWorkspace([
  {
    plugins: [tsconfigPaths()],
    test: {
      name: "unit",
      root: ".",
      environment: "node",
      include: ["tests/unit/**/*.test.ts"],
      setupFiles: ["tests/setup.unit.ts"],
    },
  },
  {
    plugins: [react(), tsconfigPaths()],
    test: {
      name: "component",
      root: ".",
      environment: "jsdom",
      include: ["tests/component/**/*.test.{ts,tsx}"],
      setupFiles: ["tests/setup.component.ts"],
    },
  },
]);