import { test, expect } from "@playwright/test"

test.describe("Design System page", () => {
  test("page loads", async ({ page }) => {
    const res = await page.request.get("/design-system")
    expect(res.status()).toBe(200)
  })

  test("shows header with eyebrow, title, and subtitle", async ({ page }) => {
    await page.goto("/design-system")
    await expect(page.getByText("FE-010")).toBeVisible()
    await expect(page.getByRole("heading", { name: "NalaGrow Design System" })).toBeVisible()
    await expect(page.getByText(/components mapped from.*Stitch assets/)).toBeVisible()
  })

  test("all tab buttons are present", async ({ page }) => {
    await page.goto("/design-system")
    for (const tab of ["Components", "Colors", "Typography", "Screens"]) {
      await expect(page.getByRole("button", { name: tab, exact: true })).toBeVisible()
    }
  })

  test("navigates through all tabs", async ({ page }) => {
    await page.goto("/design-system")
    for (const tab of ["Colors", "Typography", "Screens", "Components"]) {
      await page.getByRole("button", { name: tab, exact: true }).click()
    }
  })

  test("colors tab shows swatches", async ({ page }) => {
    await page.goto("/design-system")
    await page.getByRole("button", { name: "Colors", exact: true }).click()
    await expect(page.getByText("surface-container-high", { exact: true })).toBeVisible()
  })

  test("typography tab shows styles", async ({ page }) => {
    await page.goto("/design-system")
    await page.getByRole("button", { name: "Typography", exact: true }).click()
    await expect(page.getByText("headline-md")).toBeVisible()
  })

  test("screens tab shows screen cards", async ({ page }) => {
    await page.goto("/design-system")
    await page.getByRole("button", { name: "Screens", exact: true }).click()
    await expect(page.getByText("Growth Tracking Charts")).toBeVisible()
  })

  test("components tab renders profile section", async ({ page }) => {
    await page.goto("/design-system")
    await expect(page.getByText("Welcome to NalaGrow")).toBeVisible()
    await expect(page.getByText("Create a beautiful profile")).toBeVisible()
  })

  test("all button variants are present", async ({ page }) => {
    await page.goto("/design-system")
    for (const variant of ["Primary", "Secondary", "Outline", "Ghost", "Danger"]) {
      await expect(page.getByRole("button", { name: variant, exact: true })).toBeVisible()
    }
  })

  test("timer toggle works", async ({ page }) => {
    await page.goto("/design-system")
    await page.getByRole("button", { name: "Start" }).click()
    await expect(page.getByRole("button", { name: "Stop" })).toBeVisible()
    await page.getByRole("button", { name: "Stop" }).click()
    await expect(page.getByRole("button", { name: "Start" })).toBeVisible()
  })

  test("chips are rendered", async ({ page }) => {
    await page.goto("/design-system")
    await page.waitForLoadState("networkidle")
    const body = page.locator("body")
    await expect(body).toContainText("Breast Milk")
    await expect(body).toContainText("Crib")
    await expect(body).toContainText("Loved it")
    await expect(body).toContainText("Overdue")
    await expect(body).toContainText("Quick Feed")
  })

  test("stat cards display data", async ({ page }) => {
    await page.goto("/design-system")
    await expect(page.getByText("14.5h", { exact: true })).toBeVisible()
    await expect(page.getByText("Feedings", { exact: true })).toBeVisible()
    await expect(page.getByText("8", { exact: true })).toBeVisible()
  })

  test("timeline displays entries", async ({ page }) => {
    await page.goto("/design-system")
    await expect(page.getByText("Morning Bottle")).toBeVisible()
    await expect(page.getByText("Midday Nap")).toBeVisible()
    await expect(page.getByText("Solids: Avocado")).toBeVisible()
  })

  test("bottom sheet opens", async ({ page }) => {
    await page.goto("/design-system")
    await page.getByRole("button", { name: "Open Bottom Sheet" }).click()
    await expect(page.getByText("Quick Log")).toBeVisible()
  })

  test("success overlay appears", async ({ page }) => {
    await page.goto("/design-system")
    await page.getByRole("button", { name: "Show Success" }).click()
    await expect(page.getByText("Profile Created")).toBeVisible()
  })

  test("profile cards are rendered", async ({ page }) => {
    await page.goto("/design-system")
    await expect(page.getByRole("heading", { name: "Lily", exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Nala", exact: true })).toBeVisible()
  })
})
