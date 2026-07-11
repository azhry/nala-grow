// ---------------------------------------------------------------------------
// CE-008 — Profile management E2E tests
//
// These tests run against the REAL backend GraphQL API at localhost:8080.
// They use the helper commands from seed.ts for API-level operations
// (signup, loginByApi, createBaby, setAuthState, clearAuthState)
// and the real UI for profile management interactions.
//
// Each test uses a unique timestamp-based email for isolation.
// Data cleanup happens in the after hook.
// ---------------------------------------------------------------------------

describe("CE-008: Profile Management E2E (real backend)", () => {
  const BASE_EMAIL = "ce008-profile-" + Date.now()
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

  // 1. Profile page redirects to manage when baby exists
  describe("Profile page redirects", () => {
    it("redirects to /profile/manage when babies exist", () => {
      cy.visit("/profile")
      cy.url({ timeout: 10000 }).should("include", "/profile/manage")
      cy.contains("h1", "Manage Profiles").should("be.visible")
    })

    it("redirects to /profile/create when no babies exist", () => {
      const email = freshEmail("no-babies")
      cy.signup(email, PASSWORD).then((res) => {
        cy.setAuthState(res.token, res.user)
        cy.visit("/profile")
        cy.url({ timeout: 10000 }).should("include", "/profile/create")
        cy.contains("h1", "Welcome to NalaGrow").should("be.visible")
        cy.clearAuthState()
      })
    })
  })

  // 2. Manage profile shows baby info
  describe("Manage profile content", () => {
    it("shows baby name and age on manage page", () => {
      cy.visit("/profile/manage")
      cy.contains("h1", "Manage Profiles").should("be.visible")
      cy.contains("Your Little Ones").should("be.visible")
      cy.contains(BABY_NAME).should("be.visible")
      cy.contains("CURRENT").should("be.visible")
    })

    it("shows DOB and sex info", () => {
      cy.visit("/profile/manage")
      cy.contains("DOB:").should("be.visible")
      cy.contains("Sex: Female").should("be.visible")
    })

    it("shows Edit Profile button for active baby", () => {
      cy.visit("/profile/manage")
      cy.contains("button", "Edit Profile").should("be.visible")
    })

    it("shows Add New Baby link", () => {
      cy.visit("/profile/manage")
      cy.contains("Add New Baby").should("be.visible")
      cy.contains("Expand your NalaGrow family").should("be.visible")
    })
  })

  // 3. Create profile form
  describe("Create profile form", () => {
    it("fills name, DOB, sex and saves a new profile", () => {
      const email = freshEmail("create-form")
      cy.signup(email, PASSWORD).then((res) => {
        cy.setAuthState(res.token, res.user)
        cy.visit("/profile/create")

        cy.contains("h1", "Welcome to NalaGrow").should("be.visible")
        cy.get("#baby-name").type("NewBaby")
        cy.get("#baby-dob").type("2025-06-01")
        cy.contains("label", "Female").click()
        cy.contains("button", "Save Profile").click()

        cy.url({ timeout: 10000 }).should("include", "/profile/manage")
        cy.contains("NewBaby").should("be.visible")
        cy.clearAuthState()
      })
    })

    it("shows validation error when name is empty", () => {
      const email = freshEmail("create-validation")
      cy.signup(email, PASSWORD).then((res) => {
        cy.setAuthState(res.token, res.user)
        cy.visit("/profile/create")
        cy.get("#baby-dob").type("2025-06-01")
        cy.contains("button", "Save Profile").click()
        cy.contains("Please enter your baby's name").should("be.visible")
        cy.clearAuthState()
      })
    })

    it("shows validation error when DOB is empty", () => {
      const email = freshEmail("create-dob")
      cy.signup(email, PASSWORD).then((res) => {
        cy.setAuthState(res.token, res.user)
        cy.visit("/profile/create")
        cy.get("#baby-name").type("DobBaby")
        cy.contains("button", "Save Profile").click()
        cy.contains("Please enter the date of birth").should("be.visible")
        cy.clearAuthState()
      })
    })
  })

  // 4. Bottom tab navigation
  describe("Bottom tab navigation", () => {
    it("navigates to profile via bottom tab nav", () => {
      cy.visit("/dashboard")
      cy.get("nav.md\\:hidden").contains("Profile").click()
      cy.url({ timeout: 10000 }).should("include", "/profile")
      cy.contains("h1", "Manage Profiles").should("be.visible")
    })

    it("profile tab is highlighted when on profile page", () => {
      cy.visit("/profile/manage")
      cy.get("nav.md\\:hidden").within(() => {
        cy.contains("Profile").closest("a")
          .should("have.attr", "class")
          .and("match", /bg-primary-container/)
      })
    })
  })

  // 5. Profile switcher with multiple babies
  describe("Profile switcher", () => {
    it("switches active profile between two babies", () => {
      const email = freshEmail("switcher")
      cy.signup(email, PASSWORD).then((res) => {
        const token = res.token
        cy.createBaby(token, "BabyAlpha", "2025-03-01", "male").then((babyA) => {
          cy.createBaby(token, "BabyBeta", "2025-06-15", "female").then((babyBeta) => {
            cy.setAuthState(token, res.user)
            cy.window().then((win) => {
              const store = JSON.parse(win.localStorage.getItem("nalagrow-store") || "{}")
              store.state.activeBaby = babyA
              store.state.babies = [babyA, babyBeta]
              win.localStorage.setItem("nalagrow-store", JSON.stringify(store))
            })

            cy.visit("/profile/manage")
            cy.contains("BabyAlpha").should("be.visible")
            cy.contains("BabyBeta").should("be.visible")
            cy.contains("button", "Switch to BabyBeta").click()
            cy.wait(1500)
            cy.visit("/profile/manage")
            cy.contains("CURRENT").should("be.visible")
            cy.clearAuthState()
          })
        })
      })
    })
  })

  // 6. Delete profile modal
  describe("Delete profile modal", () => {
    it("opens delete confirmation modal and cancels", () => {
      const email = freshEmail("delete-cancel")
      cy.signup(email, PASSWORD).then((res) => {
        const token = res.token
        cy.createBaby(token, "DeleteMe", "2025-04-01", "female").then((babyA) => {
          cy.createBaby(token, "KeepMe", "2025-05-01", "male").then((babyKeep) => {
            cy.setAuthState(token, res.user)
            cy.window().then((win) => {
              const store = JSON.parse(win.localStorage.getItem("nalagrow-store") || "{}")
              store.state.activeBaby = babyKeep
              store.state.babies = [babyKeep, babyA]
              win.localStorage.setItem("nalagrow-store", JSON.stringify(store))
            })

            cy.visit("/profile/manage")
            cy.contains("DeleteMe").should("be.visible")
            cy.contains("KeepMe").should("be.visible")

            cy.contains("DeleteMe").parent().parent().parent().within(() => {
              cy.get("button .material-symbols-outlined").contains("edit").click()
            })
            cy.contains("h3", "Delete Profile?").should("be.visible")
            cy.contains("This action cannot be undone").should("be.visible")
            cy.contains("button", "Cancel").click()
            cy.contains("h3", "Delete Profile?").should("not.exist")
            cy.clearAuthState()
          })
        })
      })
    })
  })
})
