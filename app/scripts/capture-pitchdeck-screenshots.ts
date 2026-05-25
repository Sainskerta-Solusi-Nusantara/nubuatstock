/**
 * Capture screenshot setiap halaman fitur Nubuat untuk Pitchdeck PDF.
 *
 * Pre-req:
 *   - Dev server running di http://localhost:3000
 *   - User demo `user@nubuat.local` ada di DB (lihat scripts/seed-demo-users.ts)
 *
 * Usage:
 *   npm exec tsx -- scripts/capture-pitchdeck-screenshots.ts
 *
 * Output:
 *   public/pitchdeck/screenshots/<slug>.png (1280×800, full viewport)
 *
 * Idempotent — overwrite existing. Aman dijalankan ulang setiap ada perubahan UI.
 */
import { chromium, type Page } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { PITCHDECK_FEATURES } from "../lib/pitchdeck/features";

const BASE_URL = process.env.PITCHDECK_BASE_URL ?? "http://localhost:3000";
const DEMO_EMAIL = process.env.PITCHDECK_DEMO_EMAIL ?? "user@nubuat.local";
const DEMO_PASSWORD = process.env.PITCHDECK_DEMO_PASSWORD ?? "NubuatUser2026!";
const OUT_DIR = join(process.cwd(), "public", "pitchdeck", "screenshots");

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(DEMO_EMAIL);
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 }),
    page.locator('button[type="submit"]').click(),
  ]);
}

async function captureOne(page: Page, slug: string, path: string): Promise<void> {
  const url = `${BASE_URL}${path}`;
  console.log(`  → ${slug.padEnd(20)} ${url}`);
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
  } catch {
    // networkidle bisa timeout di page dengan SSE/streaming — fallback ke load
    await page.goto(url, { waitUntil: "load", timeout: 30_000 });
  }
  // Beri waktu untuk chart/AI render. Ticker page paling berat — kasih 2s.
  await page.waitForTimeout(slug === "ticker-detail" ? 2500 : 1200);
  await page.screenshot({
    path: join(OUT_DIR, `${slug}.png`),
    fullPage: false,
    type: "png",
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`📸 Capturing ${PITCHDECK_FEATURES.length} feature screenshots...`);
  console.log(`   BASE_URL: ${BASE_URL}`);
  console.log(`   Output:   ${OUT_DIR}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2, // retina untuk PDF embed yang tajam
    colorScheme: "light",
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
  });
  const page = await context.newPage();

  try {
    await login(page);
    console.log("  ✓ Logged in\n");

    let ok = 0;
    let fail = 0;
    for (const feature of PITCHDECK_FEATURES) {
      try {
        await captureOne(page, feature.slug, feature.path);
        ok++;
      } catch (err) {
        console.error(`  ✗ ${feature.slug}: ${(err as Error).message}`);
        fail++;
      }
    }
    console.log(`\n✅ Done. OK: ${ok}, Fail: ${fail}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(99);
});
