describe("Navigation", () => {
  describe("BottomTabNav (mobile viewport)", () => {
    beforeEach(() => {
      cy.viewport(390, 844)
      cy.visit("/dashboard")
    })

    it("renders all 6 bottom tab links", () => {
      const tabs = ["Home", "Growth", "Feeding", "Sleep", "Milestones", "Profile"]
      tabs.forEach((label) => {
        cy.get("nav.fixed").contains("a", label).should("exist")
      })
    })

    it("has Home active by default on /dashboard", () => {
      cy.get("nav.fixed").contains("a", "Home").should("have.class", "bg-primary-container")
    })

    it("navigates to /growth when clicking Growth tab", () => {
      cy.get("nav.fixed").contains("a", "Growth").click()
      cy.url().should("include", "/growth")
      cy.get("nav.fixed").contains("a", "Growth").should("have.class", "bg-primary-container")
    })

    it("navigates to /feeding when clicking Feeding tab", () => {
      cy.get("nav.fixed").contains("a", "Feeding").click()
      cy.url().should("include", "/feeding")
      cy.get("nav.fixed").contains("a", "Feeding").should("have.class", "bg-primary-container")
    })

    it("navigates to /sleep when clicking Sleep tab", () => {
      cy.get("nav.fixed").contains("a", "Sleep").click()
      cy.url().should("include", "/sleep")
      cy.get("nav.fixed").contains("a", "Sleep").should("have.class", "bg-primary-container")
    })

    it("navigates to /milestones when clicking Milestones tab", () => {
      cy.get("nav.fixed").contains("a", "Milestones").click()
      cy.url().should("include", "/milestones")
      cy.get("nav.fixed").contains("a", "Milestones").should("have.class", "bg-primary-container")
    })

    it("navigates to /profile when clicking Profile tab", () => {
      cy.get("nav.fixed").contains("a", "Profile").click({ force: true })
      cy.url().should("include", "/profile")
      cy.get("nav.fixed").contains("a", "Profile").should("have.class", "bg-primary-container")
    })

    it("navigates back to /dashboard when clicking Home tab", () => {
      cy.get("nav.fixed").contains("a", "Growth").click()
      cy.url().should("include", "/growth")
      cy.get("nav.fixed").contains("a", "Home").click()
      cy.url().should("include", "/dashboard")
      cy.get("nav.fixed").contains("a", "Home").should("have.class", "bg-primary-container")
    })

    it("highlights only the active tab", () => {
      cy.get("nav.fixed").contains("a", "Home").should("have.class", "bg-primary-container")
      const inactiveTabs = ["Growth", "Feeding", "Sleep", "Milestones", "Profile"]
      inactiveTabs.forEach((label) => {
        cy.get("nav.fixed").contains("a", label).should("not.have.class", "bg-primary-container")
      })
    })
  })

  describe("DesktopSidebar (desktop viewport)", () => {
    beforeEach(() => {
      cy.viewport(1280, 900)
      cy.visit("/dashboard")
    })

    it("renders main navigation links", () => {
      const links = ["Home", "Growth", "Feeding", "Sleep", "Milestones"]
      links.forEach((label) => {
        cy.contains("aside a", label).should("be.visible")
      })
    })

    it("renders secondary navigation links", () => {
      cy.contains("aside a", "Settings").should("be.visible")
      cy.contains("aside a", "Export").should("be.visible")
    })

    it("highlights Home as active on /dashboard", () => {
      cy.contains("aside a", "Home").should("have.class", "bg-primary-container/30")
    })

    it("navigates to /growth when clicking Growth", () => {
      cy.contains("aside a", "Growth").click({ force: true })
      cy.url().should("include", "/growth")
      cy.contains("aside a", "Growth").should("have.class", "bg-primary-container/30")
    })
  })

  describe("Responsive layout", () => {
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
      cy.get("nav.fixed").should("not.be.visible")
    })

    it("shows DesktopSidebar on tablet viewport (lg breakpoint 1024px)", () => {
      cy.viewport(1024, 768)
      cy.visit("/dashboard")
      cy.get("aside").should("be.visible")
      cy.get("nav.fixed").should("not.be.visible")
    })
  })
})
