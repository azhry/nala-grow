describe("Auth Flow", () => {
  describe("Login page", () => {
    beforeEach(() => {
      cy.visit("/login")
    })

    it("renders the login form", () => {
      cy.contains("h1", "NalaGrow").should("be.visible")
      cy.contains("Welcome back to your parenting journey.").should("be.visible")
      cy.get("#email").should("be.visible")
      cy.get("#password").should("be.visible")
      cy.contains("button", "Login").should("be.visible")
      cy.contains("Forgot Password?").should("be.visible")
      cy.contains("Create an account").should("be.visible")
    })

    it("renders Google OAuth button", () => {
      cy.contains("or continue with").should("be.visible")
      cy.contains("button", "Google").should("be.visible")
    })

    it("shows error on submit with no Supabase configured", () => {
      cy.get("#email").type("test@example.com")
      cy.get("#password").type("password123")
      cy.contains("button", "Login").click()
      cy.contains("Supabase is not configured", { timeout: 8000 }).should("be.visible")
    })

    it("toggles password visibility", () => {
      cy.get("#password").should("have.attr", "type", "password")
      cy.get("#password").parent().find("button").click()
      cy.get("#password").should("have.attr", "type", "text")
      cy.get("#password").parent().find("button").click()
      cy.get("#password").should("have.attr", "type", "password")
    })

    it("navigates to reset password page", () => {
      cy.contains("Forgot Password?").click()
      cy.url().should("include", "/reset-password")
    })

    it("navigates to signup page", () => {
      cy.contains("Create an account").click()
      cy.url().should("include", "/signup")
    })

    it("redirects to dashboard when authenticated", () => {
      cy.visit("/login?redirect=/dashboard")
      cy.get("#email").type("test@example.com")
      cy.get("#password").type("password123")
    })
  })

  describe("Signup page", () => {
    beforeEach(() => {
      cy.visit("/signup")
    })

    it("renders the signup form", () => {
      cy.contains("h2", "Create your account").should("be.visible")
      cy.contains("Start tracking your baby").should("be.visible")
      cy.get("#email").should("be.visible")
      cy.get("#password").should("be.visible")
      cy.get("#terms").should("be.visible")
      cy.contains("button", "Create Account").should("be.visible")
      cy.contains("Login").should("be.visible")
    })

    it("shows error when password is too short", () => {
      cy.get("#email").type("test@example.com")
      cy.get("#password").type("short")
      cy.get("#terms").check()
      cy.contains("button", "Create Account").click()
      cy.contains("Password must be at least 8 characters").should("be.visible")
    })

    it("shows error when terms not accepted", () => {
      cy.get("#email").type("test@example.com")
      cy.get("#password").type("password123")
      cy.contains("button", "Create Account").click()
      cy.contains("Please accept the Terms of Service").should("be.visible")
    })

    it("shows error on submit with no Supabase configured", () => {
      cy.get("#email").type("test@example.com")
      cy.get("#password").type("password123")
      cy.get("#terms").check()
      cy.contains("button", "Create Account").click()
      cy.contains("Supabase is not configured", { timeout: 8000 }).should("be.visible")
    })

    it("navigates to login page", () => {
      cy.contains("Login").click()
      cy.url().should("include", "/login")
    })

    it("renders Google OAuth button", () => {
      cy.contains("Google").should("be.visible")
    })
  })

  describe("Reset password page", () => {
    beforeEach(() => {
      cy.visit("/reset-password")
    })

    it("renders the reset password form", () => {
      cy.contains("h1", "Reset Password").should("be.visible")
      cy.contains("We'll send you a link").should("be.visible")
      cy.get("#reset-email").should("be.visible")
      cy.contains("button", "Send Reset Link").should("be.visible")
      cy.contains("Back to login").should("be.visible")
    })

    it("shows error on submit with no Supabase configured", () => {
      cy.get("#reset-email").type("test@example.com")
      cy.contains("button", "Send Reset Link").click()
      cy.contains("Supabase is not configured", { timeout: 8000 }).should("be.visible")
    })

    it("navigates to login page", () => {
      cy.contains("Back to login").click()
      cy.url().should("include", "/login")
    })
  })
})
