import { expect, test, type Page } from "@playwright/test"

const accountEmail = process.env.NALA_GROW_E2E_EMAIL
const accountPassword = process.env.NALA_GROW_E2E_PASSWORD
const signInMethod = process.env.NALA_GROW_E2E_SIGN_IN_METHOD ?? "password"
const interactive = process.env.NALA_GROW_E2E_INTERACTIVE === "1"
const navigationTimeout = 20_000

test.use({
  trace: "off",
  screenshot: "off",
  video: "off",
})

test.skip(
  process.env.E2E_SERVICES_EXTERNAL !== "1",
  "Run this flow only against the documented external services",
)

function pathname(page: Page): string {
  return new URL(page.url()).pathname
}

async function showPageForInspection(page: Page): Promise<void> {
  if (interactive && !page.isClosed()) await page.pause()
}

async function openLogin(page: Page): Promise<void> {
  await page.goto("/login")
  await expect.poll(() => pathname(page), { timeout: navigationTimeout }).toBe("/login")
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Email Address" })).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Password" })).toBeVisible()
}

async function showAuthenticatedHome(page: Page): Promise<void> {
  await expect.poll(() => pathname(page), { timeout: navigationTimeout }).toBe("/dashboard")
  await expect(
    page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ }),
  ).toBeVisible()
}

async function signInWithPassword(page: Page): Promise<void> {
  if (!accountEmail || !accountPassword) {
    throw new Error("The configured test account is missing from the process environment.")
  }

  await page.getByRole("textbox", { name: "Email Address" }).fill(accountEmail)
  await page.getByRole("textbox", { name: "Password" }).fill(accountPassword)
  await page.getByRole("button", { name: /^Login/ }).click()
  await showAuthenticatedHome(page)
}

async function chooseFirstVisibleGoogleAccount(page: Page): Promise<void> {
  const chooserHeading = page.getByRole("heading", { name: /choose an account/i })
  const accountChoices = page.locator('[data-identifier]:visible')
  const chooserVisible = await chooserHeading.isVisible().catch(() => false)

  if (chooserVisible && (await accountChoices.count()) > 0) {
    await accountChoices.first().click()
    return
  }

  if (!interactive) {
    throw new Error("Google needs a visible account choice or interactive browser sign-in.")
  }

  // Keep the actual provider page open when Google needs a user action.
  await page.pause()
}

async function signInWithGoogle(page: Page): Promise<void> {
  const appOrigin = new URL(page.url()).origin
  await page.getByRole("button", { name: "Continue with Google" }).click({ noWaitAfter: true })
  await expect.poll(
    () => new URL(page.url()).origin !== appOrigin,
    { timeout: navigationTimeout },
  ).toBe(true)

  await chooseFirstVisibleGoogleAccount(page)

  await expect.poll(
    () => new URL(page.url()).origin === appOrigin,
    { timeout: navigationTimeout },
  ).toBe(true)
  await showAuthenticatedHome(page)
}

async function signUpWhenNoAccountExists(page: Page): Promise<void> {
  if (!interactive) {
    throw new Error("No configured account exists. Run headed to complete signup and sign-in in the browser.")
  }

  await page.goto("/signup")
  await expect.poll(() => pathname(page), { timeout: navigationTimeout }).toBe("/signup")
  await expect(page.getByRole("heading", { name: /create.*account|sign up/i })).toBeVisible()

  // The user follows signup with sign-in in the real UI and handles any Terms acceptance.
  await page.pause()
  await showAuthenticatedHome(page)
}

test("diagram flow signs in and leaves the authenticated NalaGrow home visible", async ({ page }) => {
  if (interactive) test.setTimeout(0)

  try {
    if (!accountEmail || !accountPassword) {
      await signUpWhenNoAccountExists(page)
    } else {
      await openLogin(page)

      if (signInMethod === "password") {
        await signInWithPassword(page)
      } else if (signInMethod === "google") {
        await signInWithGoogle(page)
      } else {
        throw new Error("NALA_GROW_E2E_SIGN_IN_METHOD must be password or google.")
      }
    }

    await page.reload({ waitUntil: "domcontentloaded", timeout: navigationTimeout })
    await showAuthenticatedHome(page)

    // Pause on the real dashboard so the browser result is visible for review.
    await showPageForInspection(page)
  } catch (error) {
    // Leave failures, including provider and login errors, visible in the browser.
    await showPageForInspection(page).catch(() => undefined)
    throw error
  }
})
