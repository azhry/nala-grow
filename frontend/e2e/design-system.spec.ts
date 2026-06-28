import { test, expect } from "@playwright/test"

test.describe("Design System page", () => {
  test("page loads", async ({ page }) => {
    const res = await page.request.get("/design-system")
    expect(res.status()).toBe(200)
  })

  test("shows title and subtitle", async ({ page }) => {
    await page.goto("/design-system")
    await expect(page.getByRole("heading", { name: "NalaGrow Design System" })).toBeVisible()
    await expect(page.getByText("Reusable UI components extracted from Stitch designs.")).toBeVisible()
  })

  test("navigates through all tabs", async ({ page }) => {
    await page.goto("/design-system")
    for (const tab of ["Colors", "Typography", "Components"]) {
      await page.getByRole("button", { name: tab, exact: true }).click()
    }
  })

  test("colors tab shows swatches", async ({ page }) => {
    await page.goto("/design-system")
    await page.getByRole("button", { name: "Colors", exact: true }).click()
    await expect(page.getByText("Surface Container High")).toBeVisible()
  })

  test("typography tab shows styles", async ({ page }) => {
    await page.goto("/design-system")
    await page.getByRole("button", { name: "Typography", exact: true }).click()
    await expect(page.getByText("headline-md")).toBeVisible()
  })

  test("all sections render in components tab", async ({ page }) => {
    await page.goto("/design-system")
    await page.waitForLoadState("networkidle")
    const body = page.locator("body")
    await expect(body).toContainText("Buttons")
    await expect(body).toContainText("Input Fields")
    await expect(body).toContainText("Cards")
    await expect(body).toContainText("Chips & Avatars")
  })

  test("all button variants are present", async ({ page }) => {
    await page.goto("/design-system")
    for (const variant of ["Primary", "Secondary", "Outline", "Ghost", "Danger"]) {
      await expect(page.getByRole("button", { name: variant, exact: true })).toBeVisible()
    }
  })

  test("timer toggle works", async ({ page }) => {
    await page.goto("/design-system")
    await page.getByRole("button", { name: "Start Timer" }).click()
    await expect(page.getByRole("button", { name: "Stop Timer" })).toBeVisible()
    await page.getByRole("button", { name: "Stop Timer" }).click()
    await expect(page.getByRole("button", { name: "Start Timer" })).toBeVisible()
  })

  test("segmented control switches value", async ({ page }) => {
    await page.goto("/design-system")
    await page.getByRole("button", { name: "Week", exact: true }).click()
    await expect(page.getByText("Selected: week")).toBeVisible()
    await page.getByRole("button", { name: "Month", exact: true }).click()
    await expect(page.getByText("Selected: month")).toBeVisible()
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
    await expect(page.getByText("14.5h")).toBeVisible()
    await expect(page.getByText("4.2h")).toBeVisible()
    await expect(page.getByText("Feedings Today")).toBeVisible()
  })

  test("timeline displays entries", async ({ page }) => {
    await page.goto("/design-system")
    await expect(page.getByText("Morning Bottle")).toBeVisible()
    await expect(page.getByText("Midday Nap")).toBeVisible()
    await expect(page.getByText("Solids: Avocado")).toBeVisible()
  })

  test("footer shows version", async ({ page }) => {
    await page.goto("/design-system")
    await expect(page.getByText("Design System v1.0")).toBeVisible()
  })
})
