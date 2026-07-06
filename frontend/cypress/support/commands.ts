Cypress.Commands.add("getBySel", (selector: string) => {
  return cy.get(`[data-testid="${selector}"]`)
})

Cypress.Commands.add("login", () => {
  cy.visit("/dashboard")
})

Cypress.Commands.add("selectBaby", (name: string) => {
  cy.getBySel("profile-switcher").click()
  cy.contains(name).click()
})

declare global {
  namespace Cypress {
    interface Chainable {
      getBySel(selector: string): Chainable<JQuery<HTMLElement>>
      login(): void
      selectBaby(name: string): void
    }
  }
}
