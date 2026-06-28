import { test, expect } from "@playwright/test"

test("home page renders", async ({ page }) => {
  const res = await page.request.get("/")
  expect(res.status()).toBe(200)
})
