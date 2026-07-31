import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "npm run dev -- -p 3001",
    url: "http://localhost:3001",
    reuseExistingServer: false,
    timeout: 120000,
  },
  use: { baseURL: "http://localhost:3001" },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
})
