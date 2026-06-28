import { test, expect } from "@playwright/test"

test.describe("Design System visual baseline", () => {
  for (const tab of ["Components", "Colors", "Typography"]) {
    test(`full page: ${tab} tab`, async ({ page }) => {
      await page.goto("/design-system")
      await page.getByRole("button", { name: tab, exact: true }).click()
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot(`${tab.toLowerCase()}-tab-full.png`, {
        fullPage: true,
      })
    })
  }
})
