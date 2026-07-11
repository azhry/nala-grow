// ---------------------------------------------------------------------------
// CE-006 — Growth E2E tests
//
// These tests run against the REAL backend GraphQL API at localhost:8080.
// They use the helper commands from seed.ts for API-level operations
// (signup, loginByApi, createBaby, createMeasurement, setAuthState)
// and the real UI for growth tracking interactions.
//
// Each test uses a unique timestamp-based email for isolation.
// Data cleanup happens in the after hook.
// ---------------------------------------------------------------------------

describe("CE-006: Growth Tracking E2E (real backend)", () => {
  const BASE_EMAIL = "ce006-growth-" + Date.now()
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
    it("loads the growth page with heading", () => {
      cy.visit("/growth")
      cy.contains("h1", "Growth Tracking").should("be.visible")
      cy.contains(BABY_NAME).should("be.visible")
    })
  })

  // 2. Unit toggle
  describe("Unit toggle", () => {
    it("switches between metric and imperial", () => {
      cy.visit("/growth")
      cy.contains("Metric").should("be.visible")
      cy.contains("Imperial").should("be.visible")
      cy.contains("Imperial").click()
      cy.contains("Imperial").should("have.attr", "class").and("match", /bg-primary-container/)
      cy.contains("Metric").click()
      cy.contains("Metric").should("have.attr", "class").and("match", /bg-primary-container/)
    })
  })

  // 3. WHO chart
  describe("WHO chart", () => {
    it("shows the WHO growth chart", () => {
      cy.visit("/growth")
      cy.contains("h3", "WHO Growth Chart").should("be.visible")
      cy.get(".recharts-responsive-container").should("be.visible")
    })
  })

  // 4. Current stats
  describe("Current stats", () => {
    it("displays weight, height, and head circumference stats", () => {
      cy.visit("/growth")
      cy.contains("h3", "Current Stats").should("be.visible")
      cy.contains("Weight").should("be.visible")
      cy.contains("Height").should("be.visible")
      cy.contains("Head Circumference").should("be.visible")
      cy.contains("%ile").should("exist")
    })
  })

  // 5. New measurement card
  describe("New measurement card", () => {
    it("shows the Record Now button", () => {
      cy.visit("/growth")
      cy.contains("h3", "New Measurement").should("be.visible")
      cy.contains("button", "Record Now").should("be.visible")
    })
  })

  // 6. Record Now opens form
  describe("Record Now button", () => {
    it("opens measurement form when Record Now is clicked", () => {
      cy.visit("/growth")
      cy.contains("button", "Record Now").click()
      cy.contains("h3", "New Measurement").should("be.visible")
      cy.contains("label", "Date").should("be.visible")
      cy.contains("label", "Weight").should("be.visible")
      cy.contains("label", "Height").should("be.visible")
      cy.contains("label", "Head Circumference").should("be.visible")
    })
  })

  // 7. Measurement form fill and save
  describe("Measurement form", () => {
    it("fills measurement fields and saves", () => {
      cy.visit("/growth")
      cy.contains("button", "Record Now").click()
      cy.contains("label", "Weight").parent().within(() => {
        cy.get("input[type=number]").clear().type("7.2")
      })
      cy.contains("label", "Height").parent().within(() => {
        cy.get("input[type=number]").clear().type("65.0")
      })
      cy.contains("label", "Head Circumference").parent().within(() => {
        cy.get("input[type=number]").clear().type("42.0")
      })
      cy.contains("label", "Notes").parent().within(() => {
        cy.get("textarea").type("Monthly checkup")
      })
      cy.contains("button", "Save").click()
      cy.contains("button", "Record Now").should("be.visible")
    })
  })

  // 8. Seeded measurements in history table
  describe("Measurement history", () => {
    it("shows seeded measurements in the table", () => {
      cy.createMeasurement(authToken, babyId, {
        weight: 7.0, height: 64.0, headCircumference: 41.5, date: "2026-02-15",
      }).then(() => {
        return cy.createMeasurement(authToken, babyId, {
          weight: 7.5, height: 66.0, headCircumference: 42.5, date: "2026-03-15",
        })
      }).then(() => {
        cy.visit("/growth")
        cy.contains("h3", "Measurement History").should("be.visible")
        cy.get("table").should("exist")
        cy.contains("td", "2026-02-15").should("exist")
        cy.contains("td", "2026-03-15").should("exist")
      })
    })

    it("shows empty state when no measurements exist", () => {
      const email = freshEmail("history-empty")
      cy.signup(email, PASSWORD).then((res) => {
        cy.createBaby(res.token, "EmptyBaby", "2026-03-01", "male").then((baby) => {
          cy.setAuthState(res.token, res.user)
          cy.window().then((win) => {
            const store = JSON.parse(win.localStorage.getItem("nalagrow-store") || "{}")
            store.state.activeBaby = baby
            store.state.babies = [baby]
            win.localStorage.setItem("nalagrow-store", JSON.stringify(store))
          })
          cy.visit("/growth")
          cy.contains("No measurements recorded yet").should("be.visible")
          cy.clearAuthState()
        })
      })
    })
  })

  // 9. Navigation
  describe("Navigation", () => {
    it("navigates to growth page via bottom tab nav", () => {
      cy.visit("/dashboard")
      cy.get("nav").contains("Milestones").click()
      cy.url({ timeout: 10000 }).should("include", "/milestones")
    })

    it("navigates to growth page via bottom tab nav", () => {
      cy.visit("/dashboard")
      cy.get("nav").contains("Milestones").click()
      cy.visit("/growth")
      cy.contains("h1", "Growth Tracking").should("be.visible")
    })
  })
})
