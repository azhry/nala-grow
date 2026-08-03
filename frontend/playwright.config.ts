import { defineConfig, devices } from "@playwright/test"

const visualRegression = process.env.VISUAL_REGRESSION === "1"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: process.env.CI ? "github" : "list",
  webServer: process.env.E2E_SERVICES_EXTERNAL === "1" ? undefined : {
    command: "node scripts/e2e-setup-playwright.js",
    url: "http://127.0.0.1:3000/login",
    reuseExistingServer: false,
    timeout: 120000,
  },
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: visualRegression ? 0.01 : 0.05,
      maxDiffPixels: visualRegression ? 100 : 500,
      threshold: 0.2,
      animations: "disabled",
    },
  },
  projects: [
    {
      name: "mobile",
      use: { ...devices["iPhone 14"] },
    },
    {
      name: "tablet",
      use: { viewport: { width: 768, height: 1024 } },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
  ],
})
