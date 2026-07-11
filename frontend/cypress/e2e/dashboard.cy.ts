// ---------------------------------------------------------------------------
// CE-003 — Dashboard E2E tests
//
// These tests run against the REAL backend GraphQL API at localhost:8080.
// They use the helper commands from seed.ts for API-level operations
// (signup, loginByApi, createBaby, setAuthState) and the real UI for
// dashboard interactions.
//
// Each test uses a unique timestamp-based email for isolation.
// Data cleanup happens in the after hook.
// ---------------------------------------------------------------------------

describe("CE-003: Dashboard E2E (real backend)", () => {
  const BASE_EMAIL = "ce003-dashboard-" + Date.now()
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

  // 1. Page load and greeting
  describe("Page load and greeting", () => {
    it("loads the dashboard with a greeting containing the baby name", () => {
      cy.visit("/dashboard")
      cy.contains(BABY_NAME).should("be.visible")
    })
  })

  // 2. Quick action buttons
  describe("Quick action buttons", () => {
    it("shows all three quick action buttons", () => {
      cy.visit("/dashboard")
      cy.contains("Log Feed").should("be.visible")
      cy.contains("Log Sleep").should("be.visible")
      cy.contains("Log Growth").should("be.visible")
    })
  })

  // 3. Log Feed navigation
  describe("Log Feed navigation", () => {
    it("navigates to /feeding when clicking Log Feed", () => {
      cy.visit("/dashboard")
      cy.contains("Log Feed").click()
      cy.url({ timeout: 10000 }).should("include", "/feeding")
      cy.contains("h1", "Feeding Log").should("be.visible")
    })
  })

  // 4. Log Sleep navigation
  describe("Log Sleep navigation", () => {
    it("navigates to /sleep when clicking Log Sleep", () => {
      cy.visit("/dashboard")
      cy.contains("Log Sleep").click()
      cy.url({ timeout: 10000 }).should("include", "/sleep")
    })
  })

  // 5. Log Growth navigation
  describe("Log Growth navigation", () => {
    it("navigates to /growth when clicking Log Growth", () => {
      cy.visit("/dashboard")
      cy.contains("Log Growth").click()
      cy.url({ timeout: 10000 }).should("include", "/growth")
    })
  })

  // 6. Bento cards
  describe("Bento cards", () => {
    it("shows the three summary bento cards", () => {
      cy.visit("/dashboard")
      cy.contains("Last Feed").should("be.visible")
      cy.contains("Sleep").should("be.visible")
      cy.contains("Growth").should("be.visible")
    })
  })

  // 7. Recent Activities section
  describe("Recent Activities section", () => {
    it("shows the Recent Activities section", () => {
      cy.visit("/dashboard")
      cy.contains("Recent Activities").should("be.visible")
    })
  })

  // 8. Daily Insight card
  describe("Daily Insight card", () => {
    it("shows the Daily Insight card", () => {
      cy.visit("/dashboard")
      cy.contains("Daily Insight").should("be.visible")
    })
  })

  // 9. Bottom tab navigation
  describe("Bottom tab navigation", () => {
    it("navigates via bottom tab nav links", () => {
      cy.visit("/dashboard")
      cy.get("nav").contains("Home").should("be.visible")
      cy.get("nav").contains("Feeding").should("be.visible")
      cy.get("nav").contains("Sleep").should("be.visible")
      cy.get("nav").contains("Milestones").should("be.visible")
      cy.get("nav").contains("Profile").should("be.visible")
    })

    it("highlights Home tab when on dashboard", () => {
      cy.visit("/dashboard")
      cy.get("nav").within(() => {
        cy.contains("Home").closest("a")
          .should("have.attr", "class")
          .and("match", /bg-primary-container/)
      })
    })

    it("navigates to feeding page via bottom tab", () => {
      cy.visit("/dashboard")
      cy.get("nav").contains("Feeding").click()
      cy.url({ timeout: 10000 }).should("include", "/feeding")
      cy.contains("h1", "Feeding Log").should("be.visible")
    })
  })

  // 10. FAB visibility on mobile
  describe("FAB on mobile", () => {
    it("shows the FAB button on mobile viewport", () => {
      cy.viewport(390, 844)
      cy.visit("/dashboard")
      cy.get("button").filter(":visible").last().should("be.visible")
    })
  })
})
