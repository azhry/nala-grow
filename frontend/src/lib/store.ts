import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface BabyProfile {
  id: string
  name: string
  dob: string
  sex: "male" | "female" | "unspecified"
  photo_url?: string
}

export interface Measurement {
  id: string
  baby_id: string
  date: string
  weight_kg?: number
  height_cm?: number
  head_cm?: number
  notes?: string
}

export type UnitSystem = "metric" | "imperial"

export type SleepLocation = "crib" | "bed" | "carrier" | "stroller" | "contact"

export interface SleepSession {
  id: string
  baby_id: string
  started_at: string
  ended_at?: string
  location?: SleepLocation
  notes?: string
}

export type FeedType = "breast" | "bottle" | "solids"
export type MilkType = "breast_milk" | "formula" | "water"
export type FeedTemperature = "cold" | "room" | "warm"
export type FeedReaction = "loved" | "interested" | "disliked" | "reaction"

export interface FeedSession {
  id: string
  baby_id: string
  feed_type: FeedType
  started_at: string
  ended_at?: string
  left_duration_sec?: number
  right_duration_sec?: number
  amount_ml?: number
  milk_type?: MilkType
  temperature?: FeedTemperature
  food_name?: string
  quantity?: number
  quantity_unit?: string
  reaction?: FeedReaction | string
  position?: "left" | "right" | "both"
  notes?: string
}

export type MilestoneCategory = "physical" | "cognitive" | "social" | "language"
export type MilestoneAgeRange = "0-3" | "3-6" | "6-12" | "12-24"

export interface MilestoneDefinition {
  id: string
  title: string
  category: MilestoneCategory
  age_range: MilestoneAgeRange
}

export interface Milestone {
  id: string
  baby_id: string
  definition_id?: string
  title: string
  category: MilestoneCategory
  age_range: MilestoneAgeRange
  achieved: boolean
  achieved_date?: string
  notes?: string
  photo_url?: string
  is_custom: boolean
}

export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  { id: "m-0-3-1", title: "Lifts head when on tummy", category: "physical", age_range: "0-3" },
  { id: "m-0-3-2", title: "Follows objects with eyes", category: "cognitive", age_range: "0-3" },
  { id: "m-0-3-3", title: "Responds to sound", category: "cognitive", age_range: "0-3" },
  { id: "m-0-3-4", title: "Makes cooing sounds", category: "language", age_range: "0-3" },
  { id: "m-0-3-5", title: "Smiles at people", category: "social", age_range: "0-3" },
  { id: "m-3-6-1", title: "Rolls over from tummy to back", category: "physical", age_range: "3-6" },
  { id: "m-3-6-2", title: "Reaches for objects", category: "physical", age_range: "3-6" },
  { id: "m-3-6-3", title: "Babbles and makes sounds", category: "language", age_range: "3-6" },
  { id: "m-3-6-4", title: "Recognizes familiar faces", category: "social", age_range: "3-6" },
  { id: "m-3-6-5", title: "Holds head steady", category: "physical", age_range: "3-6" },
  { id: "m-6-12-1", title: "Sits without support", category: "physical", age_range: "6-12" },
  { id: "m-6-12-2", title: "Crawls", category: "physical", age_range: "6-12" },
  { id: "m-6-12-3", title: "Says first words (mama/dada)", category: "language", age_range: "6-12" },
  { id: "m-6-12-4", title: "Waves goodbye", category: "social", age_range: "6-12" },
  { id: "m-6-12-5", title: "Picks up small objects with thumb and finger", category: "physical", age_range: "6-12" },
  { id: "m-12-24-1", title: "Walks independently", category: "physical", age_range: "12-24" },
  { id: "m-12-24-2", title: "Says several single words", category: "language", age_range: "12-24" },
  { id: "m-12-24-3", title: "Points to body parts", category: "cognitive", age_range: "12-24" },
  { id: "m-12-24-4", title: "Scribbles with crayon", category: "cognitive", age_range: "12-24" },
  { id: "m-12-24-5", title: "Drinks from a cup", category: "physical", age_range: "12-24" },
]

interface AppState {
  user: { id: string; email: string } | null
  activeBaby: BabyProfile | null
  babies: BabyProfile[]
  measurements: Measurement[]
  unitSystem: UnitSystem
  feedSessions: FeedSession[]
  sleepSessions: SleepSession[]
  milestones: Milestone[]
  _hasHydrated: boolean
  setUser: (user: AppState["user"]) => void
  setActiveBaby: (baby: BabyProfile | null) => void
  setBabies: (babies: BabyProfile[]) => void
  addBaby: (baby: BabyProfile) => void
  updateBaby: (id: string, data: Partial<BabyProfile>) => void
  deleteBaby: (id: string) => void
  setMeasurements: (measurements: Measurement[]) => void
  addMeasurement: (m: Measurement) => void
  updateMeasurement: (id: string, data: Partial<Measurement>) => void
  deleteMeasurement: (id: string) => void
  setUnitSystem: (unit: UnitSystem) => void
  setFeedSessions: (sessions: FeedSession[]) => void
  addFeedSession: (session: FeedSession) => void
  updateFeedSession: (id: string, data: Partial<FeedSession>) => void
  deleteFeedSession: (id: string) => void
  setSleepSessions: (sessions: SleepSession[]) => void
  addSleepSession: (session: SleepSession) => void
  updateSleepSession: (id: string, data: Partial<SleepSession>) => void
  deleteSleepSession: (id: string) => void
  setMilestones: (milestones: Milestone[]) => void
  addMilestone: (milestone: Milestone) => void
  updateMilestone: (id: string, data: Partial<Milestone>) => void
  deleteMilestone: (id: string) => void
  setHasHydrated: (v: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      activeBaby: null,
      babies: [],
      measurements: [],
      unitSystem: "metric",
      feedSessions: [],
      sleepSessions: [],
      milestones: [],
      _hasHydrated: false,
      setUser: (user) => set({ user }),
      setActiveBaby: (baby) => set({ activeBaby: baby }),
      setBabies: (babies) => set({ babies }),
      addBaby: (baby) =>
        set((state) => ({ babies: [...state.babies, baby] })),
      updateBaby: (id, data) =>
        set((state) => ({
          babies: state.babies.map((b) =>
            b.id === id ? { ...b, ...data } : b
          ),
          activeBaby:
            state.activeBaby?.id === id
              ? { ...state.activeBaby, ...data }
              : state.activeBaby,
        })),
      deleteBaby: (id) =>
        set((state) => ({
          babies: state.babies.filter((b) => b.id !== id),
          activeBaby:
            state.activeBaby?.id === id ? null : state.activeBaby,
        })),
      setMeasurements: (measurements) => set({ measurements }),
      addMeasurement: (m) =>
        set((state) => ({ measurements: [...state.measurements, m] })),
      updateMeasurement: (id, data) =>
        set((state) => ({
          measurements: state.measurements.map((m) =>
            m.id === id ? { ...m, ...data } : m
          ),
        })),
      deleteMeasurement: (id) =>
        set((state) => ({
          measurements: state.measurements.filter((m) => m.id !== id),
        })),
      setUnitSystem: (unit) => set({ unitSystem: unit }),
      setFeedSessions: (sessions) => set({ feedSessions: sessions }),
      addFeedSession: (session) =>
        set((state) => ({ feedSessions: [...state.feedSessions, session] })),
      updateFeedSession: (id, data) =>
        set((state) => ({
          feedSessions: state.feedSessions.map((s) =>
            s.id === id ? { ...s, ...data } : s
          ),
        })),
      deleteFeedSession: (id) =>
        set((state) => ({
          feedSessions: state.feedSessions.filter((s) => s.id !== id),
        })),
      setSleepSessions: (sessions) => set({ sleepSessions: sessions }),
      addSleepSession: (session) =>
        set((state) => ({ sleepSessions: [...state.sleepSessions, session] })),
      updateSleepSession: (id, data) =>
        set((state) => ({
          sleepSessions: state.sleepSessions.map((s) =>
            s.id === id ? { ...s, ...data } : s
          ),
        })),
      deleteSleepSession: (id) =>
        set((state) => ({
          sleepSessions: state.sleepSessions.filter((s) => s.id !== id),
        })),
      setMilestones: (milestones) => set({ milestones }),
      addMilestone: (milestone) =>
        set((state) => ({ milestones: [...state.milestones, milestone] })),
      updateMilestone: (id, data) =>
        set((state) => ({
          milestones: state.milestones.map((m) =>
            m.id === id ? { ...m, ...data } : m
          ),
        })),
      deleteMilestone: (id) =>
        set((state) => ({
          milestones: state.milestones.filter((m) => m.id !== id),
        })),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "nalagrow-store",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
