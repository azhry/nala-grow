import { test, expect } from "@playwright/test"

test.describe("Bottom tab navigation", () => {
  const tabNav = (page: import("@playwright/test").Page) =>
    page.locator("nav").filter({ has: page.locator(".md\\:hidden") }).or(
      page.locator("nav.fixed.bottom-0")
    )

  test("all tab labels render", async ({ page }) => {
    await page.goto("/dashboard")
    const nav = tabNav(page)
    const labels = ["Home", "Growth", "Feeding", "Sleep", "Milestones", "Profile"]
    for (const label of labels) {
      await expect(nav.getByText(label, { exact: true })).toBeVisible()
    }
  })

  test("all tab icons render as material symbols", async ({ page }) => {
    await page.goto("/dashboard")
    const nav = tabNav(page)
    await expect(nav.locator(".material-symbols-outlined")).toHaveCount(6)
  })

  test("active tab has highlighted styling", async ({ page }) => {
    await page.goto("/dashboard")
    const nav = tabNav(page)
    const homeLink = nav.getByRole("link", { name: /Home/ }).last()
    await expect(homeLink).toHaveClass(/bg-primary-container/)
  })

  test("clicking Growth tab navigates to /growth", async ({ page }) => {
    await page.goto("/dashboard")
    const nav = tabNav(page)
    await nav.getByRole("link", { name: /Growth/ }).last().click()
    await expect(page).toHaveURL(/\/growth/)
  })

  test("clicking Feeding tab navigates to /feeding", async ({ page }) => {
    await page.goto("/dashboard")
    const nav = tabNav(page)
    await nav.getByRole("link", { name: /Feeding/ }).last().click()
    await expect(page).toHaveURL(/\/feeding/)
  })

  test("clicking Sleep tab navigates to /sleep", async ({ page }) => {
    await page.goto("/dashboard")
    const nav = tabNav(page)
    await nav.getByRole("link", { name: /Sleep/ }).last().click()
    await expect(page).toHaveURL(/\/sleep/)
  })

  test("clicking Milestones tab navigates to /milestones", async ({ page }) => {
    await page.goto("/dashboard")
    const nav = tabNav(page)
    await nav.getByRole("link", { name: /Milestones/ }).last().click()
    await expect(page).toHaveURL(/\/milestones/)
  })

  test("clicking Profile tab navigates to /profile", async ({ page }) => {
    await page.goto("/dashboard")
    const nav = tabNav(page)
    await nav.getByRole("link", { name: /Profile/ }).last().click()
    await expect(page).toHaveURL(/\/profile/)
  })

  test("nav is fixed at the bottom on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto("/dashboard")
    const navContainer = page.locator("nav.fixed.bottom-0")
    await expect(navContainer).toBeVisible()
    await expect(navContainer).toHaveClass(/fixed/)
    await expect(navContainer).toHaveClass(/bottom-0/)
    await expect(navContainer).toHaveClass(/z-50/)
    await expect(navContainer).toHaveClass(/w-full/)
  })
})
