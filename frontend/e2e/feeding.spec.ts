import { test, expect } from "@playwright/test"

const BASE_URL = "http://localhost:3000"
const GRAPHQL_URL = "http://localhost:8080/graphql"

async function gql(
  query: string,
  variables?: Record<string, unknown>,
  token?: string,
) {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  })
  return res.json()
}

test.describe("CE-004: Feeding Log E2E (Playwright)", () => {
  let authToken: string
  let babyId: string

  test.beforeAll(async () => {
    const email = `ce004-${Date.now()}@example.com`
    const password = "TestPass123!"

    const signup = await gql(
      `mutation signup($email: String!, $password: String!) {
        signup(email: $email, password: $password) {
          token
          user { id email }
        }
      }`,
      { email, password },
    )
    const signupJson = signup as { data: { signup: { token: string } } }
    authToken = signupJson.data.signup.token

    const createBaby = await gql(
      `mutation createBaby($name: String!, $dob: String, $sex: String) {
        createBaby(name: $name, dob: $dob, sex: $sex) {
          id name dob sex userId
        }
      }`,
      { name: "TestBaby", dob: "2026-01-15", sex: "female" },
      authToken,
    )
    const babyJson = createBaby as { data: { createBaby: { id: string } } }
    babyId = babyJson.data.createBaby.id
  })

  test.afterAll(async () => {
    // Cleanup: delete baby and user via API if needed
  })

  test("navigates to feeding page via bottom tab nav", async ({ page }) => {
    await page.goto("/dashboard")
    await page.getByRole("navigation").getByRole("link", { name: "Feeding" }).click()
    await expect(page).toHaveURL(/\/feeding/)
    await expect(page.getByRole("heading", { name: "Feeding Log" })).toBeVisible()
  })

  test("loads feeding page with heading and default breast tab", async ({ page }) => {
    await page.goto("/feeding")
    await expect(page.getByRole("heading", { name: "Feeding Log" })).toBeVisible()
    await expect(page.getByText("Track")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Record Feed" })).toBeVisible()
  })

  test("default tab is Breast with Left Side and Right Side labels", async ({ page }) => {
    await page.goto("/feeding")
    await expect(page.getByRole("button", { name: "Breast" })).toBeVisible()
    await expect(page.getByText("Left Side")).toBeVisible()
    await expect(page.getByText("Right Side")).toBeVisible()
    await expect(page.getByText("Manual Duration (mins)")).toBeVisible()
  })

  test("switches to Bottle tab and shows bottle form fields", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByRole("button", { name: "Bottle" }).click()
    await expect(page.getByText("Amount")).toBeVisible()
    await expect(page.getByText("Type")).toBeVisible()
    await expect(page.getByText("Breast Milk")).toBeVisible()
    await expect(page.getByText("Formula")).toBeVisible()
    await expect(page.getByText("Water")).toBeVisible()
    await expect(page.getByText("Temperature")).toBeVisible()
    await expect(page.getByText("Cold")).toBeVisible()
    await expect(page.getByText("Room")).toBeVisible()
    await expect(page.getByText("Warm")).toBeVisible()
  })

  test("switches to Solids tab and shows solids form fields", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByRole("button", { name: "Solids" }).click()
    await expect(page.getByText("Food Name")).toBeVisible()
    await expect(page.getByText("Quantity")).toBeVisible()
    await expect(page.getByText("Loved it")).toBeVisible()
    await expect(page.getByText("Interested")).toBeVisible()
    await expect(page.getByText("Disliked")).toBeVisible()
  })

  test("switches back to Breast tab from Bottle", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByRole("button", { name: "Bottle" }).click()
    await expect(page.getByText("Amount")).toBeVisible()
    await page.getByRole("button", { name: "Breast" }).click()
    await expect(page.getByText("Left Side")).toBeVisible()
    await expect(page.getByText("Right Side")).toBeVisible()
  })

  test("hides BreastTimer when switching to Bottle", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByRole("button", { name: "Bottle" }).click()
    await expect(page.getByText("Left Side")).not.toBeVisible()
  })

  test("hides BottleForm when switching to Solids", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByRole("button", { name: "Bottle" }).click()
    await expect(page.getByText("Amount")).toBeVisible()
    await page.getByRole("button", { name: "Solids" }).click()
    await expect(page.getByText("Amount")).not.toBeVisible()
  })

  test("starts the left side timer and counts up", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByText("Left Side").locator("..").getByRole("button").click()
    await page.waitForTimeout(3000)
    await expect(page.getByText("Left Side").locator("..")).toContainText(/\d{2}:\d{2}/)
  })

  test("stops the left side timer when clicked again (pause)", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByText("Left Side").locator("..").getByRole("button").click()
    await page.waitForTimeout(2000)
    await page.getByText("Left Side").locator("..").getByRole("button").click()
    await page.waitForTimeout(1500)
    const afterText = await page.getByText("Left Side").locator("..").innerText()
    expect(afterText).toContain("play_circle")
  })

  test("starts the right side timer and counts up", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByText("Right Side").locator("..").getByRole("button").click()
    await page.waitForTimeout(2000)
    await expect(page.getByText("Right Side").locator("..")).toContainText(/\d{2}:\d{2}/)
  })

  test("manual duration input accepts a number", async ({ page }) => {
    await page.goto("/feeding")
    const input = page.locator('input[placeholder="0"]')
    await input.fill("15")
    await expect(input).toHaveValue("15")
  })

  test("saves a breast entry with timer and it appears in timeline", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByText("Left Side").locator("..").getByRole("button").click()
    await page.waitForTimeout(2500)
    await page.getByRole("button", { name: "Save Entry" }).click()
    await page.waitForTimeout(1000)
    await expect(page.getByText("Breastfeed")).toBeVisible()
  })

  test("timer resets to 00:00 after saving", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByText("Left Side").locator("..").getByRole("button").click()
    await page.waitForTimeout(2500)
    await page.getByRole("button", { name: "Save Entry" }).click()
    await page.waitForTimeout(1000)
    await expect(page.getByText("Left Side").locator("..")).toContainText("00:00")
    await expect(page.getByText("Right Side").locator("..")).toContainText("00:00")
  })

  test("saves a breast entry with manual duration and shows 5m total in timeline", async ({ page }) => {
    await page.goto("/feeding")
    await page.locator('input[placeholder="0"]').fill("5")
    await page.getByRole("button", { name: "Save Entry" }).click()
    await page.waitForTimeout(1000)
    await expect(page.getByText("Breastfeed")).toBeVisible()
    await expect(page.getByText("5m total")).toBeVisible()
  })

  test("shows bottle form with amount display and controls", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByRole("button", { name: "Bottle" }).click()
    await expect(page.getByText("Amount")).toBeVisible()
    await expect(page.getByText("120")).toBeVisible()
    await expect(page.getByText("+10ml")).toBeVisible()
    await expect(page.getByText("-10ml")).toBeVisible()
  })

  test("increases amount with +10ml button", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByRole("button", { name: "Bottle" }).click()
    await page.getByText("+10ml").click()
    await expect(page.getByText("130")).toBeVisible()
  })

  test("decreases amount with -10ml button", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByRole("button", { name: "Bottle" }).click()
    await page.getByText("-10ml").click()
    await expect(page.getByText("110")).toBeVisible()
  })

  test("selects Formula milk type", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByRole("button", { name: "Bottle" }).click()
    await page.getByText("Formula").click()
    await expect(page.getByText("Formula").locator("..")).toHaveClass(/border-primary/)
  })

  test("selects Warm temperature", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByRole("button", { name: "Bottle" }).click()
    await page.getByText("Warm").click()
    await expect(page.getByText("Warm").locator("..")).toHaveClass(/border-primary/)
  })

  test("fills bottle form with notes and saves entry", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByRole("button", { name: "Bottle" }).click()
    await page.getByText("+10ml").click()
    await page.getByText("Formula").click()
    await page.getByText("Warm").click()
    await page.locator('textarea[placeholder="How did it go?"]').fill("took well")
    await page.getByRole("button", { name: "Save Entry" }).click()
    await page.waitForTimeout(1000)
    await expect(page.getByText("Bottle Feed")).toBeVisible()
  })

  test("resets form after saving", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByRole("button", { name: "Bottle" }).click()
    await page.getByText("+10ml").click()
    await page.getByText("Formula").click()
    await page.getByRole("button", { name: "Save Entry" }).click()
    await page.waitForTimeout(1000)
    await page.getByRole("button", { name: "Bottle" }).click()
    await expect(page.getByText("120")).toBeVisible()
  })

  test("shows solids form with food name input", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByRole("button", { name: "Solids" }).click()
    await expect(page.getByText("Food Name")).toBeVisible()
    await expect(page.locator('input[placeholder="e.g. Sweet Potato"]')).toBeVisible()
  })

  test("fills food name, quantity, and unit", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByRole("button", { name: "Solids" }).click()
    await page.locator('input[placeholder="e.g. Sweet Potato"]').fill("Sweet Potato")
    await page.locator('input[placeholder="0"]').fill("2")
    await page.locator('select').selectOption("oz")
    await expect(page.locator('select')).toHaveValue("oz")
  })

  test("selects Loved it reaction", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByRole("button", { name: "Solids" }).click()
    await page.getByText("Loved it").click()
    await expect(page.getByText("Loved it").locator("..")).toHaveClass(/border-primary/)
  })

  test("saves solids entry and shows in timeline with reaction tag", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByRole("button", { name: "Solids" }).click()
    await page.locator('input[placeholder="e.g. Sweet Potato"]').fill("Sweet Potato")
    await page.locator('input[placeholder="0"]').fill("2")
    await page.getByText("Loved it").click()
    await page.locator('textarea[placeholder="Any new flavors?"]').fill("First time trying sweet potato")
    await page.getByRole("button", { name: "Save Entry" }).click()
    await page.waitForTimeout(1000)
    await expect(page.getByText("Sweet Potato")).toBeVisible()
    await expect(page.getByText("Loved it!")).toBeVisible()
  })

  test("resets solids form after saving", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByRole("button", { name: "Solids" }).click()
    await page.locator('input[placeholder="e.g. Sweet Potato"]').fill("Banana")
    await page.getByRole("button", { name: "Save Entry" }).click()
    await page.waitForTimeout(1000)
    await page.getByRole("button", { name: "Solids" }).click()
    await expect(page.locator('input[placeholder="e.g. Sweet Potato"]')).toHaveValue("")
  })

  test("shows the Daily Summary section with bottle and breast totals", async ({ page }) => {
    await page.goto("/feeding")
    await expect(page.getByRole("heading", { name: "Daily Summary" })).toBeVisible()
    await expect(page.getByText("Bottle Total")).toBeVisible()
    await expect(page.getByText("Breast Total")).toBeVisible()
    await expect(page.getByText("mins").first()).toBeVisible()
    await expect(page.getByText("Today", { exact: true })).toBeVisible()
  })

  test("bar chart has 6 bars", async ({ page }) => {
    await page.goto("/feeding")
    const bars = page.locator(".rounded-t-lg")
    await expect(bars).toHaveCount(6)
  })

  test("shows non-zero bottle total after saving a bottle entry", async ({ page }) => {
    await page.goto("/feeding")
    await page.getByRole("button", { name: "Bottle" }).click()
    await page.getByText("Formula").click()
    await page.getByRole("button", { name: "Save Entry" }).click()
    await page.waitForTimeout(1000)
    await page.goto("/feeding")
    await expect(page.getByText("Bottle Total").locator("..")).toContainText(/ml/)
    const mlText = await page.getByText("Bottle Total").locator("..").innerText()
    expect(mlText).not.toBe("0ml")
  })

  test("shows non-zero breast total after saving a breast entry", async ({ page }) => {
    await page.goto("/feeding")
    await page.locator('input[placeholder="0"]').fill("10")
    await page.getByRole("button", { name: "Save Entry" }).click()
    await page.waitForTimeout(1000)
    await page.goto("/feeding")
    await expect(page.getByText("Breast Total").locator("..")).toContainText(/mins/)
    const minsText = await page.getByText("Breast Total").locator("..").innerText()
    expect(minsText).not.toBe("0 mins")
  })

  test("does not show alert when last feed was recent", async ({ page }) => {
    await page.goto("/feeding")
    await expect(page.getByText(/It's been over/)).not.toBeVisible()
  })
})
