import { expect, test } from "@playwright/test";

test.describe("Monitoring Navigation", () => {
  test("clicking Monitoring in sidebar opens the monitoring page within the app", async ({
    page,
  }) => {
    // Navigate to homepage
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Handle onboarding if necessary
    const skipButton = page.getByRole("button", {
      name: /skip setup for now/i,
    });
    
    await Promise.race([
      skipButton.waitFor({ state: "visible", timeout: 8_000 }),
      page.getByRole("button", { name: /run pipeline/i }).waitFor({ state: "visible", timeout: 8_000 }),
    ]).catch(() => {});

    if (await skipButton.isVisible()) {
      await skipButton.click();
      await page.waitForTimeout(800);
    }

    // Now on the dashboard. Click "Monitoring" in the sidebar
    const monitoringLink = page.getByRole("link", { name: /^Monitoring$/i });
    await expect(monitoringLink).toBeVisible();
    await monitoringLink.click();

    // Verify it navigates to /monitoring
    await expect(page).toHaveURL(/\/monitoring/);

    // Verify we see Monitoring content
    await expect(page.getByRole('heading', { name: /Queue Health/i })).toBeVisible({ timeout: 10_000 });
  });
});
