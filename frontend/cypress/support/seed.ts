const GRAPHQL_URL = "http://localhost:8080/graphql"

function gql(query: string, variables?: Record<string, unknown>, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`
  return cy.request({
    method: "POST",
    url: GRAPHQL_URL,
    headers,
    body: { query, variables },
  })
}

Cypress.Commands.add("signup", (email: string, password: string) => {
  return gql(
    `mutation signup($email: String!, $password: String!) {
      signup(email: $email, password: $password) {
        token
        user { id email }
      }
    }`,
    { email, password },
  ).then((res) => res.body.data.signup as { token: string; user: { id: string; email: string } })
})

Cypress.Commands.add("loginByApi", (email: string, password: string) => {
  return gql(
    `mutation login($email: String!, $password: String!) {
      login(email: $email, password: $password) {
        token
        user { id email }
      }
    }`,
    { email, password },
  ).then((res) => res.body.data.login as { token: string; user: { id: string; email: string } })
})

Cypress.Commands.add("createBaby", (token: string, name: string, dob: string, sex: string) => {
  return gql(
    `mutation createBaby($name: String!, $dob: String, $sex: String) {
      createBaby(name: $name, dob: $dob, sex: $sex) {
        id name dob sex userId
      }
    }`,
    { name, dob, sex },
    token,
  ).then((res) => res.body.data.createBaby as { id: string; name: string; dob: string; sex: string; userId: string })
})

Cypress.Commands.add("createFeedingSession", (token: string, babyId: string, overrides?: Record<string, unknown>) => {
  const startedAt = new Date().toISOString()
  return gql(
    `mutation createFeedingSession($babyId: ID!, $feedType: String!, $startedAt: String, $endedAt: String, $amountMl: Float, $milkType: String) {
      createFeedingSession(babyId: $babyId, feedType: $feedType, startedAt: $startedAt, endedAt: $endedAt, amountMl: $amountMl, milkType: $milkType) {
        id feedType amountMl milkType
      }
    }`,
    { babyId, feedType: "bottle", startedAt, endedAt: startedAt, amountMl: 120, milkType: "breast_milk", ...overrides },
    token,
  ).then((res) => res.body.data.createFeedingSession as Record<string, unknown>)
})

Cypress.Commands.add("createSleepSession", (token: string, babyId: string, overrides?: Record<string, unknown>) => {
  const now = new Date()
  const startedAt = new Date(now.getTime() - 7200000).toISOString()
  const endedAt = now.toISOString()
  return gql(
    `mutation createSleepSession($babyId: ID!, $startedAt: String, $endedAt: String, $location: String) {
      createSleepSession(babyId: $babyId, startedAt: $startedAt, endedAt: $endedAt, location: $location) {
        id location
      }
    }`,
    { babyId, startedAt, endedAt, location: "crib", ...overrides },
    token,
  ).then((res) => res.body.data.createSleepSession as Record<string, unknown>)
})

Cypress.Commands.add("createMeasurement", (token: string, babyId: string, overrides?: Record<string, unknown>) => {
  return gql(
    `mutation createMeasurement($babyId: ID!, $date: String, $weight: Float, $height: Float, $headCircumference: Float) {
      createMeasurement(babyId: $babyId, date: $date, weight: $weight, height: $height, headCircumference: $headCircumference) {
        id weight height headCircumference
      }
    }`,
    { babyId, date: "2026-01-15", weight: 6.5, height: 62.0, headCircumference: 41.0, ...overrides },
    token,
  ).then((res) => res.body.data.createMeasurement as Record<string, unknown>)
})

Cypress.Commands.add("createMilestone", (token: string, babyId: string, overrides?: Record<string, unknown>) => {
  return gql(
    `mutation createMilestone($babyId: ID!, $title: String!, $category: String, $achievedAt: String) {
      createMilestone(babyId: $babyId, title: $title, category: $category, achievedAt: $achievedAt) {
        id title category achievedAt
      }
    }`,
    { babyId, title: "First smile", category: "social", achievedAt: new Date().toISOString(), ...overrides },
    token,
  ).then((res) => res.body.data.createMilestone as Record<string, unknown>)
})

Cypress.Commands.add("requestPasswordResetToken", (email: string) => {
  return gql(
    `mutation requestPasswordReset($email: String!) {
      requestPasswordReset(email: $email)
    }`,
    { email },
  ).then((res) => res.body.data.requestPasswordReset as string)
})

Cypress.Commands.add("resetPasswordByApi", (resetToken: string, newPassword: string) => {
  return gql(
    `mutation resetPassword($token: String!, $newPassword: String!) {
      resetPassword(token: $token, newPassword: $newPassword)
    }`,
    { token: resetToken, newPassword },
  ).then((res) => res.body.data.resetPassword as boolean)
})

Cypress.Commands.add("deleteBabyByApi", (token: string, babyId: string) => {
  return gql(`mutation deleteBaby($id: ID!) { deleteBaby(id: $id) { id } }`, { id: babyId }, token)
})

Cypress.Commands.add("setAuthState", (token: string, user: { id: string; email: string }) => {
  cy.window().then((win) => {
    win.localStorage.setItem("nalagrow-token", token)
    win.localStorage.setItem(
      "nalagrow-store",
      JSON.stringify({
        state: {
          token,
          user,
          activeBaby: null,
          babies: [],
          measurements: [],
          unitSystem: "metric",
          feedSessions: [],
          sleepSessions: [],
          milestones: [],
          _hasHydrated: true,
        },
        version: 0,
      }),
    )
  })
})

Cypress.Commands.add("clearAuthState", () => {
  cy.window().then((win) => {
    win.localStorage.removeItem("nalagrow-token")
    win.localStorage.removeItem("nalagrow-store")
  })
})

declare global {
  namespace Cypress {
    interface Chainable {
      signup(email: string, password: string): Chainable<{ token: string; user: { id: string; email: string } }>
      loginByApi(email: string, password: string): Chainable<{ token: string; user: { id: string; email: string } }>
      createBaby(token: string, name: string, dob: string, sex: string): Chainable<{ id: string; name: string; dob: string; sex: string; userId: string }>
      createFeedingSession(token: string, babyId: string, overrides?: Record<string, unknown>): Chainable<Record<string, unknown>>
      createSleepSession(token: string, babyId: string, overrides?: Record<string, unknown>): Chainable<Record<string, unknown>>
      createMeasurement(token: string, babyId: string, overrides?: Record<string, unknown>): Chainable<Record<string, unknown>>
      createMilestone(token: string, babyId: string, overrides?: Record<string, unknown>): Chainable<Record<string, unknown>>
      requestPasswordResetToken(email: string): Chainable<string>
      resetPasswordByApi(resetToken: string, newPassword: string): Chainable<boolean>
      deleteBabyByApi(token: string, babyId: string): Chainable<Response<unknown>>
      setAuthState(token: string, user: { id: string; email: string }): void
      clearAuthState(): void
    }
  }
}
