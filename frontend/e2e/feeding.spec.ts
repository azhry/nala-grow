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

  async function seedBabyInStore(page: import("@playwright/test").Page) {
    await page.goto("/feeding")
    const evalResult = await page.evaluate(({ babyId }) => {
      const storeData = {
        user: null,
        token: null,
        activeBaby: {
          id: babyId,
          name: "TestBaby",
          dob: "2026-01-15",
          sex: "female",
          userId: "",
          photo_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        babies: [
          {
            id: babyId,
            name: "TestBaby",
            dob: "2026-01-15",
            sex: "female",
            userId: "",
            photo_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        measurements: [],
        unitSystem: "metric",
        feedSessions: [],
        sleepSessions: [],
        milestones: [],
        _hasHydrated: true,
      }
      localStorage.setItem("nalagrow-store", JSON.stringify(storeData))
      localStorage.setItem("nalagrow-test", "test-value")
      return {
        hasStore: !!localStorage.getItem("nalagrow-store"),
        hasTest: !!localStorage.getItem("nalagrow-test"),
        storePreview: JSON.stringify(JSON.parse(localStorage.getItem("nalagrow-store") || "{}").activeBaby),
      }
    }, { babyId })
    console.log("EVAL RESULT BEFORE RELOAD:", JSON.stringify(evalResult))
    await page.reload()
    const afterReload = await page.evaluate(() => {
      const raw = localStorage.getItem("nalagrow-store")
      if (!raw) return "NO_STORE"
      const parsed = JSON.parse(raw)
      return {
        hasActiveBaby: !!parsed.activeBaby,
        activeBabyId: parsed.activeBaby?.id,
        hasToken: !!parsed.token,
        fullStore: raw,
      }
    })
    console.log("AFTER RELOAD:", JSON.stringify(afterReload).slice(0, 500))
    const testValue = await page.evaluate(() => localStorage.getItem("nalagrow-test"))
    console.log("TEST VALUE AFTER RELOAD:", testValue)
  }

  async function seedFeedingSessionViaApi(
    page: import("@playwright/test").Page,
    input: {
      feedType: string
      startedAt?: string
      endedAt?: string
      leftDurationSec?: number
      rightDurationSec?: number
      amountMl?: number
      milkType?: string
      foodName?: string
      reaction?: string
      notes?: string
    },
  ) {
    const mutation = `mutation createFeedingSession($babyId: ID!, $feedType: String!, $startedAt: String, $endedAt: String, $leftDurationSec: Int, $rightDurationSec: Int, $amountMl: Float, $milkType: String, $foodName: String, $reaction: String, $notes: String) {
      createFeedingSession(babyId: $babyId, feedType: $feedType, startedAt: $startedAt, endedAt: $endedAt, leftDurationSec: $leftDurationSec, rightDurationSec: $rightDurationSec, amountMl: $amountMl, milkType: $milkType, foodName: $foodName, reaction: $reaction, notes: $notes) {
        id
        babyId
        feedType
        startedAt
        endedAt
        leftDurationSec
        rightDurationSec
        amountMl
        milkType
        foodName
        reaction
        notes
      }
    }`

    const res = await gql(mutation, { babyId, ...input }, authToken)
    return res as { data: { createFeedingSession: { id: string } } }
  }

  test("navigates to feeding page via bottom tab nav", async ({ page }) => {
    await seedBabyInStore(page)
    await page.getByRole("navigation").getByRole("link", { name: "Feeding" }).click()
    await expect(page).toHaveURL(/\/feeding/)
    await expect(page.getByRole("heading", { name: "Feeding Log" })).toBeVisible()
  })

  test("loads seeded feeding sessions from backend API", async ({ page }) => {
    console.log("BABY ID:", babyId)
    const sessionRes = await seedFeedingSessionViaApi(page, {
      feedType: "breast",
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      endedAt: new Date(Date.now() - 2700000).toISOString(),
      leftDurationSec: 300,
      rightDurationSec: 150,
    })
    console.log("SEED SESSION RESPONSE:", JSON.stringify(sessionRes).slice(0, 500))

    let graphqlCalled = false
    page.on("request", (req) => {
      if (req.url().includes("/graphql") && req.postData()?.includes("getFeedingSessions")) {
        graphqlCalled = true
        console.log("PAGE GRAPHQL CALL:", req.postData()?.slice(0, 300))
      }
    })

    await seedBabyInStore(page)
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    console.log("graphqlCalled:", graphqlCalled)

    const activeBaby = await page.evaluate(() => {
      const storeData = localStorage.getItem("nalagrow-store")
      if (!storeData) return "NO_STORE"
      try {
        const parsed = JSON.parse(storeData)
        return parsed.activeBaby?.id || "NO_ACTIVE_BABY"
      } catch {
        return "PARSE_ERROR"
      }
    })
    console.log("activeBaby in store:", activeBaby)

    await expect(page.getByText("Breastfeed")).toBeVisible()
    await expect(page.getByText("8m total")).toBeVisible()
    await expect(page.getByText("Left (5m)")).toBeVisible()
    await expect(page.getByText("Right (3m)")).toBeVisible()
  })

  test("loads feeding page with heading and default breast tab", async ({ page }) => {
    await seedBabyInStore(page)
    await expect(page.getByRole("heading", { name: "Feeding Log" })).toBeVisible()
    await expect(page.getByText("Track")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Record Feed" })).toBeVisible()
  })

  test("default tab is Breast with Left Side and Right Side labels", async ({ page }) => {
    await seedBabyInStore(page)
    await expect(page.getByRole("button", { name: "Breast" })).toBeVisible()
    await expect(page.getByText("Left Side")).toBeVisible()
    await expect(page.getByText("Right Side")).toBeVisible()
    await expect(page.getByText("Manual Duration (mins)")).toBeVisible()
  })

  test("switches to Bottle tab and shows bottle form fields", async ({ page }) => {
    await seedBabyInStore(page)
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
    await seedBabyInStore(page)
    await page.getByRole("button", { name: "Solids" }).click()
    await expect(page.getByText("Food Name")).toBeVisible()
    await expect(page.getByText("Quantity")).toBeVisible()
    await expect(page.getByText("Loved it")).toBeVisible()
    await expect(page.getByText("Interested")).toBeVisible()
    await expect(page.getByText("Disliked")).toBeVisible()
  })

  test("switches back to Breast tab from Bottle", async ({ page }) => {
    await seedBabyInStore(page)
    await page.getByRole("button", { name: "Bottle" }).click()
    await expect(page.getByText("Amount")).toBeVisible()
    await page.getByRole("button", { name: "Breast" }).click()
    await expect(page.getByText("Left Side")).toBeVisible()
    await expect(page.getByText("Right Side")).toBeVisible()
  })

  test("hides BreastTimer when switching to Bottle", async ({ page }) => {
    await seedBabyInStore(page)
    await page.getByRole("button", { name: "Bottle" }).click()
    await expect(page.getByText("Left Side")).not.toBeVisible()
  })

  test("hides BottleForm when switching to Solids", async ({ page }) => {
    await seedBabyInStore(page)
    await page.getByRole("button", { name: "Bottle" }).click()
    await expect(page.getByText("Amount")).toBeVisible()
    await page.getByRole("button", { name: "Solids" }).click()
    await expect(page.getByText("Amount")).not.toBeVisible()
  })

  test("starts the left side timer and counts up", async ({ page }) => {
    await seedBabyInStore(page)
    await page.getByText("Left Side").locator("..").getByRole("button").click()
    await page.waitForTimeout(3000)
    await expect(page.getByText("Left Side").locator("..")).toContainText(/\d{2}:\d{2}/)
  })

  test("stops the left side timer when clicked again (pause)", async ({ page }) => {
    await seedBabyInStore(page)
    await page.getByText("Left Side").locator("..").getByRole("button").click()
    await page.waitForTimeout(2000)
    await page.getByText("Left Side").locator("..").getByRole("button").click()
    await page.waitForTimeout(1500)
    const afterText = await page.getByText("Left Side").locator("..").innerText()
    expect(afterText).toContain("play_circle")
  })

  test("starts the right side timer and counts up", async ({ page }) => {
    await seedBabyInStore(page)
    await page.getByText("Right Side").locator("..").getByRole("button").click()
    await page.waitForTimeout(2000)
    await expect(page.getByText("Right Side").locator("..")).toContainText(/\d{2}:\d{2}/)
  })

  test("manual duration input accepts a number", async ({ page }) => {
    await seedBabyInStore(page)
    const input = page.locator('input[placeholder="0"]')
    await input.fill("15")
    await expect(input).toHaveValue("15")
  })

  test("saves a breast entry with timer and it appears in timeline", async ({ page }) => {
    await seedBabyInStore(page)
    await page.getByText("Left Side").locator("..").getByRole("button").click()
    await page.waitForTimeout(2500)
    await page.getByRole("button", { name: "Save Entry" }).click()
    await page.waitForTimeout(1000)
    await expect(page.getByText("Breastfeed")).toBeVisible()
  })

  test("timer resets to 00:00 after saving", async ({ page }) => {
    await seedBabyInStore(page)
    await page.getByText("Left Side").locator("..").getByRole("button").click()
    await page.waitForTimeout(2500)
    await page.getByRole("button", { name: "Save Entry" }).click()
    await page.waitForTimeout(1000)
    await expect(page.getByText("Left Side").locator("..")).toContainText("00:00")
    await expect(page.getByText("Right Side").locator("..")).toContainText("00:00")
  })

  test("saves a breast entry with manual duration and shows 5m total in timeline", async ({ page }) => {
    await seedBabyInStore(page)
    await page.locator('input[placeholder="0"]').fill("5")
    await page.getByRole("button", { name: "Save Entry" }).click()
    await page.waitForTimeout(1000)
    await expect(page.getByText("Breastfeed")).toBeVisible()
    await expect(page.getByText("5m total")).toBeVisible()
  })

  test("shows bottle form with amount display and controls", async ({ page }) => {
    await seedBabyInStore(page)
    await page.getByRole("button", { name: "Bottle" }).click()
    await expect(page.getByText("Amount")).toBeVisible()
    await expect(page.getByText("120")).toBeVisible()
    await expect(page.getByText("+10ml")).toBeVisible()
    await expect(page.getByText("-10ml")).toBeVisible()
  })

  test("increases amount with +10ml button", async ({ page }) => {
    await seedBabyInStore(page)
    await page.getByRole("button", { name: "Bottle" }).click()
    await page.getByText("+10ml").click()
    await expect(page.getByText("130")).toBeVisible()
  })

  test("decreases amount with -10ml button", async ({ page }) => {
    await seedBabyInStore(page)
    await page.getByRole("button", { name: "Bottle" }).click()
    await page.getByText("-10ml").click()
    await expect(page.getByText("110")).toBeVisible()
  })

  test("selects Formula milk type", async ({ page }) => {
    await seedBabyInStore(page)
    await page.getByRole("button", { name: "Bottle" }).click()
    await page.getByText("Formula").click()
    await expect(page.getByText("Formula").locator("..")).toHaveClass(/border-primary/)
  })

  test("selects Warm temperature", async ({ page }) => {
    await seedBabyInStore(page)
    await page.getByRole("button", { name: "Bottle" }).click()
    await page.getByText("Warm").click()
    await expect(page.getByText("Warm").locator("..")).toHaveClass(/border-primary/)
  })

  test("fills bottle form with notes and saves entry", async ({ page }) => {
    await seedBabyInStore(page)
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
    await seedBabyInStore(page)
    await page.getByRole("button", { name: "Bottle" }).click()
    await page.getByText("+10ml").click()
    await page.getByText("Formula").click()
    await page.getByRole("button", { name: "Save Entry" }).click()
    await page.waitForTimeout(1000)
    await page.getByRole("button", { name: "Bottle" }).click()
    await expect(page.getByText("120")).toBeVisible()
  })

  test("shows solids form with food name input", async ({ page }) => {
    await seedBabyInStore(page)
    await page.getByRole("button", { name: "Solids" }).click()
    await expect(page.getByText("Food Name")).toBeVisible()
    await expect(page.locator('input[placeholder="e.g. Sweet Potato"]')).toBeVisible()
  })

  test("fills food name, quantity, and unit", async ({ page }) => {
    await seedBabyInStore(page)
    await page.getByRole("button", { name: "Solids" }).click()
    await page.locator('input[placeholder="e.g. Sweet Potato"]').fill("Sweet Potato")
    await page.locator('input[placeholder="0"]').fill("2")
    await page.locator('select').selectOption("oz")
    await expect(page.locator('select')).toHaveValue("oz")
  })

  test("selects Loved it reaction", async ({ page }) => {
    await seedBabyInStore(page)
    await page.getByRole("button", { name: "Solids" }).click()
    await page.getByText("Loved it").click()
    await expect(page.getByText("Loved it").locator("..")).toHaveClass(/border-primary/)
  })

  test("saves solids entry and shows in timeline with reaction tag", async ({ page }) => {
    await seedBabyInStore(page)
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
    await seedBabyInStore(page)
    await page.getByRole("button", { name: "Solids" }).click()
    await page.locator('input[placeholder="e.g. Sweet Potato"]').fill("Banana")
    await page.getByRole("button", { name: "Save Entry" }).click()
    await page.waitForTimeout(1000)
    await page.getByRole("button", { name: "Solids" }).click()
    await expect(page.locator('input[placeholder="e.g. Sweet Potato"]')).toHaveValue("")
  })

  test("shows the Daily Summary section with bottle and breast totals", async ({ page }) => {
    await seedBabyInStore(page)
    await expect(page.getByRole("heading", { name: "Daily Summary" })).toBeVisible()
    await expect(page.getByText("Bottle Total")).toBeVisible()
    await expect(page.getByText("Breast Total")).toBeVisible()
    await expect(page.getByText("mins").first()).toBeVisible()
    await expect(page.getByText("Today", { exact: true })).toBeVisible()
  })

  test("bar chart has 6 bars", async ({ page }) => {
    await seedBabyInStore(page)
    const bars = page.locator(".rounded-t-lg")
    await expect(bars).toHaveCount(6)
  })

  test("shows non-zero bottle total after saving a bottle entry", async ({ page }) => {
    await seedBabyInStore(page)
    await page.getByRole("button", { name: "Bottle" }).click()
    await page.getByText("Formula").click()
    await page.getByRole("button", { name: "Save Entry" }).click()
    await page.waitForTimeout(1000)
    await seedBabyInStore(page)
    await expect(page.getByText("Bottle Total").locator("..")).toContainText(/ml/)
    const mlText = await page.getByText("Bottle Total").locator("..").innerText()
    expect(mlText).not.toBe("0ml")
  })

  test("shows non-zero breast total after saving a breast entry", async ({ page }) => {
    await seedBabyInStore(page)
    await page.locator('input[placeholder="0"]').fill("10")
    await page.getByRole("button", { name: "Save Entry" }).click()
    await page.waitForTimeout(1000)
    await seedBabyInStore(page)
    await expect(page.getByText("Breast Total").locator("..")).toContainText(/mins/)
    const minsText = await page.getByText("Breast Total").locator("..").innerText()
    expect(minsText).not.toBe("0 mins")
  })

  test("does not show alert when last feed was recent", async ({ page }) => {
    await seedBabyInStore(page)
    await expect(page.getByText(/It's been over/)).not.toBeVisible()
  })
})
