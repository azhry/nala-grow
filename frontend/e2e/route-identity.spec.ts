import { expect, test } from "@playwright/test"

const ROUTES = [
  ["/dashboard", /Good (morning|afternoon|evening)/i],
  ["/feeding", "Feeding Log"],
  ["/sleep", "Sleep Dashboard"],
  ["/growth", /Growth Tracking/i],
  ["/milestones", /Lily's Journey/i],
  ["/export", "Export Data"],
  ["/settings", "Settings"],
] as const

test.describe("app route identity", () => {
  for (const [route, heading] of ROUTES) {
    test(`${route} renders its unique heading and shared chrome`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(new RegExp(`${route}$`))
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible()
      await expect(page.getByLabel("NalaGrow home")).toBeVisible()
      await expect(page.getByLabel(/Manage .* profile/)).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    })
  }

  test("profile entry resolves to a profile-specific screen", async ({ page }) => {
    await page.goto("/profile")
    await expect(page.getByRole("heading", { name: /Profiles|Welcome to NalaGrow|Your Little Ones/i })).toBeVisible()
    await expect(page).toHaveURL(/\/profile(?:\/(?:create|manage))?$/)
  })

  test("Growth export action navigates to the Export route", async ({ page }) => {
    await page.goto("/growth")
    const exportLink = page.getByRole("link", { name: "Export growth records" })
    await expect(exportLink).toHaveAttribute("href", "/export")
    await exportLink.click()
    await expect(page).toHaveURL(/\/export$/)
    await expect(page.getByRole("heading", { name: "Export Data" })).toBeVisible()
  })

  test("demo sleep Wake Up synchronizes the active card and timeline", async ({ page }) => {
    await page.goto("/sleep")
    await expect(page.getByText("Lily is resting...")).toBeVisible()
    await page.getByRole("button", { name: "Wake Up" }).click()
    await expect(page.getByRole("dialog", { name: "Sleep Logged" })).toBeVisible()
    await page.getByRole("button", { name: "Got it" }).click()
    await expect(page.getByText("Lily is awake")).toBeVisible()
    await expect(page.getByRole("button", { name: /Start Sleep Timer/ })).toBeVisible()
    await expect(page.getByText("IN PROGRESS")).toHaveCount(0)
  })

  test("demo milestone goals and journey stay synchronized", async ({ page }) => {
    await page.goto("/milestones")
    const goalTitle = page.getByText("Reaches for objects", { exact: true })
    await expect(goalTitle).toHaveCount(1)
    await goalTitle.click()
    await expect(goalTitle).toHaveCount(2)

    const journeyCard = page.locator(".scrapbook-card").filter({ has: page.getByRole("heading", { name: "Reaches for objects" }) })
    await journeyCard.getByRole("button", { name: "Unachieve" }).click()
    await expect(goalTitle).toHaveCount(1)
  })

  test("normal sidebar navigation preserves route identity", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Desktop sidebar is hidden on mobile")
    await page.goto("/dashboard")
    await page.getByRole("link", { name: "Sleep" }).filter({ visible: true }).first().click()
    await expect(page).toHaveURL(/\/sleep$/)
    await expect(page.getByRole("heading", { name: "Sleep Dashboard" })).toBeVisible()
    await page.getByRole("link", { name: "Growth" }).filter({ visible: true }).first().click()
    await expect(page).toHaveURL(/\/growth$/)
    await expect(page.getByRole("heading", { name: /Growth Tracking/i })).toBeVisible()
  })
})
