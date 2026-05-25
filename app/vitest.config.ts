import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Vitest configuration untuk Nubuat MVP.
 *
 * Konvensi:
 * - Unit & integration tests di `tests/**`. File extension `.test.ts` / `.test.tsx`.
 * - E2E tests di `e2e/**` (di-handle Playwright, di-exclude dari Vitest run).
 * - Default environment: `node`. Tests yang butuh DOM (React components) wajib pakai
 *   pragma `// @vitest-environment jsdom` di header file.
 * - Setup file `tests/setup.ts` — load env, polyfill, global mocks.
 * - Path alias `@/*` mengikuti `tsconfig.json`.
 * - Coverage via `v8` provider. Reporter HTML + text untuk CI.
 *
 * Catatan: timeout / parallel workers di sini bersifat static (test runner config),
 * BUKAN business config → tidak diambil dari DB.
 */

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    environmentMatchGlobs: [
      ["tests/components/**", "jsdom"],
      ["tests/**/*.tsx", "jsdom"],
    ],
    setupFiles: ["tests/setup.ts"],
    globals: false,
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "e2e/**",
      "**/*.spec.ts",
    ],
    testTimeout: 10_000,
    hookTimeout: 10_000,
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    reporters: process.env.CI ? ["default", "junit"] : ["default"],
    outputFile: process.env.CI ? { junit: "./test-results/junit.xml" } : undefined,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["lib/**/*.ts", "app/api/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/types/**",
        "**/__mocks__/**",
        "tests/**",
        "e2e/**",
      ],
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
    },
  },
  resolve: {
    alias: {
      "@": projectRoot,
    },
  },
});
