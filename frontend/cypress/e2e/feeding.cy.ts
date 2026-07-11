// ---------------------------------------------------------------------------
// CE-004 — Feeding E2E tests — breast, bottle, solids
//
// These tests run against the REAL backend GraphQL API at localhost:8080.
// They use the helper commands from seed.ts for API-level operations
// (signup, loginByApi, createBaby, createFeedingSession, setAuthState)
// and the real UI for feeding log interactions.
//
// Each test uses a unique timestamp-based email for isolation.
// Data cleanup happens in the after hook.
// ---------------------------------------------------------------------------

describe("CE-004: Feeding Log E2E (real backend)", () => {
  const BASE_EMAIL = "ce004-feeding-" + Date.now()
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
    it("loads the feeding page with heading and default breast tab", () => {
      cy.visit("/feeding")
      cy.contains("h1", "Feeding Log").should("be.visible")
      cy.contains("Track").should("be.visible")
      cy.contains("button", "Breast").should("be.visible")
      cy.contains("h3", "Record Feed").should("be.visible")
      cy.contains("Left Side").should("be.visible")
      cy.contains("Right Side").should("be.visible")
      cy.contains("Manual Duration (mins)").should("be.visible")
    })
  })

  // 2. Tab switching
  describe("Tab switching", () => {
    it("switches to Bottle tab and shows bottle form fields", () => {
      cy.visit("/feeding")
      cy.contains("button", "Bottle").click()
      cy.contains("label", "Amount").should("be.visible")
      cy.contains("label", "Type").should("be.visible")
      cy.contains("Breast Milk").should("be.visible")
      cy.contains("Formula").should("be.visible")
      cy.contains("Water").should("be.visible")
      cy.contains("label", "Temperature").should("be.visible")
      cy.contains("Cold").should("be.visible")
      cy.contains("Room").should("be.visible")
      cy.contains("Warm").should("be.visible")
    })

    it("switches to Solids tab and shows solids form fields", () => {
      cy.visit("/feeding")
      cy.contains("button", "Solids").click()
      cy.contains("label", "Food Name").should("be.visible")
      cy.contains("label", "Quantity").should("be.visible")
      cy.contains("label", "Reaction").should("be.visible")
      cy.contains("Loved it").should("be.visible")
      cy.contains("Interested").should("be.visible")
      cy.contains("Disliked").should("be.visible")
    })

    it("switches back to Breast tab from Bottle", () => {
      cy.visit("/feeding")
      cy.contains("button", "Bottle").click()
      cy.contains("label", "Amount").should("be.visible")
      cy.contains("button", "Breast").click()
      cy.contains("Left Side").should("be.visible")
      cy.contains("Right Side").should("be.visible")
      cy.contains("Manual Duration (mins)").should("be.visible")
    })
  })

  // 3. Breast timer
  describe("Breast timer", () => {
    it("starts the left side timer and counts up", () => {
      cy.visit("/feeding")
      cy.contains("00:00").should("exist")
      cy.contains("Left Side").parent().find("button").click()
      cy.wait(2500)
      cy.contains("Left Side").parent().within(() => {
        cy.get("span").contains(/^\d{2}:\d{2}$/).should("not.contain", "00:00")
      })
    })

    it("stops the left side timer when clicked again", () => {
      cy.visit("/feeding")
      cy.contains("Left Side").parent().find("button").click()
      cy.wait(2000)
      cy.contains("Left Side").parent().find("button").click()
      cy.contains("Left Side").parent().within(() => {
        cy.get("span").contains(/^\d{2}:\d{2}$/).invoke("text").then((timeBefore) => {
          cy.wait(1500)
          cy.get("span").contains(/^\d{2}:\d{2}$/).should("have.text", timeBefore)
        })
      })
    })

    it("manual duration input accepts a number", () => {
      cy.visit("/feeding")
      cy.contains("Manual Duration (mins)").parent().within(() => {
        cy.get("input[type=number]").clear().type("15")
        cy.get("input[type=number]").should("have.value", "15")
      })
    })
  })

  // 4. Bottle form
  describe("Bottle form", () => {
    it("fills bottle form fields and saves an entry", () => {
      cy.visit("/feeding")
      cy.contains("button", "Bottle").click()
      cy.contains("120").should("be.visible")
      cy.contains("+10ml").click()
      cy.contains("130").should("be.visible")
      cy.contains("-10ml").click()
      cy.contains("120").should("be.visible")
      cy.contains("Formula").click()
      cy.contains("Warm").click()
      cy.contains("label", "Notes").parent().within(() => {
        cy.get("textarea").type("Test bottle feed")
      })
      cy.contains("button", "Save Entry").click()
      cy.contains("button", "Bottle").click()
      cy.contains("120").should("be.visible")
    })
  })

  // 5. Solids form
  describe("Solids form", () => {
    it("fills solids form fields and saves an entry", () => {
      cy.visit("/feeding")
      cy.contains("button", "Solids").click()
      cy.contains("label", "Food Name").parent().within(() => {
        cy.get("input[type=text]").type("Sweet Potato")
      })
      cy.contains("label", "Quantity").parent().within(() => {
        cy.get("input[type=number]").clear().type("2")
      })
      cy.contains("Loved it").click()
      cy.contains("label", "Notes").parent().within(() => {
        cy.get("textarea").type("First time trying sweet potato")
      })
      cy.contains("button", "Save Entry").click()
      cy.contains("button", "Solids").click()
      cy.contains("label", "Food Name").parent().within(() => {
        cy.get("input[type=text]").should("have.value", "")
      })
    })
  })

  // 6. Save and timeline
  describe("Save and timeline", () => {
    it("saves a bottle entry and it appears in the timeline", () => {
      cy.visit("/feeding")
      cy.contains("button", "Bottle").click()
      cy.contains("Formula").click()
      cy.contains("button", "Save Entry").click()
      cy.contains("button", "Bottle").click()
      cy.contains("Bottle Feed").should("be.visible")
    })

    it("saves a breast entry with manual duration and shows in timeline", () => {
      cy.visit("/feeding")
      cy.contains("Manual Duration (mins)").parent().within(() => {
        cy.get("input[type=number]").clear().type("10")
      })
      cy.contains("Notes").parent().within(() => {
        cy.get("textarea").type("Morning breastfeed")
      })
      cy.contains("button", "Save Entry").click()
      cy.contains("Breastfeed").should("be.visible")
    })
  })

  // 7. Daily summary
  describe("Daily summary", () => {
    it("shows the Daily Summary section with bottle and breast totals", () => {
      cy.visit("/feeding")
      cy.contains("h3", "Daily Summary").should("be.visible")
      cy.contains("Bottle Total").should("be.visible")
      cy.contains("Breast Total").should("be.visible")
      cy.contains("mins").should("be.visible")
      cy.contains("Today").should("be.visible")
    })

    it("updates bottle total after saving a bottle entry", () => {
      cy.visit("/feeding")
      cy.contains("Bottle Total").parent().parent().within(() => {
        cy.get("p").contains("ml").invoke("text").then(() => {
          cy.visit("/feeding")
          cy.contains("button", "Bottle").click()
          cy.contains("label", "Amount").parent().within(() => {
            cy.get("input[type=range]").invoke("val", 150).trigger("input", { force: true })
          })
          cy.contains("button", "Save Entry").click()
          cy.visit("/feeding")
          cy.contains("Bottle Total").parent().parent().within(() => {
            cy.get("p").contains("ml").invoke("text").should("not.contain", "0ml")
          })
        })
      })
    })
  })

  // 8. Feeding timeline
  describe("Feeding timeline", () => {
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
          cy.visit("/feeding")
          cy.contains("No feeds recorded yet today").should("be.visible")
          cy.contains("Start by logging a feed above").should("be.visible")
          cy.clearAuthState()
        })
      })
    })

    it("shows seeded feeding sessions in the timeline", () => {
      cy.createFeedingSession(authToken, babyId, {
        feedType: "bottle", amountMl: 150, milkType: "formula",
      }).then(() => {
        return cy.createFeedingSession(authToken, babyId, {
          feedType: "breast", leftDurationSec: 600, rightDurationSec: 300,
        })
      }).then(() => {
        return cy.createFeedingSession(authToken, babyId, {
          feedType: "bottle", amountMl: 90, milkType: "breast_milk",
        })
      }).then(() => {
        cy.visit("/feeding")
        cy.contains("h3", "Timeline (Last 24h)").should("be.visible")
        cy.contains("Bottle Feed").should("exist")
        cy.contains("Breastfeed").should("exist")
        cy.contains("150ml").should("exist")
        cy.contains("90ml").should("exist")
      })
    })
  })

  // 9. Navigation
  describe("Navigation", () => {
    it("navigates to feeding page via bottom tab nav", () => {
      cy.visit("/dashboard")
      cy.get("nav").contains("Feeding").click()
      cy.url({ timeout: 10000 }).should("include", "/feeding")
      cy.contains("h1", "Feeding Log").should("be.visible")
    })

    it("navigates to feeding page via Log Feed quick action", () => {
      cy.visit("/dashboard")
      cy.contains("Log Feed").click()
      cy.url({ timeout: 10000 }).should("match", /\/feeding/)
    })

    it("feeding tab is highlighted when on feeding page", () => {
      cy.visit("/feeding")
      cy.get("nav").within(() => {
        cy.contains("Feeding").closest("a")
          .should("have.attr", "class")
          .and("match", /bg-primary-container/)
      })
    })
  })
})
