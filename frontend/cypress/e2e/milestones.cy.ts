// ---------------------------------------------------------------------------
// CE-007 — Milestones E2E tests
//
// These tests run against the REAL backend GraphQL API at localhost:8080.
// They use the helper commands from seed.ts for API-level operations
// (signup, loginByApi, createBaby, createMilestone, setAuthState)
// and the real UI for milestone interactions.
//
// Each test uses a unique timestamp-based email for isolation.
// Data cleanup happens in the after hook.
// ---------------------------------------------------------------------------

describe("CE-007: Milestones E2E (real backend)", () => {
  const BASE_EMAIL = "ce007-milestones-" + Date.now()
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
    it("loads the milestones page with heading", () => {
      cy.visit("/milestones")
      cy.contains("h1", "Milestones").should("be.visible")
      cy.contains("Track").should("be.visible")
      cy.contains("developmental milestones").should("be.visible")
    })
  })

  // 2. Milestone progress bar
  describe("Milestone progress bar", () => {
    it("shows the progress bar with achieved and total counts", () => {
      cy.visit("/milestones")
      cy.contains("Milestone Progress").should("be.visible")
      cy.contains("of").should("be.visible")
      cy.contains("milestones achieved").should("be.visible")
    })

    it("displays percentage on the progress card", () => {
      cy.visit("/milestones")
      cy.contains("Milestone Progress").parent().parent().within(() => {
        cy.contains("%").should("be.visible")
      })
    })
  })

  // 3. Category filter chips
  describe("Category filter chips", () => {
    it("shows all category filter chips", () => {
      cy.visit("/milestones")
      cy.contains("button", "All").should("be.visible")
      cy.contains("button", "Physical").should("be.visible")
      cy.contains("button", "Cognitive").should("be.visible")
      cy.contains("button", "Social").should("be.visible")
      cy.contains("button", "Language").should("be.visible")
    })

    it("filters milestones to physical only", () => {
      cy.visit("/milestones")
      cy.contains("button", "Physical").click()
      cy.contains("button", "Physical").should("have.attr", "class").and("match", /bg-accent-coral/)
      cy.contains("Lifts head when on tummy").should("be.visible")
      cy.contains("Rolls over from tummy to back").should("be.visible")
      cy.contains("Sits without support").should("be.visible")
    })

    it("filters milestones to cognitive only", () => {
      cy.visit("/milestones")
      cy.contains("button", "Cognitive").click()
      cy.contains("Follows objects with eyes").should("be.visible")
      cy.contains("Responds to sound").should("be.visible")
      cy.contains("Lifts head when on tummy").should("not.exist")
    })

    it("filters milestones to social only", () => {
      cy.visit("/milestones")
      cy.contains("button", "Social").click()
      cy.contains("Smiles at people").should("be.visible")
      cy.contains("Recognizes familiar faces").should("be.visible")
      cy.contains("Lifts head when on tummy").should("not.exist")
    })

    it("filters milestones to language only", () => {
      cy.visit("/milestones")
      cy.contains("button", "Language").click()
      cy.contains("Makes cooing sounds").should("be.visible")
      cy.contains("Babbles and makes sounds").should("be.visible")
      cy.contains("Lifts head when on tummy").should("not.exist")
    })

    it("shows all milestones when All filter is selected", () => {
      cy.visit("/milestones")
      cy.contains("button", "Physical").click()
      cy.contains("Lifts head when on tummy").should("be.visible")
      cy.contains("button", "All").click()
      cy.contains("Follows objects with eyes").should("be.visible")
      cy.contains("Lifts head when on tummy").should("be.visible")
    })
  })

  // 4. Milestone definitions listed in timeline
  describe("Milestone timeline", () => {
    it("shows the Milestone Timeline heading", () => {
      cy.visit("/milestones")
      cy.contains("h3", "Milestone Timeline").should("be.visible")
    })

    it("shows age range sections", () => {
      cy.visit("/milestones")
      cy.contains("0–3 Months").should("be.visible")
      cy.contains("3–6 Months").should("be.visible")
      cy.contains("6–12 Months").should("be.visible")
      cy.contains("12–24 Months").should("be.visible")
    })

    it("shows milestone titles in the timeline", () => {
      cy.visit("/milestones")
      cy.contains("Lifts head when on tummy").should("be.visible")
      cy.contains("Follows objects with eyes").should("be.visible")
      cy.contains("Walks independently").should("be.visible")
      cy.contains("Says first words (mama/dada)").should("be.visible")
    })

    it("shows Achieve buttons on unachieved milestones", () => {
      cy.visit("/milestones")
      cy.contains("button", "Achieve").should("have.length.greaterThan", 0)
    })
  })

  // 5. Achieve button marks a milestone as achieved
  describe("Achieve milestone", () => {
    it("marks a milestone as achieved when clicking Achieve button", () => {
      cy.visit("/milestones")
      cy.contains("Lifts head when on tummy").should("be.visible")
      cy.contains("Lifts head when on tummy").parent().parent().within(() => {
        cy.contains("button", "Achieve").click()
      })
      cy.contains("Lifts head when on tummy").parent().parent().within(() => {
        cy.contains("Achieved").should("be.visible")
        cy.contains("button", "Achieve").should("not.exist")
      })
    })
  })

  // 6. Add Custom Milestone opens form
  describe("Add Custom Milestone", () => {
    it("opens the custom milestone form when clicking Add Custom Milestone", () => {
      cy.visit("/milestones")
      cy.contains("button", "Add Custom Milestone").click()
      cy.contains("h3", "Custom Milestone").should("be.visible")
      cy.contains("label", "Milestone Title").should("be.visible")
      cy.contains("label", "Category").should("be.visible")
      cy.contains("label", "Age Range").should("be.visible")
      cy.contains("label", "Notes").should("be.visible")
      cy.contains("button", "Cancel").should("be.visible")
      cy.contains("button", "Add Milestone").should("be.visible")
    })

    it("closes the form when clicking Cancel", () => {
      cy.visit("/milestones")
      cy.contains("button", "Add Custom Milestone").click()
      cy.contains("h3", "Custom Milestone").should("be.visible")
      cy.contains("button", "Cancel").click()
      cy.contains("h3", "Custom Milestone").should("not.exist")
      cy.contains("button", "Add Custom Milestone").should("be.visible")
    })
  })

  // 7. Custom milestone form: fill title, category, save
  describe("Custom milestone form", () => {
    it("fills and saves a custom milestone", () => {
      cy.visit("/milestones")
      cy.contains("button", "Add Custom Milestone").click()
      cy.contains("label", "Milestone Title").parent().within(() => {
        cy.get("input[type=text]").type("First steps outdoors")
      })
      cy.contains("button", "Cognitive").click()
      cy.contains("button", "3–6 Months").click()
      cy.contains("label", "Notes").parent().within(() => {
        cy.get("textarea").type("Walked in the park for the first time")
      })
      cy.contains("button", "Add Milestone").click()
      cy.contains("h3", "Custom Milestone").should("not.exist")
      cy.contains("First steps outdoors").should("be.visible")
      cy.contains("Walked in the park for the first time").should("be.visible")
    })

    it("does not save when title is empty", () => {
      cy.visit("/milestones")
      cy.contains("button", "Add Custom Milestone").click()
      cy.contains("button", "Add Milestone").should("be.disabled")
      cy.contains("button", "Cancel").click()
    })
  })

  // 8. Seeded milestones appear in timeline
  describe("Seeded milestones via API", () => {
    it("shows API-created milestones in the timeline", () => {
      cy.createMilestone(authToken, babyId, {
        title: "Rolled over at home",
        category: "physical",
        achievedAt: null,
      }).then(() => {
        cy.createMilestone(authToken, babyId, {
          title: "First wave",
          category: "social",
          achievedAt: null,
        }).then(() => {
          cy.visit("/milestones")
          cy.contains("Rolled over at home").should("be.visible")
          cy.contains("First wave").should("be.visible")
        })
      })
    })

    it("shows achieved seeded milestones with achieved badge", () => {
      cy.createMilestone(authToken, babyId, {
        title: "API achieved milestone",
        category: "cognitive",
      }).then(() => {
        cy.visit("/milestones")
        cy.contains("API achieved milestone").should("be.visible")
        cy.contains("API achieved milestone").parent().parent().within(() => {
          cy.contains("Achieved").should("be.visible")
        })
      })
    })
  })

  // 9. FAB button
  describe("FAB button", () => {
    it("shows the floating action button", () => {
      cy.visit("/milestones")
      cy.get("button").filter(':has(span.material-symbols-outlined)').last().should("be.visible")
    })

    it("opens the custom milestone form when clicking the FAB", () => {
      cy.visit("/milestones")
      cy.get("[class*='fixed'][class*='bottom']").find("button").last().click({ force: true })
      cy.contains("h3", "Custom Milestone").should("be.visible")
      cy.contains("button", "Cancel").click()
    })
  })

  // 10. Navigation from bottom tab
  describe("Navigation", () => {
    it("navigates to milestones page via bottom tab nav", () => {
      cy.visit("/dashboard")
      cy.get("nav.md\\:hidden").contains("Milestones").click()
      cy.url({ timeout: 10000 }).should("include", "/milestones")
      cy.contains("h1", "Milestones").should("be.visible")
    })

    it("milestones tab is highlighted when on milestones page", () => {
      cy.visit("/milestones")
      cy.get("nav.md\\:hidden").within(() => {
        cy.contains("Milestones").closest("a")
          .should("have.attr", "class")
          .and("match", /bg-primary-container/)
      })
    })
  })
})
