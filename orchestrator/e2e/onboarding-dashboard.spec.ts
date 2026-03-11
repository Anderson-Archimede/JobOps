import { expect, test } from "@playwright/test";

test.describe("Onboarding and Dashboard access", () => {
  test("can reach dashboard: either onboarding is skipped or main app is visible", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const skipButton = page.getByRole("button", {
      name: /skip setup for now/i,
    });
    const dashboard = page
      .getByRole("button", { name: /run pipeline/i })
      .or(page.getByText("Orchestrator"));

    // Wait for either onboarding (skip button) or dashboard to appear
    await Promise.race([
      skipButton.waitFor({ state: "visible", timeout: 12_000 }),
      dashboard.waitFor({ state: "visible", timeout: 12_000 }),
    ]).catch(() => {});

    if (await skipButton.isVisible()) {
      await skipButton.click();
      await page.waitForTimeout(800);
    }

    await expect(dashboard).toBeVisible({ timeout: 15_000 });
  });
});
