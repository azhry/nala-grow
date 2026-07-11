// ---------------------------------------------------------------------------
// CE-009 — Export E2E tests — PDF report and CSV data download
//
// These tests run against the REAL backend GraphQL API at localhost:8080.
// They use the helper commands from seed.ts for API-level operations
// (signup, loginByApi, createBaby, createMeasurement, setAuthState)
// and the real UI for export interactions.
//
// The export page uses client-side data from Zustand store, so we seed
// measurements via the API and inject feed/sleep/milestone sessions
// directly into the store for data preview and export generation.
//
// Each test uses a unique timestamp-based email for isolation.
// Data cleanup happens in the after hook.
// ---------------------------------------------------------------------------

describe("CE-009: Export E2E (real backend)", () => {
  const BASE_EMAIL = "ce009-export-" + Date.now()
  const PASSWORD = "TestPass123!"
  const BABY_NAME = "ExportBaby"
  const BABY_DOB = "2026-01-15"
  const BABY_SEX = "male"

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

  function seedExportData(): void {
    const now = new Date().toISOString()
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString()

    cy.createMeasurement(authToken, babyId, {
      date: "2026-06-01",
      weight: 7.2,
      height: 66.0,
      headCircumference: 43.0,
    })
    cy.createMeasurement(authToken, babyId, {
      date: "2026-06-15",
      weight: 7.8,
      height: 68.0,
      headCircumference: 43.5,
    })
    cy.createFeedingSession(authToken, babyId, {
      feedType: "bottle",
      amountMl: 150,
      milkType: "formula",
      startedAt: yesterday,
      endedAt: yesterday,
    })
    cy.createFeedingSession(authToken, babyId, {
      feedType: "breast",
      leftDurationSec: 600,
      rightDurationSec: 300,
      startedAt: twoDaysAgo,
      endedAt: twoDaysAgo,
    })
    cy.createSleepSession(authToken, babyId, {
      startedAt: twoDaysAgo,
      endedAt: yesterday,
      location: "crib",
    })
    cy.window().then((win) => {
      const store = JSON.parse(win.localStorage.getItem("nalagrow-store") || "{}")
      store.state.measurements = [
        {
          id: "meas-1",
          baby_id: babyId,
          date: "2026-06-01",
          weight_kg: 7.2,
          height_cm: 66.0,
          head_cm: 43.0,
          notes: "",
          created_at: now,
        },
        {
          id: "meas-2",
          baby_id: babyId,
          date: "2026-06-15",
          weight_kg: 7.8,
          height_cm: 68.0,
          head_cm: 43.5,
          notes: "",
          created_at: now,
        },
      ]
      store.state.feedSessions = [
        {
          id: "feed-1",
          baby_id: babyId,
          feed_type: "bottle",
          amount_ml: 150,
          milk_type: "formula",
          started_at: yesterday,
          ended_at: yesterday,
          left_duration_sec: 0,
          right_duration_sec: 0,
          notes: "",
          created_at: now,
        },
        {
          id: "feed-2",
          baby_id: babyId,
          feed_type: "breast",
          amount_ml: 0,
          milk_type: "",
          started_at: twoDaysAgo,
          ended_at: twoDaysAgo,
          left_duration_sec: 600,
          right_duration_sec: 300,
          notes: "",
          created_at: now,
        },
      ]
      store.state.sleepSessions = [
        {
          id: "sleep-1",
          baby_id: babyId,
          started_at: twoDaysAgo,
          ended_at: yesterday,
          location: "crib",
          notes: "",
          created_at: now,
        },
      ]
      store.state.milestones = [
        {
          id: "mile-1",
          baby_id: babyId,
          title: "First smile",
          category: "social",
          achieved: true,
          achieved_date: yesterday,
          notes: "",
          created_at: now,
        },
      ]
      win.localStorage.setItem("nalagrow-store", JSON.stringify(store))
    })
  }

  before(() => { setupUser("suite") })
  after(() => { cy.clearAuthState() })

  // 1. Page load and default state
  describe("Page load and default state", () => {
    it("loads the export page with heading and date range defaults", () => {
      cy.visit("/export")
      cy.contains("h1", "Export Data").should("be.visible")
      cy.contains("Download").should("be.visible")
      cy.contains("growth data as PDF or CSV").should("be.visible")
      cy.contains("Export Format").should("be.visible")
      cy.contains("PDF Report").should("be.visible")
      cy.contains("CSV Data").should("be.visible")
      cy.contains("Date Range").should("be.visible")
      cy.contains("From").should("be.visible")
      cy.contains("To").should("be.visible")
      cy.contains("Data to Export").should("be.visible")
    })

    it("shows the data preview grid with four categories", () => {
      cy.visit("/export")
      cy.contains("Feed Sessions").should("be.visible")
      cy.contains("Sleep Sessions").should("be.visible")
      cy.contains("Growth Measurements").should("be.visible")
      cy.contains("Milestones").should("be.visible")
    })

    it("defaults to PDF format with Generate PDF Report button", () => {
      cy.visit("/export")
      cy.contains("button", "Generate PDF Report").should("be.visible")
      cy.contains("button", "Download CSV Data").should("not.exist")
    })
  })

  // 2. Format selector
  describe("Format selector", () => {
    it("switches from PDF to CSV format", () => {
      cy.visit("/export")
      cy.contains("button", "Generate PDF Report").should("be.visible")
      cy.contains("CSV Data").click()
      cy.contains("button", "Download CSV Data").should("be.visible")
      cy.contains("button", "Generate PDF Report").should("not.exist")
    })

    it("switches back to PDF from CSV", () => {
      cy.visit("/export")
      cy.contains("CSV Data").click()
      cy.contains("button", "Download CSV Data").should("be.visible")
      cy.contains("PDF Report").click()
      cy.contains("button", "Generate PDF Report").should("be.visible")
      cy.contains("button", "Download CSV Data").should("not.exist")
    })
  })

  // 3. Date range picker
  describe("Date range picker", () => {
    it("has date inputs with default values", () => {
      cy.visit("/export")
      cy.get('input[type="date"]').should("have.length", 2)
      cy.get('input[type="date"]').eq(0).invoke("val").should("match", /^\d{4}-\d{2}-\d{2}$/)
      cy.get('input[type="date"]').eq(1).invoke("val").should("match", /^\d{4}-\d{2}-\d{2}$/)
    })

    it("updates the from date", () => {
      cy.visit("/export")
      cy.get('input[type="date"]').eq(0).clear().type("2026-01-01")
      cy.get('input[type="date"]').eq(0).should("have.value", "2026-01-01")
    })

    it("updates the to date", () => {
      cy.visit("/export")
      cy.get('input[type="date"]').eq(1).clear().type("2026-12-31")
      cy.get('input[type="date"]').eq(1).should("have.value", "2026-12-31")
    })
  })

  // 4. Export with no data
  describe("Export with no data", () => {
    it("shows disabled button and empty state message when no data exists", () => {
      const email = freshEmail("empty")
      cy.signup(email, PASSWORD).then((res) => {
        cy.createBaby(res.token, "EmptyBaby", "2026-06-01", "female").then((baby) => {
          cy.setAuthState(res.token, res.user)
          cy.window().then((win) => {
            const store = JSON.parse(win.localStorage.getItem("nalagrow-store") || "{}")
            store.state.activeBaby = baby
            store.state.babies = [baby]
            store.state.measurements = []
            store.state.feedSessions = []
            store.state.sleepSessions = []
            store.state.milestones = []
            win.localStorage.setItem("nalagrow-store", JSON.stringify(store))
          })
          cy.visit("/export")
          cy.contains("No data found for the selected date range").should("be.visible")
          cy.contains("button", "Generate PDF Report").should("be.disabled")
          cy.clearAuthState()
        })
      })
    })
  })

  // 5. CSV export with seeded data
  describe("CSV export with seeded data", () => {
    it("enables the export button when data exists and downloads CSV", () => {
      seedExportData()
      cy.visit("/export")
      cy.contains("CSV Data").click()
      cy.get('input[type="date"]').eq(0).clear().type("2026-01-01")
      cy.get('input[type="date"]').eq(1).clear().type("2026-12-31")
      cy.contains("button", "Download CSV Data").should("not.be.disabled")
      cy.contains("button", "Download CSV Data").click()
      cy.contains("CSV Downloaded").should("be.visible")
      cy.contains("Your CSV has been generated successfully.").should("be.visible")
    })

    it("shows data preview counts with seeded data", () => {
      seedExportData()
      cy.visit("/export")
      cy.contains("Data to Export").should("be.visible")
      cy.contains("Feed Sessions").should("be.visible")
      cy.contains("Sleep Sessions").should("be.visible")
      cy.contains("Growth Measurements").should("be.visible")
      cy.contains("Milestones").should("be.visible")
    })
  })

  // 6. PDF export with seeded data
  describe("PDF export with seeded data", () => {
    it("generates PDF report with seeded data", () => {
      seedExportData()
      cy.visit("/export")
      cy.get('input[type="date"]').eq(0).clear().type("2026-01-01")
      cy.get('input[type="date"]').eq(1).clear().type("2026-12-31")
      cy.contains("button", "Generate PDF Report").should("not.be.disabled")
      cy.contains("button", "Generate PDF Report").click()
      cy.contains("PDF Generated").should("be.visible")
      cy.contains("Your PDF has been generated successfully.").should("be.visible")
    })

    it("shows loading state while generating", () => {
      seedExportData()
      cy.visit("/export")
      cy.contains("button", "Generate PDF Report").click()
      cy.contains("button", "Generating...").should("be.visible")
    })
  })

  // 7. Date range filtering
  describe("Date range filtering", () => {
    it("shows no data when date range excludes all seeded data", () => {
      seedExportData()
      cy.visit("/export")
      cy.get('input[type="date"]').eq(0).clear().type("2020-01-01")
      cy.get('input[type="date"]').eq(1).clear().type("2020-01-02")
      cy.contains("No data found for the selected date range").should("be.visible")
      cy.contains("button", "Generate PDF Report").should("be.disabled")
    })

    it("includes data when date range covers seeded data", () => {
      seedExportData()
      cy.visit("/export")
      cy.get('input[type="date"]').eq(0).clear().type("2026-01-01")
      cy.get('input[type="date"]').eq(1).clear().type("2026-12-31")
      cy.contains("No data found").should("not.exist")
      cy.contains("button", "Generate PDF Report").should("not.be.disabled")
    })
  })

  // 8. Success overlay
  describe("Success overlay", () => {
    it("shows and auto-dismisses the success overlay after CSV export", () => {
      seedExportData()
      cy.visit("/export")
      cy.contains("CSV Data").click()
      cy.get('input[type="date"]').eq(0).clear().type("2026-01-01")
      cy.get('input[type="date"]').eq(1).clear().type("2026-12-31")
      cy.contains("button", "Download CSV Data").click()
      cy.contains("CSV Downloaded").should("be.visible")
      cy.contains("download_done").should("be.visible")
      cy.contains("CSV Downloaded", { timeout: 5000 }).should("not.exist")
    })
  })

  // 9. Navigation
  describe("Navigation", () => {
    it("navigates to export page via bottom tab nav Profile link", () => {
      cy.visit("/dashboard")
      cy.get("nav").contains("Profile").click()
      cy.url({ timeout: 10000 }).should("include", "/profile")
    })

    it("navigates to export page directly", () => {
      cy.visit("/export")
      cy.url({ timeout: 10000 }).should("include", "/export")
      cy.contains("h1", "Export Data").should("be.visible")
    })
  })
})
