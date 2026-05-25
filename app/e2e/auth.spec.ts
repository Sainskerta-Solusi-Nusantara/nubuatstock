import { test, expect } from "@playwright/test";

/**
 * E2E: signup → email verification placeholder → login → logout.
 *
 * NOTE: tests di-skip secara default sampai Agent 3 selesai routing
 * `/signup`, `/login`, `/logout` dan DB tersedia di environment CI.
 * Hapus `.skip` saat dependency ready.
 */
test.describe("Auth flow", () => {
  test.skip("user dapat signup, verifikasi email, login, logout", async ({ page }) => {
    const email = `test+${Date.now()}@nubuat.local`;
    const password = "Sains-di-balik-trade-123";

    await page.goto("/signup");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/nama/i).fill("Test User");
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /daftar/i }).click();

    await expect(page).toHaveURL(/\/(dashboard|verify-email)/);

    // Email verification placeholder — di MVP token dummy, tap link langsung.
    if (page.url().includes("verify-email")) {
      await page.goto("/login");
    }

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /masuk/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole("button", { name: /logout|keluar/i }).click();
    await expect(page).toHaveURL(/\/(login|$)/);
  });
});
