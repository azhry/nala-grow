describe("CE-011: Navigation E2E with Backend", () => {
  const TEST_EMAIL = `nav-backend-${Date.now()}@test.com`;
  const TEST_PASS = "TestPass123";
  const BABY_NAME = "Luna";
  const BABY_DOB = "2025-06-15";
  const BABY_SEX = "female";

  let authToken: string;
  let userId: string;
  let babyId: string;

  function setAuth() {
    cy.window().then((win) => {
      win.localStorage.setItem("nalagrow-token", authToken);
      win.localStorage.setItem(
        "nalagrow-store",
        JSON.stringify({
          state: {
            token: authToken,
            user: { id: userId, email: TEST_EMAIL },
            activeBaby: { id: babyId, name: BABY_NAME, dob: BABY_DOB, sex: BABY_SEX },
            babies: [{ id: babyId, name: BABY_NAME, dob: BABY_DOB, sex: BABY_SEX }],
            measurements: [],
            unitSystem: "metric",
            feedSessions: [],
            sleepSessions: [],
            milestones: [],
            _hasHydrated: true,
          },
          version: 0,
        }),
      );
    });
  }

  before(() => {
    cy.signup(TEST_EMAIL, TEST_PASS).then((res) => {
      authToken = res.token;
      userId = res.user.id;
      return cy.createBaby(authToken, BABY_NAME, BABY_DOB, BABY_SEX);
    }).then((baby) => {
      babyId = baby.id;
      cy.createFeedingSession(authToken, babyId, { feedType: "bottle", amountMl: 180 });
      cy.createSleepSession(authToken, babyId, { location: "crib" });
      cy.createMeasurement(authToken, babyId, { weight: 7.0, height: 64.0, headCircumference: 42.0 });
      cy.createMilestone(authToken, babyId, { title: "First smile", category: "social" });
    });
  });

  after(() => {
    if (babyId && authToken) {
      cy.deleteBabyByApi(authToken, babyId);
    }
    cy.clearAuthState();
  });

  describe("Login and reach dashboard", () => {
    it("logs in via UI and lands on dashboard with baby name", () => {
      cy.visit("/login");
      cy.get("#email").type(TEST_EMAIL);
      cy.get("#password").type(TEST_PASS);
      cy.contains("button", "Login").click();
      cy.url({ timeout: 10000 }).should("include", "/dashboard");
      cy.contains(BABY_NAME).should("be.visible");
    });
  });

  describe("Dashboard content with seeded data", () => {
    beforeEach(() => {
      setAuth();
      cy.visit("/dashboard");
    });

    it("shows time-based greeting with baby name", () => {
      const h = new Date().getHours();
      const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
      cy.contains("h2", new RegExp(`${greeting}.*${BABY_NAME}`)).should("be.visible");
    });

    it("shows summary cards for Last Feed, Sleep, Growth", () => {
      cy.contains("Last Feed").should("be.visible");
      cy.contains("Sleep").should("be.visible");
      cy.contains("Growth").should("be.visible");
    });

    it("shows quick action buttons", () => {
      cy.contains("Log Feed").should("be.visible");
      cy.contains("Log Sleep").should("be.visible");
      cy.contains("Log Growth").should("be.visible");
    });

    it("shows Recent Activities section", () => {
      cy.contains("Recent Activities").should("be.visible");
    });

    it("shows Daily Insight card", () => {
      cy.contains("Daily Insight").should("be.visible");
    });
  });

  describe("Navigation across all tabs", () => {
    beforeEach(() => {
      setAuth();
      cy.visit("/dashboard");
    });

    it("has all 6 bottom tab links", () => {
      const tabs = ["Home", "Growth", "Feeding", "Sleep", "Milestones", "Profile"];
      tabs.forEach((label) => {
        cy.get("nav").contains("a", label).should("exist");
      });
    });

    it("Home tab is active on dashboard", () => {
      cy.get("nav").contains("a", "Home").should("have.class", "bg-primary-container");
    });

    it("navigates to Growth page and back", () => {
      cy.get("nav").contains("a", "Growth").click();
      cy.url().should("include", "/growth");
      cy.contains("h1", /Growth Tracking/).should("be.visible");
      cy.get("nav").contains("a", "Home").click();
      cy.url().should("include", "/dashboard");
    });

    it("navigates to Feeding page and back", () => {
      cy.get("nav").contains("a", "Feeding").click();
      cy.url().should("include", "/feeding");
      cy.contains("h1", "Feeding Log").should("be.visible");
      cy.get("nav").contains("a", "Home").click();
      cy.url().should("include", "/dashboard");
    });

    it("navigates to Sleep page and back", () => {
      cy.get("nav").contains("a", "Sleep").click();
      cy.url().should("include", "/sleep");
      cy.contains("h1", "Sleep Tracking").should("be.visible");
      cy.get("nav").contains("a", "Home").click();
      cy.url().should("include", "/dashboard");
    });

    it("navigates to Milestones page and back", () => {
      cy.get("nav").contains("a", "Milestones").click();
      cy.url().should("include", "/milestones");
      cy.contains("h1", "Milestones").should("be.visible");
      cy.get("nav").contains("a", "Home").click();
      cy.url().should("include", "/dashboard");
    });

    it("navigates to Profile page", () => {
      cy.get("nav").contains("a", "Profile").click({ force: true });
      cy.url().should("match", /\/profile/);
    });

    it("only highlights the active tab at a time", () => {
      cy.get("nav").contains("a", "Home").should("have.class", "bg-primary-container");
      cy.get("nav").contains("a", "Growth").click();
      cy.url().should("include", "/growth");
      cy.get("nav").contains("a", "Growth").should("have.class", "bg-primary-container");
      cy.get("nav").contains("a", "Home").should("not.have.class", "bg-primary-container");
    });
  });

  describe("Feeding page content", () => {
    beforeEach(() => {
      setAuth();
      cy.visit("/feeding");
    });

    it("shows feed type tabs (Breast, Bottle, Solids)", () => {
      cy.contains("Breast").should("be.visible");
      cy.contains("Bottle").should("be.visible");
      cy.contains("Solids").should("be.visible");
    });

    it("shows Save Entry button", () => {
      cy.contains("button", "Save Entry").should("be.visible");
    });

    it("shows Record Feed section", () => {
      cy.contains("Record Feed").should("be.visible");
    });
  });

  describe("Sleep page content", () => {
    beforeEach(() => {
      setAuth();
      cy.visit("/sleep");
    });

    it("shows Timer and Manual tabs", () => {
      cy.contains("Timer").should("be.visible");
      cy.contains("Manual").should("be.visible");
    });

    it("shows Record Sleep section", () => {
      cy.contains("Record Sleep").should("be.visible");
    });

    it("shows location buttons in Timer mode", () => {
      cy.contains("crib").should("be.visible");
      cy.contains("bed").should("be.visible");
    });
  });

  describe("Growth page content", () => {
    beforeEach(() => {
      setAuth();
      cy.visit("/growth");
    });

    it("shows Current Stats section with Weight, Height, Head Circ.", () => {
      cy.contains("Current Stats").should("be.visible");
      cy.contains("Weight").should("be.visible");
      cy.contains("Height").should("be.visible");
      cy.contains("Head Circ.").should("be.visible");
    });

    it("shows New Measurement card", () => {
      cy.contains("New Measurement").should("be.visible");
    });

    it("shows Measurement History section", () => {
      cy.contains("Measurement History").should("be.visible");
    });
  });

  describe("Milestones page content", () => {
    beforeEach(() => {
      setAuth();
      cy.visit("/milestones");
    });

    it("shows Milestone Timeline section", () => {
      cy.contains("Milestone Timeline").should("be.visible");
    });

    it("shows Add Custom Milestone button", () => {
      cy.contains("Add Custom Milestone").should("be.visible");
    });
  });

  describe("Unauthenticated access redirects", () => {
    beforeEach(() => {
      cy.clearAuthState();
    });

    it("redirects /dashboard to login", () => {
      cy.visit("/dashboard");
      cy.url({ timeout: 10000 }).should("include", "/login");
    });

    it("redirects /feeding to login", () => {
      cy.visit("/feeding");
      cy.url({ timeout: 10000 }).should("include", "/login");
    });

    it("redirects /sleep to login", () => {
      cy.visit("/sleep");
      cy.url({ timeout: 10000 }).should("include", "/login");
    });

    it("redirects /growth to login", () => {
      cy.visit("/growth");
      cy.url({ timeout: 10000 }).should("include", "/login");
    });

    it("redirects /milestones to login", () => {
      cy.visit("/milestones");
      cy.url({ timeout: 10000 }).should("include", "/login");
    });
  });

  describe("Responsive layout", () => {
    beforeEach(() => {
      setAuth();
    });

    it("shows bottom tabs on mobile (390px)", () => {
      cy.viewport(390, 844);
      cy.visit("/dashboard");
      cy.get("nav").should("be.visible");
      cy.get("aside").should("not.be.visible");
    });

    it("shows sidebar on desktop (1280px)", () => {
      cy.viewport(1280, 900);
      cy.visit("/dashboard");
      cy.get("aside").should("be.visible");
    });

    it("shows sidebar on tablet (1024px)", () => {
      cy.viewport(1024, 768);
      cy.visit("/dashboard");
      cy.get("aside").should("be.visible");
    });
  });
});

