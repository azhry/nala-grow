import { DEMO_BABY, DEMO_FEED_SESSIONS, DEMO_MEASUREMENTS, DEMO_MILESTONES, DEMO_SLEEP_SESSIONS, recordsForProfile } from "@/lib/demo-data"

describe("demo data policy", () => {
  it("keeps every demo record attached to the centralized demo baby", () => {
    const allRecords = [...DEMO_FEED_SESSIONS, ...DEMO_SLEEP_SESSIONS, ...DEMO_MEASUREMENTS, ...DEMO_MILESTONES]
    expect(allRecords.every((record) => record.baby_id === DEMO_BABY.id)).toBe(true)
  })

  it("shows demo records only without an active profile", () => {
    const realBaby = { id: "real", name: "Nala", dob: "2025-01-01", sex: "female" as const }
    expect(recordsForProfile(null, [], DEMO_FEED_SESSIONS)).toBe(DEMO_FEED_SESSIONS)
    expect(recordsForProfile(realBaby, [], DEMO_FEED_SESSIONS)).toEqual([])
  })

  it("filters real records to the active profile", () => {
    const realBaby = { id: "real", name: "Nala", dob: "2025-01-01", sex: "female" as const }
    const records = DEMO_FEED_SESSIONS.concat({ ...DEMO_FEED_SESSIONS[0], id: "real-feed", baby_id: "real" })
    expect(recordsForProfile(realBaby, records, DEMO_FEED_SESSIONS).map((record) => record.id)).toEqual(["real-feed"])
  })
})
