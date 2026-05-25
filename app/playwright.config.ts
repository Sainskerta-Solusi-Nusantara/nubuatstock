import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration untuk E2E test Nubuat MVP.
 *
 * - Test directory: `e2e/`.
 * - Multi-browser: chromium, firefox, webkit + mobile viewport (Pixel 5, iPhone 13).
 * - Base URL `http://localhost:3000` (override via `BASE_URL` env saat staging).
 * - Trace `retain-on-failure`, screenshot `only-on-failure`, video `retain-on-failure`.
 * - WebServer auto-start `npm run dev` kecuali ada `BASE_URL` (assume sudah running).
 *
 * Catatan: Playwright BUKAN business runtime; config ini static — bukan dari DB.
 */
const baseURL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/*.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 13"] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
      },
  outputDir: "./test-results",
});
