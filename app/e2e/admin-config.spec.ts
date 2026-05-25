import { test, expect } from "@playwright/test";

/**
 * E2E: admin login → buka /admin/config → edit value → verifikasi tersimpan.
 *
 * NOTE: di-skip sampai Agent 10 selesai admin panel.
 */
test.describe("Admin config", () => {
  test.skip("admin dapat mengedit nilai app_config", async ({ page }) => {
    // Login admin (bootstrap email).
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("admin@nubuat.local");
    await page.getByLabel(/password/i).fill("Sains-di-balik-trade-123");
    await page.getByRole("button", { name: /masuk/i }).click();

    await page.goto("/admin/config");
    await expect(page.getByRole("heading", { name: /konfigurasi/i })).toBeVisible();

    // Edit `app.tagline`.
    const row = page.getByTestId("config-row-app.tagline");
    await row.getByRole("button", { name: /edit/i }).click();
    const newTagline = `Tagline diuji ${Date.now()}`;
    await page.getByLabel(/value/i).fill(newTagline);
    await page.getByRole("button", { name: /simpan|save/i }).click();

    await expect(page.getByText(/berhasil disimpan/i)).toBeVisible();
    await page.reload();
    await expect(row.getByText(newTagline)).toBeVisible();
  });
});
