// ---------------------------------------------------------------------------
// CE-004 / FE-006 — Feeding E2E tests — breast, bottle, solids
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

  // =========================================================================
  // 1. Navigation
  // =========================================================================
  describe("Navigation", () => {
    it("navigates to feeding page via bottom tab nav", () => {
      cy.visit("/dashboard")
      cy.get("nav.md\\:hidden").contains("Feeding").click()
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
      cy.get("nav.md\\:hidden").within(() => {
        cy.contains("Feeding").closest("a")
          .should("have.attr", "class")
          .and("match", /bg-primary-container/)
      })
    })
  })

  // =========================================================================
  // 2. Page load and default state
  // =========================================================================
  describe("Page load and default state", () => {
    it("loads the feeding page with heading and default breast tab", () => {
      cy.visit("/feeding")
      cy.contains("h1", "Feeding Log").should("be.visible")
      cy.contains("Track").should("be.visible")
      cy.contains("h3", "Record Feed").should("be.visible")
    })

    it("default tab is Breast with Left Side and Right Side labels", () => {
      cy.visit("/feeding")
      cy.contains("button", "Breast").should("be.visible")
      cy.contains("Left Side").should("be.visible")
      cy.contains("Right Side").should("be.visible")
      cy.contains("Manual Duration (mins)").should("be.visible")
    })
  })

  // =========================================================================
  // 3. Tab switching
  // =========================================================================
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
    })

    it("hides BreastTimer when switching to Bottle", () => {
      cy.visit("/feeding")
      cy.contains("button", "Bottle").click()
      cy.contains("Left Side").should("not.exist")
    })

    it("hides BottleForm when switching to Solids", () => {
      cy.visit("/feeding")
      cy.contains("button", "Bottle").click()
      cy.contains("label", "Amount").should("be.visible")
      cy.contains("button", "Solids").click()
      cy.contains("label", "Amount").should("not.exist")
    })
  })

  // =========================================================================
  // 4. Breast timer flow
  // =========================================================================
  describe("Breast timer flow", () => {
    it("starts the left side timer and counts up", () => {
      cy.visit("/feeding")
      // Default state shows 00:00
      cy.contains("Left Side").parent().find("button").contains("00:00")
      // Click left side to start timer
      cy.contains("Left Side").parent().find("button").click()
      // Wait 3 seconds and verify timer advanced
      cy.wait(3000)
      cy.contains("Left Side").parent().within(() => {
        cy.get("span").contains(/^\d{2}:\d{2}$/).should("not.contain", "00:00")
      })
    })

    it("stops the left side timer when clicked again (pause)", () => {
      cy.visit("/feeding")
      cy.contains("Left Side").parent().find("button").click()
      cy.wait(2000)
      // Pause the timer
      cy.contains("Left Side").parent().find("button").click()
      cy.contains("Left Side").parent().within(() => {
        cy.get("span").contains(/^\d{2}:\d{2}$/).invoke("text").then((timeBefore) => {
          cy.wait(1500)
          // Time should not have advanced
          cy.get("span").contains(/^\d{2}:\d{2}$/).should("have.text", timeBefore)
        })
      })
    })

    it("starts the right side timer and counts up", () => {
      cy.visit("/feeding")
      cy.contains("Right Side").parent().find("button").click()
      cy.wait(2000)
      cy.contains("Right Side").parent().within(() => {
        cy.get("span").contains(/^\d{2}:\d{2}$/).should("not.contain", "00:00")
      })
    })

    it("manual duration input accepts a number", () => {
      cy.visit("/feeding")
      cy.contains("Manual Duration (mins)").parent().within(() => {
        cy.get("input[type=number]").clear().type("15")
        cy.get("input[type=number]").should("have.value", "15")
      })
    })

    it("saves a breast entry with timer and it appears in timeline", () => {
      cy.visit("/feeding")
      // Start left timer
      cy.contains("Left Side").parent().find("button").click()
      cy.wait(2500)
      // Click Save Entry
      cy.contains("button", "Save Entry").click()
      // Wait for save to complete and timeline to update
      cy.wait(1000)
      // Verify breastfeed entry appears in timeline
      cy.contains("Breastfeed").should("be.visible")
    })

    it("timer resets to 00:00 after saving", () => {
      cy.visit("/feeding")
      // Start left timer
      cy.contains("Left Side").parent().find("button").click()
      cy.wait(2500)
      // Save the entry
      cy.contains("button", "Save Entry").click()
      cy.wait(1000)
      // Both timers should show 00:00 after reset
      cy.contains("Left Side").parent().find("button").contains("00:00")
      cy.contains("Right Side").parent().find("button").contains("00:00")
    })

    it("saves a breast entry with manual duration and shows 5m total in timeline", () => {
      cy.visit("/feeding")
      // Set manual duration to 5
      cy.contains("Manual Duration (mins)").parent().within(() => {
        cy.get("input[type=number]").clear().type("5")
      })
      cy.contains("button", "Save Entry").click()
      cy.wait(1000)
      // Verify timeline shows breastfeed entry
      cy.contains("Breastfeed").should("be.visible")
      cy.contains("5m total").should("be.visible")
    })
  })

  // =========================================================================
  // 5. Bottle feed flow
  // =========================================================================
  describe("Bottle feed flow", () => {
    it("shows bottle form with amount display and controls", () => {
      cy.visit("/feeding")
      cy.contains("button", "Bottle").click()
      cy.contains("label", "Amount").should("be.visible")
      cy.contains("120").should("be.visible")
      cy.contains("+10ml").should("be.visible")
      cy.contains("-10ml").should("be.visible")
    })

    it("increases amount with +10ml button", () => {
      cy.visit("/feeding")
      cy.contains("button", "Bottle").click()
      cy.contains("+10ml").click()
      cy.contains("130").should("be.visible")
    })

    it("decreases amount with -10ml button", () => {
      cy.visit("/feeding")
      cy.contains("button", "Bottle").click()
      cy.contains("-10ml").click()
      cy.contains("110").should("be.visible")
    })

    it("selects Formula milk type", () => {
      cy.visit("/feeding")
      cy.contains("button", "Bottle").click()
      cy.contains("Formula").click()
      cy.contains("Formula").closest("label").should("have.class", "border-primary")
    })

    it("selects Warm temperature", () => {
      cy.visit("/feeding")
      cy.contains("button", "Bottle").click()
      cy.contains("Warm").click()
      cy.contains("Warm").closest("button").should("have.class", "border-primary")
    })

    it("fills bottle form with notes and saves entry", () => {
      cy.visit("/feeding")
      cy.contains("button", "Bottle").click()
      cy.contains("+10ml").click()
      cy.contains("Formula").click()
      cy.contains("Warm").click()
      cy.contains("label", "Notes").parent().within(() => {
        cy.get("textarea").type("took well")
      })
      cy.contains("button", "Save Entry").click()
      cy.wait(1000)
      // Verify timeline shows bottle feed entry
      cy.contains("Bottle Feed").should("be.visible")
    })

    it("resets form after saving", () => {
      cy.visit("/feeding")
      cy.contains("button", "Bottle").click()
      // Change amount
      cy.contains("+10ml").click()
      cy.contains("130").should("be.visible")
      // Select Formula
      cy.contains("Formula").click()
      // Save
      cy.contains("button", "Save Entry").click()
      cy.wait(1000)
      // Switch back to bottle tab and verify reset
      cy.contains("button", "Bottle").click()
      cy.contains("120").should("be.visible")
    })
  })

  // =========================================================================
  // 6. Solids feed flow
  // =========================================================================
  describe("Solids feed flow", () => {
    it("shows solids form with food name input", () => {
      cy.visit("/feeding")
      cy.contains("button", "Solids").click()
      cy.contains("label", "Food Name").should("be.visible")
      cy.get("input[type=text]").should("be.visible")
    })

    it("fills food name, quantity, and unit", () => {
      cy.visit("/feeding")
      cy.contains("button", "Solids").click()
      cy.contains("label", "Food Name").parent().within(() => {
        cy.get("input[type=text]").type("Sweet Potato")
      })
      cy.contains("label", "Quantity").parent().within(() => {
        cy.get("input[type=number]").clear().type("2")
      })
      // Verify default unit is tbsp
      cy.get("select").should("have.value", "tbsp")
      // Change unit
      cy.get("select").select("oz")
      cy.get("select").should("have.value", "oz")
    })

    it("selects Loved it reaction", () => {
      cy.visit("/feeding")
      cy.contains("button", "Solids").click()
      cy.contains("Loved it").click()
      cy.contains("Loved it").closest("button").should("have.class", "border-primary")
    })

    it("saves solids entry and shows in timeline with reaction tag", () => {
      cy.visit("/feeding")
      cy.contains("button", "Solids").click()
      // Fill form
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
      // Save
      cy.contains("button", "Save Entry").click()
      cy.wait(1000)
      // Verify timeline shows the entry
      cy.contains("Sweet Potato").should("be.visible")
      cy.contains("Loved it!").should("be.visible")
    })

    it("resets solids form after saving", () => {
      cy.visit("/feeding")
      cy.contains("button", "Solids").click()
      cy.contains("label", "Food Name").parent().within(() => {
        cy.get("input[type=text]").type("Banana")
      })
      cy.contains("button", "Save Entry").click()
      cy.wait(1000)
      // Switch back to solids tab and verify reset
      cy.contains("button", "Solids").click()
      cy.contains("label", "Food Name").parent().within(() => {
        cy.get("input[type=text]").should("have.value", "")
      })
    })
  })

  // =========================================================================
  // 7. Daily summary
  // =========================================================================
  describe("Daily summary", () => {
    it("shows the Daily Summary section with bottle and breast totals", () => {
      cy.visit("/feeding")
      cy.contains("h3", "Daily Summary").should("be.visible")
      cy.contains("Bottle Total").should("be.visible")
      cy.contains("Breast Total").should("be.visible")
      cy.contains("mins").should("be.visible")
      cy.contains("Today").should("be.visible")
    })

    it("bar chart has 6 bars", () => {
      cy.visit("/feeding")
      // The bar chart has 6 time slots (6AM, 9AM, 12PM, 3PM, 6PM, 9PM)
      cy.get(".rounded-t-lg").should("have.length", 6)
    })

    it("shows non-zero bottle total after saving a bottle entry", () => {
      cy.visit("/feeding")
      cy.contains("button", "Bottle").click()
      cy.contains("Formula").click()
      cy.contains("button", "Save Entry").click()
      cy.wait(1000)
      // Reload and check totals
      cy.visit("/feeding")
      cy.contains("Bottle Total").parent().parent().within(() => {
        cy.get("p").contains("ml").invoke("text").should("not.eq", "0ml")
      })
    })

    it("shows non-zero breast total after saving a breast entry", () => {
      cy.visit("/feeding")
      cy.contains("Manual Duration (mins)").parent().within(() => {
        cy.get("input[type=number]").clear().type("10")
      })
      cy.contains("button", "Save Entry").click()
      cy.wait(1000)
      // Reload and check totals
      cy.visit("/feeding")
      cy.contains("Breast Total").parent().parent().within(() => {
        cy.get("p").contains("mins").invoke("text").should("not.eq", "0 mins")
      })
    })
  })

  // =========================================================================
  // 8. Feeding timeline
  // =========================================================================
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
      cy.visit("/feeding")
      // Seed bottle feed via UI (150ml formula): click +10ml 3 times from default 120
      cy.contains("button", "Bottle").click()
      cy.contains("+10ml").click()
      cy.contains("+10ml").click()
      cy.contains("+10ml").click()
      cy.contains("Formula").click()
      cy.contains("button", "Save Entry").click()
      cy.wait(500)
      // Seed breast feed via UI (manual 10min)
      cy.contains("button", "Breast").click()
      cy.contains("Manual Duration (mins)").parent().within(() => {
        cy.get("input[type=number]").clear().type("10")
      })
      cy.contains("button", "Save Entry").click()
      cy.wait(500)
      // Seed another bottle feed via UI (90ml breast milk): click -10ml 3 times from default 120
      cy.contains("button", "Bottle").click()
      cy.contains("-10ml").click()
      cy.contains("-10ml").click()
      cy.contains("-10ml").click()
      cy.contains("button", "Save Entry").click()
      cy.wait(500)
      // Verify timeline shows all entries
      cy.contains("h3", "Timeline (Last 24h)", { timeout: 10000 }).should("be.visible")
      cy.contains("Bottle Feed", { timeout: 10000 }).should("exist")
      cy.contains("Breastfeed", { timeout: 10000 }).should("exist")
      cy.contains("150ml", { timeout: 10000 }).should("exist")
      cy.contains("90ml", { timeout: 10000 }).should("exist")
    })
  })

  // =========================================================================
  // 9. Time-since-last-feed alert
  // =========================================================================
  describe("Time-since-last-feed alert", () => {
    it("does not show alert when last feed was recent", () => {
      cy.visit("/feeding")
      cy.contains(/It's been over/).should("not.exist")
    })
  })
})
