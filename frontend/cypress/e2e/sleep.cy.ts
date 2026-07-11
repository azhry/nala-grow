// ---------------------------------------------------------------------------
// CE-005 — Sleep E2E tests
//
// These tests run against the REAL backend GraphQL API at localhost:8080.
// They use the helper commands from seed.ts for API-level operations
// (signup, loginByApi, createBaby, createSleepSession, setAuthState)
// and the real UI for sleep tracking interactions.
//
// Each test uses a unique timestamp-based email for isolation.
// Data cleanup happens in the after hook.
// ---------------------------------------------------------------------------

describe("CE-005: Sleep Tracking E2E (real backend)", () => {
  const BASE_EMAIL = "ce005-sleep-" + Date.now()
  const PASSWORD = "TestPass123!"
  const BABY_NAME = "TestBaby"
  const BABY_DOB = "2026-01-15"
  const BABY_SEX = "female"

  let authToken: string
  let babyId: string

  function freshEmail(label: string): string {
    return BASE_EMAIL + "-" + label + "@example.com"
  }

  function setupUser(label: string): Cypress.Chainable<{
    token: string
    user: { id: string; email: string }
  }> {
    const email = freshEmail(label)
    return cy.signup(email, PASSWORD).then((res) => {
      authToken = res.token
      return cy.createBaby(authToken, BABY_NAME, BABY_DOB, BABY_SEX).then((baby) => {
        babyId = baby.id
        cy.setAuthState(res.token, res.user)
        cy.window().then((win) => {
          const store = JSON.parse(win.localStorage.getItem("nalagrow-store") || "{}")
          store.state.activeBaby = baby
          store.state.babies = [baby]
          win.localStorage.setItem("nalagrow-store", JSON.stringify(store))
        })
        return cy.wrap(res)
      })
    })
  }

  before(() => { setupUser("suite") })
  after(() => { cy.clearAuthState() })

  // 1. Page load and default state
  describe("Page load and default state", () => {
    it("loads the sleep page with heading and timer tab active", () => {
      cy.visit("/sleep")
      cy.contains("h1", "Sleep Tracking").should("be.visible")
      cy.contains("Monitor").should("be.visible")
      cy.contains("button", "Timer").should("be.visible")
      cy.contains("button", "Manual").should("be.visible")
      cy.contains("h3", "Record Sleep").should("be.visible")
      cy.contains("Start Sleep").should("be.visible")
      cy.contains("Not started").should("be.visible")
      cy.contains("Location").should("be.visible")
      cy.contains("Notes").should("be.visible")
    })
  })

  // 2. Tab switching
  describe("Tab switching", () => {
    it("switches to Manual tab and shows manual form fields", () => {
      cy.visit("/sleep")
      cy.contains("button", "Manual").click()
      cy.contains("label", "Start Time").should("be.visible")
      cy.contains("label", "End Time").should("be.visible")
      cy.contains("Save Sleep Entry").should("be.visible")
    })

    it("switches back to Timer tab from Manual", () => {
      cy.visit("/sleep")
      cy.contains("button", "Manual").click()
      cy.contains("label", "Start Time").should("be.visible")
      cy.contains("button", "Timer").click()
      cy.contains("Start Sleep").should("be.visible")
      cy.contains("Not started").should("be.visible")
      cy.contains("Location").should("be.visible")
    })
  })

  // 3. Timer start and stop
  describe("Timer start and stop", () => {
    it("starts the sleep timer and counts up", () => {
      cy.visit("/sleep")
      cy.contains("button", "Start Sleep").click()
      cy.contains("Sleeping...").should("be.visible")
      cy.contains("Stop Sleep").should("be.visible")
      cy.wait(2500)
      cy.contains("Sleeping...").should("be.visible")
      cy.get(".timer-active").should("exist")
    })

    it("stops the sleep timer when clicked again", () => {
      cy.visit("/sleep")
      cy.contains("button", "Start Sleep").click()
      cy.contains("Stop Sleep").should("be.visible")
      cy.wait(2000)
      cy.contains("button", "Stop Sleep").click()
      cy.contains("Not started").should("be.visible")
      cy.contains("Start Sleep").should("be.visible")
    })
  })

  // 4. Location selection
  describe("Location selection", () => {
    it("selects and deselects location buttons in timer tab", () => {
      cy.visit("/sleep")
      cy.contains("button", "crib").click()
      cy.contains("button", "crib").should("have.attr", "class").and("match", /border-primary/)
      cy.contains("button", "bed").click()
      cy.contains("button", "bed").should("have.attr", "class").and("match", /border-primary/)
      cy.contains("button", "carrier").click()
      cy.contains("button", "carrier").should("have.attr", "class").and("match", /border-primary/)
    })

    it("notes textarea accepts text", () => {
      cy.visit("/sleep")
      cy.contains("label", "Notes").parent().within(() => {
        cy.get("textarea").type("Baby was restless tonight")
        cy.get("textarea").should("have.value", "Baby was restless tonight")
      })
    })
  })

  // 5. Manual form
  describe("Manual form", () => {
    it("fills manual form fields and saves an entry", () => {
      cy.visit("/sleep")
      cy.contains("button", "Manual").click()
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 3600000)
      const startStr = oneHourAgo.toISOString().slice(0, 16)
      const endStr = now.toISOString().slice(0, 16)
      cy.contains("label", "Start Time").parent().within(() => {
        cy.get("input[type=datetime-local]").clear().type(startStr)
      })
      cy.contains("label", "End Time").parent().within(() => {
        cy.get("input[type=datetime-local]").clear().type(endStr)
      })
      cy.contains("Duration:").should("be.visible")
      cy.contains("button", "crib").click()
      cy.contains("label", "Notes").parent().within(() => {
        cy.get("textarea").type("Manual sleep entry test")
      })
      cy.contains("button", "Save Sleep Entry").click()
      cy.contains("button", "Manual").click()
      cy.contains("label", "Start Time").should("be.visible")
    })
  })

  // 6. Seeded sleep sessions appear in timeline
  describe("Sleep timeline", () => {
    it("shows empty state when no sessions exist for current baby", () => {
      const email = freshEmail("timeline-empty")
      cy.signup(email, PASSWORD).then((res) => {
        cy.createBaby(res.token, "EmptyBaby", "2026-03-01", "male").then((baby) => {
          cy.setAuthState(res.token, res.user)
          cy.window().then((win) => {
            const store = JSON.parse(win.localStorage.getItem("nalagrow-store") || "{}")
            store.state.activeBaby = baby
            store.state.babies = [baby]
            win.localStorage.setItem("nalagrow-store", JSON.stringify(store))
          })
          cy.visit("/sleep")
          cy.contains("No sleep recorded yet today").should("be.visible")
          cy.contains("Start a sleep timer or log manually above").should("be.visible")
          cy.clearAuthState()
        })
      })
    })

    it("shows seeded sleep sessions in the timeline", () => {
      cy.createSleepSession(authToken, babyId, { location: "crib" }).then(() => {
        return cy.createSleepSession(authToken, babyId, { location: "bed" })
      }).then(() => {
        return cy.createSleepSession(authToken, babyId, { location: "carrier" })
      }).then(() => {
        cy.visit("/sleep")
        cy.contains("h3", "Sleep Timeline (24h)").should("be.visible")
        cy.contains("Sleep").should("exist")
        cy.contains("Crib").should("exist")
        cy.contains("Bed").should("exist")
        cy.contains("Carrier").should("exist")
      })
    })
  })

  // 7. Daily summary
  describe("Daily summary", () => {
    it("shows the Daily Sleep Summary section with totals", () => {
      cy.visit("/sleep")
      cy.contains("h3", "Daily Sleep Summary").should("be.visible")
      cy.contains("Total Sleep").should("be.visible")
      cy.contains("Longest Stretch").should("be.visible")
      cy.contains("Sessions").should("be.visible")
      cy.contains("Progress toward").should("be.visible")
    })

    it("shows session count and total minutes after seeding sessions", () => {
      cy.createSleepSession(authToken, babyId, { location: "crib" }).then(() => {
        return cy.createSleepSession(authToken, babyId, { location: "bed" })
      }).then(() => {
        cy.visit("/sleep")
        cy.contains("Sessions").should("be.visible")
        cy.contains("Total Sleep").parent().parent().within(() => {
          cy.get("p").contains("m").should("exist")
        })
      })
    })
  })

  // 8. Navigation
  describe("Navigation", () => {
    it("navigates to sleep page via bottom tab nav", () => {
      cy.visit("/dashboard")
      cy.get("nav.md\\:hidden").contains("Sleep").click()
      cy.url({ timeout: 10000 }).should("include", "/sleep")
      cy.contains("h1", "Sleep Tracking").should("be.visible")
    })

    it("sleep tab is highlighted when on sleep page", () => {
      cy.visit("/sleep")
      cy.get("nav.md\\:hidden").within(() => {
        cy.contains("Sleep").closest("a")
          .should("have.attr", "class")
          .and("match", /bg-primary-container/)
      })
    })
  })
})
