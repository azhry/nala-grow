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
  _hasHydrated: boolean
  setUser: (user: AppState["user"]) => void
  setActiveBaby: (baby: BabyProfile | null) => void
  setBabies: (babies: BabyProfile[]) => void
  addBaby: (baby: BabyProfile) => void
  updateBaby: (id: string, data: Partial<BabyProfile>) => void
  deleteBaby: (id: string) => void
  setHasHydrated: (v: boolean) => void
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
