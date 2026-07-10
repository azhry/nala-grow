describe("CE-011: Navigation E2E Tests", () => {
  const FAMILY_1_EMAIL = "nav-family-1@test.com"
  const FAMILY_1_PASS = "Password123"
  const FAMILY_2_EMAIL = "nav-family-2@test.com"
  const FAMILY_2_PASS = "Password123"

  before(function () {
    cy.signup(FAMILY_1_EMAIL, FAMILY_1_PASS).then((res) => {
      cy.wrap(res.token).as("token1")
      cy.wrap(res.user).as("user1")
      return cy.createBaby(res.token, "Emma", "2025-10-01", "female")
    }).then((baby) => {
      cy.wrap(baby.id).as("baby1Id")
      cy.get("@token1").then((t) => {
        cy.createFeedingSession(t as string, baby.id, { feedType: "bottle", amountMl: 150 })
        cy.createSleepSession(t as string, baby.id)
        cy.createMeasurement(t as string, baby.id)
        cy.createMilestone(t as string, baby.id)
      })
    })

    cy.signup(FAMILY_2_EMAIL, FAMILY_2_PASS).then((res) => {
      cy.wrap(res.token).as("token2")
      return cy.createBaby(res.token, "Noah", "2025-08-15", "male")
    }).then((baby) => {
      cy.wrap(baby.id).as("baby2Id")
      cy.get("@token2").then((t) => {
        cy.createFeedingSession(t as string, baby.id, { feedType: "breast", leftDurationSec: 600, rightDurationSec: 480 })
        cy.createSleepSession(t as string, baby.id, { location: "bed" })
        cy.createMeasurement(t as string, baby.id, { weight: 7.2, height: 65.0 })
        cy.createMilestone(t as string, baby.id, { title: "Rolled over", category: "physical" })
      })
    })
  })

  after(function () {
    cy.get("@token1").then((t) => cy.get("@baby1Id").then((b) => cy.deleteBabyByApi(t as string, b as string)))
    cy.get("@token2").then((t) => cy.get("@baby2Id").then((b) => cy.deleteBabyByApi(t as string, b as string)))
    cy.clearAuthState()
  })

  describe("Unauthenticated access", () => {
    beforeEach(() => {
      cy.clearAuthState()
    })

    it("shows login page at /login", () => {
      cy.visit("/login")
      cy.contains("h1", "NalaGrow").should("be.visible")
      cy.get("#email").should("be.visible")
      cy.get("#password").should("be.visible")
      cy.contains("button", "Login").should("be.visible")
    })

    it("shows signup page at /signup", () => {
      cy.visit("/signup")
      cy.contains("Create your account").should("be.visible")
    })

    it("shows reset password page at /reset-password", () => {
      cy.visit("/reset-password")
      cy.contains("h1", "Reset Password").should("be.visible")
    })
  })

  describe("Login flow", () => {
    it("logs in with valid credentials and redirects to dashboard", function () {
      cy.visit("/login")
      cy.get("#email").type(FAMILY_1_EMAIL)
      cy.get("#password").type(FAMILY_1_PASS)
      cy.contains("button", "Login").click()
      cy.url({ timeout: 10000 }).should("include", "/dashboard")
      cy.window().its("localStorage.nalagrow-token").should("exist")
    })
  })

  describe("Bottom tab navigation (authenticated)", () => {
    beforeEach(function () {
      cy.get("@token1").then((t) => cy.get("@user1").then((u) => cy.setAuthState(t as string, u as { id: string; email: string })))
      cy.visit("/dashboard")
    })

    it("renders all 6 bottom tab links", () => {
      const tabs = ["Home", "Growth", "Feeding", "Sleep", "Milestones", "Profile"]
      tabs.forEach((label) => {
        cy.get("nav").contains("a", label).should("exist")
      })
    })

    it("has Home active by default on /dashboard", () => {
      cy.get("nav").contains("a", "Home").should("have.class", "bg-primary-container")
    })

    it("navigates to /growth when clicking Growth tab", () => {
      cy.get("nav").contains("a", "Growth").click()
      cy.url().should("include", "/growth")
    })

    it("navigates to /feeding when clicking Feeding tab", () => {
      cy.get("nav").contains("a", "Feeding").click()
      cy.url().should("include", "/feeding")
    })

    it("navigates to /sleep when clicking Sleep tab", () => {
      cy.get("nav").contains("a", "Sleep").click()
      cy.url().should("include", "/sleep")
    })

    it("navigates to /milestones when clicking Milestones tab", () => {
      cy.get("nav").contains("a", "Milestones").click()
      cy.url().should("include", "/milestones")
    })

    it("navigates to /profile when clicking Profile tab", () => {
      cy.get("nav").contains("a", "Profile").click({ force: true })
      cy.url().should("include", "/profile")
    })

    it("navigates back to /dashboard when clicking Home tab", () => {
      cy.get("nav").contains("a", "Growth").click()
      cy.url().should("include", "/growth")
      cy.get("nav").contains("a", "Home").click()
      cy.url().should("include", "/dashboard")
    })

    it("highlights only the active tab", () => {
      cy.get("nav").contains("a", "Home").should("have.class", "bg-primary-container")
      const inactiveTabs = ["Growth", "Feeding", "Sleep", "Milestones", "Profile"]
      inactiveTabs.forEach((label) => {
        cy.get("nav").contains("a", label).should("not.have.class", "bg-primary-container")
      })
    })
  })

  describe("Dashboard rendering", () => {
    beforeEach(function () {
      cy.get("@token1").then((t) => cy.get("@user1").then((u) => cy.setAuthState(t as string, u as { id: string; email: string })))
      cy.visit("/dashboard")
    })

    it("displays greeting text", () => {
      cy.contains("h2", /^(Good morning|Good afternoon|Good evening)/).should("be.visible")
    })

    it("shows summary cards", () => {
      cy.contains("Last Feed").should("be.visible")
      cy.contains("Sleep").should("be.visible")
      cy.contains("Growth").should("be.visible")
    })

    it("shows quick action links", () => {
      cy.contains("Log Feed").should("be.visible")
      cy.contains("Log Sleep").should("be.visible")
      cy.contains("Log Growth").should("be.visible")
    })
  })

  describe("Feeding page", () => {
    beforeEach(function () {
      cy.get("@token1").then((t) => cy.get("@user1").then((u) => cy.setAuthState(t as string, u as { id: string; email: string })))
    })

    it("renders the feeding log page", () => {
      cy.visit("/feeding")
      cy.contains("h1", "Feeding Log").should("be.visible")
    })

    it("shows feed type tabs", () => {
      cy.visit("/feeding")
      cy.contains("Breast").should("be.visible")
      cy.contains("Bottle").should("be.visible")
      cy.contains("Solids").should("be.visible")
    })

    it("shows save entry button", () => {
      cy.visit("/feeding")
      cy.contains("button", "Save Entry").should("be.visible")
    })
  })

  describe("Sleep page", () => {
    beforeEach(function () {
      cy.get("@token1").then((t) => cy.get("@user1").then((u) => cy.setAuthState(t as string, u as { id: string; email: string })))
    })

    it("renders the sleep tracking page", () => {
      cy.visit("/sleep")
      cy.contains("h1", "Sleep Tracking").should("be.visible")
    })

    it("shows timer and manual tabs", () => {
      cy.visit("/sleep")
      cy.contains("Timer").should("be.visible")
      cy.contains("Manual").should("be.visible")
    })
  })

  describe("Growth page", () => {
    beforeEach(function () {
      cy.get("@token1").then((t) => cy.get("@user1").then((u) => cy.setAuthState(t as string, u as { id: string; email: string })))
    })

    it("renders the growth tracking page", () => {
      cy.visit("/growth")
      cy.contains("h1", "Growth Tracking").should("be.visible")
    })

    it("shows current stats section", () => {
      cy.visit("/growth")
      cy.contains("Current Stats").should("be.visible")
      cy.contains("Weight").should("be.visible")
      cy.contains("Height").should("be.visible")
      cy.contains("Head Circ.").should("be.visible")
    })
  })

  describe("Milestones page", () => {
    beforeEach(function () {
      cy.get("@token1").then((t) => cy.get("@user1").then((u) => cy.setAuthState(t as string, u as { id: string; email: string })))
    })

    it("renders the milestones page", () => {
      cy.visit("/milestones")
      cy.contains("h1", "Milestones").should("be.visible")
    })

    it("shows milestone timeline", () => {
      cy.visit("/milestones")
      cy.contains("Milestone Timeline").should("be.visible")
    })
  })

  describe("Profile page", () => {
    beforeEach(function () {
      cy.get("@token1").then((t) => cy.get("@user1").then((u) => cy.setAuthState(t as string, u as { id: string; email: string })))
    })

    it("redirects to profile management from /profile", () => {
      cy.visit("/profile")
      cy.url().should("match", /\/profile\/(manage|create)/)
    })
  })

  describe("Desktop sidebar (desktop viewport)", () => {
    beforeEach(function () {
      cy.get("@token1").then((t) => cy.get("@user1").then((u) => cy.setAuthState(t as string, u as { id: string; email: string })))
      cy.viewport(1280, 900)
      cy.visit("/dashboard")
    })

    it("renders main navigation links in sidebar", () => {
      const links = ["Home", "Growth", "Feeding", "Sleep", "Milestones"]
      links.forEach((label) => {
        cy.get("aside").contains("a", label).should("be.visible")
      })
    })

    it("renders secondary navigation links", () => {
      cy.get("aside").contains("Settings").should("be.visible")
      cy.get("aside").contains("Export").should("be.visible")
    })

    it("highlights Home as active on /dashboard", () => {
      cy.get("aside").contains("a", "Home").should("have.class", "bg-primary-container/30")
    })
  })

  describe("Responsive layout", () => {
    beforeEach(function () {
      cy.get("@token1").then((t) => cy.get("@user1").then((u) => cy.setAuthState(t as string, u as { id: string; email: string })))
    })

    it("shows BottomTabNav on mobile viewport", () => {
      cy.viewport(390, 844)
      cy.visit("/dashboard")
      cy.get("nav").should("be.visible")
      cy.get("aside").should("not.be.visible")
    })

    it("shows DesktopSidebar on desktop viewport", () => {
      cy.viewport(1280, 900)
      cy.visit("/dashboard")
      cy.get("aside").should("be.visible")
    })

    it("shows DesktopSidebar on tablet viewport (1024px)", () => {
      cy.viewport(1024, 768)
      cy.visit("/dashboard")
      cy.get("aside").should("be.visible")
    })
  })
})
