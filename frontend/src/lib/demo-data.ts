import type { BabyProfile, FeedSession, Measurement, Milestone, SleepSession } from "@/lib/store"

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

function localDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function localDateDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return localDate(date)
}

export const DEMO_BABY: BabyProfile = {
  id: "demo-baby",
  name: "Lily",
  dob: localDateDaysAgo(130),
  sex: "female",
}

function todayAt(hour: number, minute = 0): string {
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? "+" : "-"
  const absoluteOffset = Math.abs(offsetMinutes)
  const offset = `${sign}${pad(Math.floor(absoluteOffset / 60))}:${pad(absoluteOffset % 60)}`
  return `${localDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:00${offset}`
}

export const DEMO_FEED_SESSIONS: FeedSession[] = [
  { id: "demo-feed-1", baby_id: DEMO_BABY.id, feed_type: "bottle", started_at: todayAt(7, 30), ended_at: todayAt(7, 45), amount_ml: 120, milk_type: "breast_milk" },
  { id: "demo-feed-2", baby_id: DEMO_BABY.id, feed_type: "breast", started_at: todayAt(11, 15), ended_at: todayAt(11, 35), left_duration_sec: 600, right_duration_sec: 540, position: "both" },
]

export const DEMO_SLEEP_SESSIONS: SleepSession[] = [
  { id: "demo-sleep-1", baby_id: DEMO_BABY.id, started_at: todayAt(0), ended_at: todayAt(6, 15), location: "crib" },
  { id: "demo-sleep-2", baby_id: DEMO_BABY.id, started_at: todayAt(9, 15), ended_at: todayAt(10, 30), location: "carrier" },
  { id: "demo-sleep-current", baby_id: DEMO_BABY.id, started_at: todayAt(12, 45), location: "crib" },
]

export const DEMO_MEASUREMENTS: Measurement[] = [
  { id: "demo-growth-1", baby_id: DEMO_BABY.id, date: localDateDaysAgo(130), weight_kg: 3.4, height_cm: 50, head_cm: 35, notes: "Birth measurements." },
  { id: "demo-growth-2", baby_id: DEMO_BABY.id, date: localDateDaysAgo(70), weight_kg: 5.1, height_cm: 58.2, head_cm: 39.5, notes: "Steady growth." },
  { id: "demo-growth-3", baby_id: DEMO_BABY.id, date: localDateDaysAgo(5), weight_kg: 6.4, height_cm: 63.5, head_cm: 41.2, notes: "Four-month checkup." },
]

export const DEMO_MILESTONES: Milestone[] = [
  { id: "demo-milestone-1", baby_id: DEMO_BABY.id, definition_id: "m-0-3-5", title: "First smile", category: "social", age_range: "0-3", achieved: true, achieved_date: localDateDaysAgo(80), notes: "A bright morning smile.", is_custom: false },
  { id: "demo-milestone-2", baby_id: DEMO_BABY.id, definition_id: "m-3-6-1", title: "Rolls over from tummy to back", category: "physical", age_range: "3-6", achieved: true, achieved_date: localDateDaysAgo(25), notes: "Rolled over during tummy time.", is_custom: false },
  { id: "demo-milestone-3", baby_id: DEMO_BABY.id, definition_id: "m-3-6-2", title: "Reaches for objects", category: "physical", age_range: "3-6", achieved: false, is_custom: false },
  { id: "demo-milestone-4", baby_id: DEMO_BABY.id, definition_id: "m-3-6-3", title: "Babbles and makes sounds", category: "language", age_range: "3-6", achieved: false, is_custom: false },
]

export function recordsForProfile<T extends { baby_id: string }>(
  activeBaby: BabyProfile | null,
  records: T[],
  demoRecords: T[],
  isLoggedIn: boolean,
): T[] {
  if (!activeBaby) {
    return isLoggedIn ? [] : demoRecords
  }
  return records.filter((record) => record.baby_id === activeBaby.id)
}
