import { test, expect } from "@playwright/test";

test.skip("magic link flow is app-specific and requires email; skipped in CI", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("Logga in")).toBeVisible();
});

test("renders dashboard title (behind auth, expect redirect)", async ({ page }) => {
  await page.goto("/");
  // Should redirect to /login if not authenticated
  await expect(page).toHaveURL(/login/);
});
