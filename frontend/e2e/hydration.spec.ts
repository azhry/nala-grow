import { test, expect } from "@playwright/test"

/**
 * Hydration Mismatch Test (QT-020)
 *
 * Navigates to all SSR routes, listens for browser console warnings,
 * and fails if any React hydration mismatch warnings are detected.
 *
 * React hydration warnings typically look like:
 *   - "Warning: Text content did not match..."
 *   - "Warning: Expected server HTML to contain..."
 *   - "Warning: Prop `%s` did not match..."
 *   - "Warning: An error occurred during hydration..."
 *   - "There was an error during hydration..."
 */

const ROUTES = ["/", "/design-system"] as const

const HYDRATION_WARNING_PATTERNS = [
  /did not match/i,
  /expected server HTML/i,
  /text content did not match/i,
  /prop.*did not match/i,
  /error during hydration/i,
  /hydration.*mismatch/i,
  /hydrating/i,
]

function isHydrationWarning(message: string): boolean {
  return HYDRATION_WARNING_PATTERNS.some((pattern) => pattern.test(message))
}

test.describe("Hydration mismatch detection", () => {
  for (const route of ROUTES) {
    test(`no hydration mismatch on ${route}`, async ({ page }) => {
      const hydrationWarnings: string[] = []

      // Listen for all console messages
      page.on("console", (msg) => {
        const text = msg.text()
        if (isHydrationWarning(text)) {
          hydrationWarnings.push(text)
        }
      })

      // Listen for page errors (uncaught exceptions)
      page.on("pageerror", (err) => {
        if (isHydrationWarning(err.message)) {
          hydrationWarnings.push(err.message)
        }
      })

      await page.goto(route, { waitUntil: "networkidle" })

      // Wait a beat for any async hydration to complete
      await page.waitForTimeout(500)

      // If we found hydration warnings, fail with details
      expect(
        hydrationWarnings,
        `Hydration warnings detected on ${route}:\n${hydrationWarnings.join("\n")}`
      ).toHaveLength(0)
    })
  }
})
