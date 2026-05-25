import { test, expect } from "@playwright/test";

/**
 * E2E: login → dashboard → watchlist empty state visible.
 *
 * NOTE: di-skip sampai Agent 3 (auth), 6 (watchlist), 9 (dashboard shell) selesai.
 */
test.describe("Dashboard", () => {
  test.skip("user yang login melihat dashboard dengan empty state watchlist", async ({
    page,
  }) => {
    // Asumsi seeded test user — di test infra nyata, login via API helper supaya cepat.
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("seed-user@nubuat.local");
    await page.getByLabel(/password/i).fill("Sains-di-balik-trade-123");
    await page.getByRole("button", { name: /masuk/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Watchlist empty state — action-oriented dalam Bahasa Indonesia.
    await page.goto("/watchlist");
    await expect(
      page.getByText(/belum ada saham di watchlist|tambahkan saham/i),
    ).toBeVisible();
  });
});
