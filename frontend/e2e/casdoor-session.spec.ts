import { randomBytes, randomUUID } from "node:crypto"
import { expect, test, type Page } from "@playwright/test"

type Account = { email: string; password: string }
type AuthOutcome = "authenticated" | "rejected" | null

const configuredEmail = process.env.NALA_GROW_E2E_EMAIL
const configuredPassword = process.env.NALA_GROW_E2E_PASSWORD
const signInMethod = process.env.NALA_GROW_E2E_SIGN_IN_METHOD ?? "password"
const startWithSignup = process.env.NALA_GROW_E2E_START_WITH_SIGNUP === "1"
const acceptTerms = process.env.NALA_GROW_E2E_ACCEPT_TERMS === "1"
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

function configuredAccount(): Account | null {
  if (Boolean(configuredEmail) !== Boolean(configuredPassword)) {
    throw new Error("The configured E2E email/password pair is incomplete.")
  }
  return configuredEmail && configuredPassword
    ? { email: configuredEmail, password: configuredPassword }
    : null
}

function createDisposableAccount(): Account {
  const password = `NalaGrow-${randomBytes(18).toString("base64url")}a1!`
  return {
    email: `nala-grow-e2e-${randomUUID()}@example.test`,
    password,
  }
}

async function openLogin(page: Page): Promise<void> {
  await page.goto("/login")
  await expect.poll(() => pathname(page), { timeout: navigationTimeout }).toBe("/login")
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Email Address" })).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Password" })).toBeVisible()
}

async function waitForAuthOutcome(page: Page, errorSelector: string): Promise<AuthOutcome> {
  return Promise.race([
    page.waitForURL(
      (url) => ["/dashboard", "/profile/create"].includes(url.pathname),
      { timeout: navigationTimeout },
    ).then(() => "authenticated" as const).catch(() => null),
    page.waitForFunction(
      (selector) => Boolean(document.querySelector(selector)?.textContent?.trim()),
      errorSelector,
      { timeout: navigationTimeout },
    )
      .then(() => "rejected" as const).catch(() => null),
  ])
}

async function signInWithPassword(page: Page, account: Account): Promise<AuthOutcome> {
  await openLogin(page)
  await page.getByRole("textbox", { name: "Email Address" }).fill(account.email)
  await page.getByRole("textbox", { name: "Password" }).fill(account.password)
  await page.getByRole("button", { name: /^Login/ }).click()
  const outcome = await waitForAuthOutcome(page, '[data-testid="login-error"]')
  if (!outcome) {
    throw new Error("Password sign-in did not reach the authenticated app or show a login error.")
  }
  return outcome
}

async function signUpWithPassword(page: Page, account: Account): Promise<AuthOutcome> {
  await page.goto("/signup")
  await expect.poll(() => pathname(page), { timeout: navigationTimeout }).toBe("/signup")
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible()
  await page.getByRole("textbox", { name: "Email Address" }).fill(account.email)
  await page.getByRole("textbox", { name: "Password" }).fill(account.password)

  if (!acceptTerms) {
    throw new Error(
      "Signup requires NALA_GROW_E2E_ACCEPT_TERMS=1 after the user authorizes Terms acceptance for this run.",
    )
  }

  await page.getByRole("checkbox").check()
  await page.getByRole("button", { name: "Create Account" }).click()
  const signupError = page.locator("form p[role=\"alert\"]")
  const outcome = await waitForAuthOutcome(page, "form p[role=\"alert\"]")
  if (!outcome) {
    throw new Error("Signup did not reach the authenticated app or show a signup error.")
  }

  if (outcome === "rejected") {
    const message = (await signupError.innerText()).trim()
    if (/already exists|already registered|log in instead/i.test(message)) return "rejected"
    throw new Error(`Signup was rejected: ${message}`)
  }
  return outcome
}

async function chooseFirstVisibleGoogleAccount(page: Page): Promise<void> {
  const chooserHeading = page.getByRole("heading", { name: /choose an account/i })
  const accountChoices = page.locator("[data-identifier]:visible")
  const chooserVisible = await chooserHeading.isVisible().catch(() => false)

  if (chooserVisible && (await accountChoices.count()) > 0) {
    await accountChoices.first().click()
    return
  }

  // Google sign-in is the only flow that may need a person to complete a provider screen.
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
}

async function completeRequiredProfile(page: Page): Promise<void> {
  if (pathname(page) !== "/profile/create") return

  const name = `NalaGrow E2E Baby ${randomUUID().slice(0, 8)}`
  const dob = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  await page.getByRole("textbox", { name: "Baby's Name" }).fill(name)
  await page.getByLabel("Date of Birth").fill(dob)
  await page.getByRole("button", { name: "Save Profile" }).click()
  await expect(page.getByText("Profile Created!")).toBeVisible()
  await expect.poll(() => pathname(page), { timeout: navigationTimeout }).toBe("/profile/manage")
  await page.goto("/dashboard")
}

async function assertDashboard(page: Page): Promise<void> {
  await completeRequiredProfile(page)
  await expect.poll(() => pathname(page), { timeout: navigationTimeout }).toBe("/dashboard")
  await expect(
    page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ }),
  ).toBeVisible()
}

async function signUpWithUniqueAccount(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const account = createDisposableAccount()
    const outcome = await signUpWithPassword(page, account)
    if (outcome === "authenticated") return
  }

  throw new Error("Three unique disposable E2E accounts were rejected during signup.")
}

test("diagram flow signs in or signs up and reaches the authenticated NalaGrow home", async ({ page }) => {
  test.setTimeout(signInMethod === "google" ? 0 : 120_000)

  if (signInMethod === "google") {
    await openLogin(page)
    await signInWithGoogle(page)
  } else if (signInMethod === "password") {
    if (startWithSignup) {
      await signUpWithUniqueAccount(page)
    } else {
      const account = configuredAccount()
      if (!account) {
        await signUpWithUniqueAccount(page)
      } else {
        const outcome = await signInWithPassword(page, account)
        if (outcome === "rejected") await signUpWithUniqueAccount(page)
      }
    }
  } else {
    throw new Error("NALA_GROW_E2E_SIGN_IN_METHOD must be password or google.")
  }

  await assertDashboard(page)
  await page.reload({ waitUntil: "domcontentloaded", timeout: navigationTimeout })
  await assertDashboard(page)
})
