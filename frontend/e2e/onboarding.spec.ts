import { expect, test, type Page } from "@playwright/test"
import { AUTH_TOKEN_KEY } from "../src/lib/auth-constants"

test.use({
  viewport: process.env.ONBOARDING_VIEWPORT === "mobile"
    ? { width: 375, height: 812 }
    : { width: 1280, height: 900 },
})

type Scenario = "zero" | "existing" | "error"

const baby = {
  id: "baby-existing",
  name: "Maya",
  dob: "2024-01-10",
  sex: "female",
  photoUrl: "",
  createdAt: "2024-01-10T00:00:00Z",
  userId: "user-existing",
}

async function mockGraphQL(page: Page, initialScenario: Scenario) {
  let scenario = initialScenario
  let lookupAttempts = 0
  let createdBaby = false

  await page.route("**/graphql", async (route) => {
    const request = route.request().postDataJSON() as {
      query?: string
      variables?: Record<string, string>
    }
    const query = request.query || ""
    const variables = request.variables || {}
    const user = scenario === "existing" || createdBaby
      ? { id: "user-existing", email: "existing@example.com" }
      : { id: "user-zero", email: "zero@example.com" }

    if (query.includes("mutation login") || query.includes("mutation signup")) {
      scenario = variables.email === "existing@example.com" ? "existing" : "zero"
      const signedInUser = scenario === "existing"
        ? { id: "user-existing", email: "existing@example.com" }
        : { id: "user-zero", email: "zero@example.com" }
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          data: { login: { token: `token-${signedInUser.id}`, user: signedInUser } },
        }),
      })
    }

    if (query.includes("query me")) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ data: { me: user } }),
      })
    }

    if (query.includes("query babies")) {
      if (scenario === "error" && lookupAttempts++ === 0) {
        return route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ errors: [{ message: "profiles unavailable" }] }),
        })
      }

      if (scenario === "error") scenario = "existing"

      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ data: { babies: scenario === "existing" || createdBaby ? [baby] : [] } }),
      })
    }

    if (query.includes("mutation createBaby")) {
      createdBaby = true
      scenario = "existing"
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            createBaby: {
              ...baby,
              id: "baby-created",
              name: variables.name,
              dob: variables.dob,
              sex: variables.sex || "unspecified",
            },
          },
        }),
      })
    }

    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: {} }) })
  })
}

async function login(page: Page, email: string, redirect?: string) {
  await page.goto(redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login")
  await page.getByRole("textbox", { name: "Email Address" }).fill(email)
  await page.getByRole("textbox", { name: "Password" }).fill("password123")
  await page.getByRole("button", { name: /^(Login|Continue)/i }).click()
}

test("zero-profile email login is held at onboarding", async ({ page }) => {
  await mockGraphQL(page, "zero")
  await login(page, "zero@example.com", "/dashboard")

  await expect(page).toHaveURL(/\/profile\/create$/)
  await expect(page.getByRole("heading", { name: "Welcome to NalaGrow" })).toBeVisible()
})

test("existing-profile email login keeps the safe destination", async ({ page }) => {
  await mockGraphQL(page, "existing")
  await login(page, "existing@example.com", "/profile/manage")

  await expect(page).toHaveURL(/\/profile\/manage$/)
  await expect(page.getByRole("heading", { name: "Your Little Ones" })).toBeVisible()
})

test("direct protected navigation gates zero-profile users and recovers lookup errors", async ({ page }) => {
  await mockGraphQL(page, "error")
  await page.goto("/login")
  await page.context().addCookies([
    { name: AUTH_TOKEN_KEY, value: "token-user-zero", url: new URL(page.url()).origin },
  ])
  await page.goto("/dashboard")

  await expect(page.locator('p[role="alert"]')).toContainText("Your account is still signed in")
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible()

  await page.getByRole("button", { name: "Try again" }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
})

test("profile creation preserves validation and completes the manage flow", async ({ page }) => {
  await mockGraphQL(page, "zero")
  await login(page, "zero@example.com")
  await expect(page).toHaveURL(/\/profile\/create$/)

  await page.getByRole("button", { name: /Save Profile/i }).click()
  await expect(page.getByText("Please enter your baby's name.")).toBeVisible()

  await page.getByLabel("Baby's Name").fill("Luna")
  await page.getByLabel("Date of Birth").fill("2024-06-12")
  await page.getByRole("button", { name: /Save Profile/i }).click()

  await expect(page.getByText("Profile Created!")).toBeVisible()
  await expect(page).toHaveURL(/\/profile\/manage$/, { timeout: 5000 })
  await expect(page.getByRole("heading", { name: "Your Little Ones" })).toBeVisible()
})
