import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface BabyProfile {
  id: string
  name: string
  dob: string
  sex: "male" | "female" | "unspecified"
  photo_url?: string
}

interface AppState {
  user: { id: string; email: string } | null
  activeBaby: BabyProfile | null
  babies: BabyProfile[]
  _hasHydrated: boolean
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
      _hasHydrated: false,
      setUser: (user) => set({ user }),
      setActiveBaby: (baby) => set({ activeBaby: baby }),
      setBabies: (babies) => set({ babies }),
    }),
    {
      name: "nalagrow-store",
      onRehydrateStorage: () => (state) => {
        useAppStore.setState({ _hasHydrated: true })
      },
    }
  )
)
