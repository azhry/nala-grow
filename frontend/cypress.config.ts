import { defineConfig } from "cypress"

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    setupNodeEvents(on) {
      on("task", {
        log(message) {
          console.log("[CYPRESS]", message)
          return null
        },
      })
    },
    webServer: {
      command: "node scripts/e2e-setup.js",
      url: "http://localhost:3000",
      timeout: 60000,
      reuseExistingServer: true,
    },
  },
  viewportWidth: 390,
  viewportHeight: 844,
})
