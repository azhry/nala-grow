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

interface AppState {
  user: { id: string; email: string } | null
  activeBaby: BabyProfile | null
  babies: BabyProfile[]
  measurements: Measurement[]
  unitSystem: UnitSystem
  feedSessions: FeedSession[]
  _hasHydrated: boolean
  setUser: (user: AppState["user"]) => void
  setActiveBaby: (baby: BabyProfile | null) => void
  setBabies: (babies: BabyProfile[]) => void
  addBaby: (baby: BabyProfile) => void
  updateBaby: (id: string, data: Partial<BabyProfile>) => void
  deleteBaby: (id: string) => void
  addMeasurement: (m: Measurement) => void
  updateMeasurement: (id: string, data: Partial<Measurement>) => void
  deleteMeasurement: (id: string) => void
  setUnitSystem: (unit: UnitSystem) => void
  addFeedSession: (session: FeedSession) => void
  updateFeedSession: (id: string, data: Partial<FeedSession>) => void
  deleteFeedSession: (id: string) => void
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
