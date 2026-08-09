import { expect, test } from "@playwright/test"

const GRAPHQL_URL = "http://localhost:4000/graphql"

test("login Create an account CTA navigates to signup", async ({ page }) => {
  await page.goto("/login")

  await page.getByRole("link", { name: "Create an account" }).click()

  await expect(page).toHaveURL(/\/signup$/)
  await expect(page.getByRole("heading", { name: /Create your account/i })).toBeVisible()
})

test("logout leaves the dashboard and renders the login page", async ({ page, request }) => {
  const email = `logout-${Date.now()}@example.com`
  const password = "TestPass123!"

  const signup = await request.post(GRAPHQL_URL, {
    data: {
      query: `mutation signup($email: String!, $password: String!) {
        signup(email: $email, password: $password) { token user { id email } }
      }`,
      variables: { email, password },
    },
  })
  expect(signup.ok()).toBe(true)

  await page.goto("/login")
  await page.getByRole("textbox", { name: "Email Address" }).fill(email)
  await page.getByRole("textbox", { name: "Password" }).fill(password)
  await page.getByRole("button", { name: /Login/ }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole("button", { name: /Logout/ })).toBeVisible()

  await page.getByRole("button", { name: /Logout/ }).click()

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible()
})
