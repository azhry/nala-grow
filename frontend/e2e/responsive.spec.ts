import { test, expect } from "@playwright/test"

/**
 * Responsive Layout Test (QT-021)
 *
 * Renders all pages at 3 viewport widths (375px mobile, 768px tablet, 1280px desktop)
 * and checks for horizontal overflow, ensuring layouts are responsive.
 *
 * Viewport widths are provided by Playwright projects:
 *   - mobile  (iPhone 14):  390×844
 *   - tablet  (768×1024):    768×1024
 *   - desktop (1280×900):   1280×900
 *
 * The test uses the Playwright project name so each project runs
 * the full suite at its respective viewport.
 */

const ROUTES = [
  "/",
  "/design-system",
  "/login",
  "/signup",
  "/reset-password",
  "/dashboard",
  "/growth",
  "/feeding",
  "/sleep",
  "/milestones",
  "/profile",
  "/profile/manage",
  "/export",
] as const

/**
 * Checks that the page has no horizontal overflow.
 * The document body should fit within the viewport width.
 */
async function checkNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth
  })
  expect(hasOverflow, "Page should not have horizontal overflow").toBe(false)
}

/**
 * Checks that the page rendered with meaningful content (not a blank page).
 */
async function checkPageHasContent(page: import("@playwright/test").Page) {
  // Wait for the page to settle
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(300)

  // The body should have at least some visible text or an element
  const bodyText = await page.locator("body").innerText()
  expect(bodyText.trim().length, "Page body should contain text").toBeGreaterThan(0)
}

test.describe("Responsive layout", () => {
  for (const route of ROUTES) {
    test.describe(`Route: ${route}`, () => {
      test("loads without errors", async ({ page }) => {
        const res = await page.request.get(route)
        expect(res.status()).toBe(200)
      })

      test("has no horizontal overflow", async ({ page }) => {
        await page.goto(route, { waitUntil: "networkidle" })
        await page.waitForTimeout(500)
        await checkNoHorizontalOverflow(page)
      })

      test("has visible content", async ({ page }) => {
        await page.goto(route, { waitUntil: "networkidle" })
        await checkPageHasContent(page)
      })
    })
  }
})
