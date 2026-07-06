import { test, expect } from "@playwright/test"

test.describe("Home page visual baseline", () => {
  test("full page", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveScreenshot("home-full.png", {
      fullPage: true,
    })
  })
})
