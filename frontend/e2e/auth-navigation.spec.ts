import { expect, test } from "@playwright/test"

test("login Create an account CTA navigates to signup", async ({ page }) => {
  await page.goto("/login")

  await page.getByRole("link", { name: "Create an account" }).click()

  await expect(page).toHaveURL(/\/signup$/)
  await expect(page.getByRole("heading", { name: /Create your account/i })).toBeVisible()
})
