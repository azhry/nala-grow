import { expect, test } from "@playwright/test"

const navigationTimeout = 20_000

test.use({
  trace: "off",
  screenshot: "off",
  video: "off",
})

test.skip(
  process.env.E2E_SERVICES_EXTERNAL !== "1",
  "Run these route checks only against the documented external services",
)

test("callback error route offers a safe retry route", async ({ page }) => {
  await page.goto("/auth/callback?error=access_denied")
  await expect(page.getByRole("heading", { name: "Sign-in needs another try" })).toBeVisible()
  await expect(page.getByText("Google sign-in could not be completed. Please try again.", { exact: true })).toBeVisible()
  await expect(page.getByRole("link", { name: "Back to Login" })).toHaveAttribute("href", "/login")
})

test("recovery screen reaches configured Casdoor without submitting identity", async ({ page }) => {
  await page.goto("/login")
  await page.getByRole("link", { name: "Forgot Password?" }).click()
  await expect(page).toHaveURL(/\/reset-password\/?$/, { timeout: navigationTimeout })
  await expect(page.getByRole("heading", { name: "Reset through Casdoor" })).toBeVisible()

  const recoveryLink = page.getByRole("link", { name: /Continue to password reset/ })
  await expect(recoveryLink).toBeVisible()
  const href = await recoveryLink.getAttribute("href")
  expect(href).not.toBeNull()
  const recoveryUrl = new URL(href!, page.url())
  const appOrigin = new URL(page.url()).origin
  expect(recoveryUrl.origin).not.toBe(appOrigin)
  expect(recoveryUrl.pathname).toMatch(/^\/forget\/[^/]+$/)

  await recoveryLink.click({ noWaitAfter: true })
  await expect.poll(
    () => new URL(page.url()).origin !== appOrigin,
    { timeout: navigationTimeout },
  ).toBe(true)
})
