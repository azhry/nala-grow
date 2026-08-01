import { DEMO_BABY, DEMO_FEED_SESSIONS, DEMO_MEASUREMENTS, DEMO_MILESTONES, DEMO_SLEEP_SESSIONS, recordsForProfile } from "@/lib/demo-data"

describe("demo data policy", () => {
  it("keeps timed fixtures on today's local calendar date with an explicit parseable offset", () => {
    const now = new Date()
    const localToday = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-")
    const timestamps = [
      ...DEMO_FEED_SESSIONS.flatMap((session) => [session.started_at, session.ended_at]),
      ...DEMO_SLEEP_SESSIONS.flatMap((session) => [session.started_at, session.ended_at]),
    ].filter((value): value is string => Boolean(value))

    for (const timestamp of timestamps) {
      expect(timestamp.startsWith(localToday)).toBe(true)
      expect(timestamp).toMatch(/[+-]\d{2}:\d{2}$/)
      expect(Number.isNaN(new Date(timestamp).getTime())).toBe(false)
    }
  })

  it("keeps date-only fixtures as local YYYY-MM-DD values", () => {
    const dateOnlyValues = [DEMO_BABY.dob, ...DEMO_MEASUREMENTS.map((record) => record.date), ...DEMO_MILESTONES.map((record) => record.achieved_date).filter(Boolean)]
    expect(dateOnlyValues.every((value) => /^\d{4}-\d{2}-\d{2}$/.test(value!))).toBe(true)
  })

  it("keeps every demo record attached to the centralized demo baby", () => {
    const allRecords = [...DEMO_FEED_SESSIONS, ...DEMO_SLEEP_SESSIONS, ...DEMO_MEASUREMENTS, ...DEMO_MILESTONES]
    expect(allRecords.every((record) => record.baby_id === DEMO_BABY.id)).toBe(true)
  })

  it("shows demo records only without an active profile when not logged in", () => {
    const realBaby = { id: "real", name: "Nala", dob: "2025-01-01", sex: "female" as const }
    expect(recordsForProfile(null, [], DEMO_FEED_SESSIONS, false)).toBe(DEMO_FEED_SESSIONS)
    expect(recordsForProfile(realBaby, [], DEMO_FEED_SESSIONS, false)).toEqual([])
  })

  it("returns empty records when logged in without an active profile", () => {
    const realBaby = { id: "real", name: "Nala", dob: "2025-01-01", sex: "female" as const }
    expect(recordsForProfile(null, [], DEMO_FEED_SESSIONS, true)).toEqual([])
    expect(recordsForProfile(realBaby, [], DEMO_FEED_SESSIONS, true)).toEqual([])
  })

  it("filters real records to the active profile", () => {
    const realBaby = { id: "real", name: "Nala", dob: "2025-01-01", sex: "female" as const }
    const records = DEMO_FEED_SESSIONS.concat({ ...DEMO_FEED_SESSIONS[0], id: "real-feed", baby_id: "real" })
    expect(recordsForProfile(realBaby, records, DEMO_FEED_SESSIONS, false).map((record) => record.id)).toEqual(["real-feed"])
  })
})
