import { test, expect } from "@playwright/test"

test.describe("Home page", () => {
  test("responds with 200", async ({ page }) => {
    const res = await page.request.get("/")
    expect(res.status()).toBe(200)
  })

  test("document title contains NalaGrow", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/NalaGrow/)
  })

  test("heading renders", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { name: "NalaGrow" })).toBeVisible()
  })

  test("login CTA button is visible", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible()
  })

  test("signup CTA button is visible", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("link", { name: "Create account" })).toBeVisible()
  })

  test("body contains tagline", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText(/Track your baby.*growth/)).toBeVisible()
  })
})
