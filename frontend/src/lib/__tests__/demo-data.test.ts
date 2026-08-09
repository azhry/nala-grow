import { recordsForProfile, setCachedDemoData, getCachedDemoData, DEMO_BABY_ID } from "@/lib/demo-data"

describe("demo data policy", () => {
  beforeEach(() => {
    setCachedDemoData(null)
  })

  it("returns cached demo records when available and user is not logged in", () => {
    const cached = {
      baby: { id: DEMO_BABY_ID, name: "Lily", dob: "2025-04-01", sex: "female", photoUrl: "", createdAt: "", userId: "" },
      feedSessions: [{ id: "demo-feed-1", baby_id: DEMO_BABY_ID, feed_type: "bottle", started_at: "2026-08-04T07:30:00Z", ended_at: "2026-08-04T07:45:00Z", amount_ml: 120, milk_type: "breast_milk" }],
      sleepSessions: [],
      measurements: [],
      milestones: [],
    }
    setCachedDemoData(cached)
    expect(getCachedDemoData()).toBe(cached)
    expect(recordsForProfile(null, [], cached.feedSessions, false)).toBe(cached.feedSessions)
  })

  it("returns empty records when logged in without an active profile", () => {
    const realBaby = { id: "real", name: "Nala", dob: "2025-01-01", sex: "female" as const }
    expect(recordsForProfile(null, [], [], true)).toEqual([])
    expect(recordsForProfile(realBaby, [], [], true)).toEqual([])
  })

  it("filters real records to the active profile", () => {
    const realBaby = { id: "real", name: "Nala", dob: "2025-01-01", sex: "female" as const }
    const records = [{ id: "real-feed", baby_id: "real", started_at: "" }]
    expect(recordsForProfile(realBaby, records, [], false).map((record) => record.id)).toEqual(["real-feed"])
  })
})
