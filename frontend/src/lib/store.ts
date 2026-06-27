import { create } from "zustand"
import { persist } from "zustand/middleware"

interface BabyProfile {
  id: string
  name: string
  dob: string
  sex: "male" | "female"
  photo_url?: string
}

interface AppState {
  user: { id: string; email: string } | null
  activeBaby: BabyProfile | null
  babies: BabyProfile[]
  setUser: (user: AppState["user"]) => void
  setActiveBaby: (baby: BabyProfile | null) => void
  setBabies: (babies: BabyProfile[]) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      activeBaby: null,
      babies: [],
      setUser: (user) => set({ user }),
      setActiveBaby: (baby) => set({ activeBaby: baby }),
      setBabies: (babies) => set({ babies }),
    }),
    { name: "nalagrow-store" }
  )
)
