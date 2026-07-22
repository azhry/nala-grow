import { expect, test } from "@playwright/test"

test.describe("Growth page", () => {
  test("responds and renders the source heading", async ({ page }) => {
    const response = await page.goto("/growth", { waitUntil: "networkidle" })

    expect(response?.status()).toBe(200)
    await expect(page.getByRole("heading", { name: /Growth Tracking - Lily/ })).toBeVisible()
  })
})
