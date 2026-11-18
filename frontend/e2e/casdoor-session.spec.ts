import { expect, test } from "@playwright/test"

const accountEmail = process.env.NALA_GROW_E2E_EMAIL
const accountPassword = process.env.NALA_GROW_E2E_PASSWORD
const navigationTimeout = 20_000

test.use({
  trace: "off",
  screenshot: "off",
  video: "off",
})

test.skip(
  process.env.E2E_SERVICES_EXTERNAL !== "1",
  "Run this spec only against the documented external services",
)

test("password login keeps the authenticated route after reload", async ({ page }) => {
  test.skip(!accountEmail || !accountPassword, "Load the documented test account into the process environment")
  await page.goto("/login")
  await expect(page).toHaveURL(/\/login\/?$/, { timeout: navigationTimeout })
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible()

  await page.getByRole("textbox", { name: "Email Address" }).fill(accountEmail!)
  await page.getByRole("textbox", { name: "Password" }).fill(accountPassword!)
  const submitButton = page.getByRole("button", { name: /^Login/ })
  await submitButton.click()

  await expect(page).toHaveURL(/\/(dashboard|profile\/create)\/?$/, { timeout: navigationTimeout })
  const destination = new URL(page.url()).pathname
  if (destination === "/dashboard") {
    await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ })).toBeVisible()
  } else {
    await expect(page.getByRole("heading", { name: "Welcome to NalaGrow" })).toBeVisible()
  }

  await page.reload({ waitUntil: "domcontentloaded", timeout: navigationTimeout })
  await expect(page).toHaveURL(/\/(dashboard|profile\/create)\/?$/, { timeout: navigationTimeout })
  if (new URL(page.url()).pathname === "/dashboard") {
    await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ })).toBeVisible()
  } else {
    await expect(page.getByRole("heading", { name: "Welcome to NalaGrow" })).toBeVisible()
  }
})

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

test("Google sign-in reaches the provider without choosing an account", async ({ page }) => {
  await page.goto("/login")
  const appOrigin = new URL(page.url()).origin
  await page.getByRole("button", { name: "Continue with Google" }).click({ noWaitAfter: true })

  await expect.poll(
    () => new URL(page.url()).origin !== appOrigin,
    { timeout: navigationTimeout },
  ).toBe(true)
})
