import { expect, test, type BrowserContext, type Page, type Response } from "@playwright/test"
import fs from "node:fs/promises"
import path from "node:path"

const runId = new Date().toISOString().replace(/[:.]/g, "-")
const evidenceDir = path.resolve("test-output", "azh-410", runId)
const email = `azh410-${Date.now()}@example.com`
const password = "NalaGrow-AZH410!"
const baby = { name: "Mira AZH410", dob: "2026-01-15", sex: "female" }
const bottle = { amountMl: 150, milkType: "formula", temperature: "warm", notes: `AZH-410 persisted bottle ${runId}` }

type GraphQLEvidence = {
  operation: string
  capturedAt: string
  request: { variables?: Record<string, unknown> }
  response: unknown
}

const graphql: GraphQLEvidence[] = []
const responseCaptures: Promise<void>[] = []

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [
      key,
      /token|authorization|cookie/i.test(key) ? "[REDACTED]" : sanitize(nested),
    ]))
  }
  return value
}

function captureGraphQL(page: Page) {
  page.on("console", (message) => console.log(`[browser:${message.type()}] ${message.text()}`))
  page.on("requestfailed", (request) => console.log(`[browser:requestfailed] ${request.method()} ${request.url()} ${request.failure()?.errorText}`))
  page.on("request", (request) => {
    if (request.url().includes("/graphql")) console.log(`[browser:graphql] ${request.method()} ${request.url()}`)
  })
  page.on("response", (response) => {
    if (response.url() !== "http://127.0.0.1:8080/graphql") return
    responseCaptures.push(captureResponse(response))
  })
}

async function captureResponse(response: Response) {
  const requestBody = response.request().postDataJSON() as { query?: string; variables?: Record<string, unknown> } | null
  const operation = requestBody?.query?.match(/\b(?:mutation|query)\s+(\w+)/)?.[1]
  if (!operation || !["signup", "login", "createBaby", "createFeedingSession", "feedingSessions"].includes(operation)) return
  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = { transportError: "Response body was not JSON" }
  }
  graphql.push({
    operation,
    capturedAt: new Date().toISOString(),
    request: { variables: sanitize(requestBody?.variables) as Record<string, unknown> },
    response: sanitize(body),
  })
}

async function screenshot(page: Page, filename: string) {
  await page.screenshot({ path: path.join(evidenceDir, filename), fullPage: true })
}

async function clickVisibleLink(page: Page, name: string | RegExp) {
  await page.getByRole("link", { name }).first().click()
}

test("login-led UI flow persists profile and bottle data through PostgreSQL", async ({ browser, baseURL }) => {
  test.setTimeout(180_000)
  await fs.mkdir(evidenceDir, { recursive: true })

  let signupContext: BrowserContext | undefined
  let appContext: BrowserContext | undefined
  try {
    signupContext = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const signupPage = await signupContext.newPage()
    captureGraphQL(signupPage)
    await signupPage.goto(`${baseURL}/login`)
    await expect(signupPage.getByRole("heading", { name: "NalaGrow" })).toBeVisible()
    await signupPage.getByRole("link", { name: "Create an account" }).click()
    await signupPage.waitForLoadState("networkidle")
    await signupPage.getByLabel("Email Address").fill(email)
    await signupPage.getByLabel("Password", { exact: true }).fill(password)
    await signupPage.getByLabel(/I agree to/).check()
    await signupPage.getByRole("button", { name: "Create Account" }).click()
    await expect(signupPage).toHaveURL(/\/dashboard$/)
    await screenshot(signupPage, "01-signup-dashboard.png")
    await signupContext.close()
    signupContext = undefined

    appContext = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await appContext.newPage()
    captureGraphQL(page)
    await page.goto(`${baseURL}/login`)
    await page.waitForLoadState("networkidle")

    await page.getByLabel("Email Address").fill(email)
    await page.getByLabel("Password", { exact: true }).fill("Definitely-Wrong-Password!")
    await page.getByRole("button", { name: "Login" }).click()
    await expect(page.getByTestId("login-error")).toBeVisible()
    await screenshot(page, "02-wrong-login-error.png")

    await page.getByLabel("Password", { exact: true }).fill(password)
    await page.getByRole("button", { name: "Login" }).click()
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.getByRole("link", { name: /Manage .* profile/ }).click()
    await expect(page).toHaveURL(/\/profile\/create$/)
    await page.getByLabel("Baby's Name").fill(baby.name)
    await page.getByLabel("Date of Birth").fill(baby.dob)
    await page.getByText("Female", { exact: true }).click()
    await expect(page.getByRole("radio", { name: "Female" })).toBeChecked()
    await page.getByRole("button", { name: "Save Profile" }).click()
    await expect(page.getByText("Profile Created!", { exact: false })).toBeVisible()
    await expect(page).toHaveURL(/\/profile\/manage$/, { timeout: 10_000 })
    await expect(page.getByRole("main").getByRole("heading", { name: baby.name })).toBeVisible()
    await screenshot(page, "03-profile-persisted.png")

    await clickVisibleLink(page, "Feeding")
    await expect(page).toHaveURL(/\/feeding$/)
    await page.getByRole("button", { name: "Bottle" }).click()
    await page.getByRole("slider").fill(String(bottle.amountMl))
    await page.getByText("Formula", { exact: true }).click()
    await page.getByRole("button", { name: "Warm" }).click()
    await page.getByPlaceholder("How did it go?").fill(bottle.notes)

    let failedSaveObserved = false
    await page.route("http://127.0.0.1:8080/graphql", async (route) => {
      const body = route.request().postData() ?? ""
      if (!failedSaveObserved && body.includes("createFeedingSession")) {
        failedSaveObserved = true
        await route.abort("connectionfailed")
        return
      }
      await route.continue()
    })
    await page.getByRole("button", { name: "Save Entry" }).click()
    await expect(page.getByRole("alert").filter({ hasText: "Unable to save this feeding entry" })).toBeVisible()
    await expect(page.getByPlaceholder("How did it go?")).toHaveValue(bottle.notes)
    await screenshot(page, "04-save-failure-retains-form.png")
    await page.unroute("http://127.0.0.1:8080/graphql")

    await page.getByRole("button", { name: "Save Entry" }).click()
    await expect(page.getByText("Bottle Feed").first()).toBeVisible()
    await expect(page.getByText("150ml", { exact: false }).first()).toBeVisible()
    await screenshot(page, "05-bottle-save-success.png")

    await page.reload()
    await expect(page.getByRole("heading", { name: "Feeding Log" })).toBeVisible()
    await expect(page.getByText("Bottle Feed").first()).toBeVisible()
    await expect(page.getByText("150ml", { exact: false }).first()).toBeVisible()
    await page.getByRole("tab", { name: "Records" }).click()
    await expect(page.getByText(bottle.notes)).toBeVisible()
    await screenshot(page, "06-reload-read-persisted.png")

    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByRole("navigation").getByRole("link", { name: "Feeding" })).toBeVisible()
    await screenshot(page, "07-mobile-persisted-record.png")

    await Promise.all(responseCaptures)
    const requiredOperations = ["signup", "login", "createBaby", "createFeedingSession", "feedingSessions"]
    for (const operation of requiredOperations) expect(graphql.some((item) => item.operation === operation)).toBe(true)

    const evidence = {
      issue: "AZH-410",
      runId,
      generatedAt: new Date().toISOString(),
      disposableAccount: { email, password },
      profileInput: baby,
      bottleInput: bottle,
      observableResults: {
        wrongLoginErrorVisible: true,
        failedSaveRetainedForm: failedSaveObserved,
        persistedAfterReload: true,
        desktopViewport: "1280x900",
        mobileViewport: "390x844",
      },
      graphql,
      screenshots: [
        "01-signup-dashboard.png",
        "02-wrong-login-error.png",
        "03-profile-persisted.png",
        "04-save-failure-retains-form.png",
        "05-bottle-save-success.png",
        "06-reload-read-persisted.png",
        "07-mobile-persisted-record.png",
      ],
    }
    await fs.writeFile(path.join(evidenceDir, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`)
    console.log(`AZH-410 evidence: ${path.join(evidenceDir, "evidence.json")}`)
    console.log(`AZH-410 disposable account: ${email} / ${password}`)
  } finally {
    await signupContext?.close().catch(() => {})
    await appContext?.close().catch(() => {})
  }
})
