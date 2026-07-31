"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { fetchBabies } from "@/lib/baby-service"
import { useAppStore } from "@/lib/store"

export default function ProfileIndexPage() {
  const router = useRouter()
  const babies = useAppStore((s) => s.babies)
  const setBabies = useAppStore((s) => s.setBabies)
  const setActiveBaby = useAppStore((s) => s.setActiveBaby)
  const hasHydrated = useAppStore((s) => s._hasHydrated)
  const [profilesLoaded, setProfilesLoaded] = useState(false)

  useEffect(() => {
    if (!hasHydrated) return
    let cancelled = false

    async function loadProfiles() {
      try {
        const profiles = await fetchBabies()
        if (cancelled) return
        setBabies(profiles)
        if (profiles.length > 0) setActiveBaby(profiles[0])
      } finally {
        if (!cancelled) setProfilesLoaded(true)
      }
    }

    void loadProfiles()
    return () => {
      cancelled = true
    }
  }, [hasHydrated, setActiveBaby, setBabies])

  useEffect(() => {
    if (!hasHydrated || !profilesLoaded) return
    if (babies.length === 0) {
      router.replace("/profile/create")
    } else {
      router.replace("/profile/manage")
    }
  }, [hasHydrated, profilesLoaded, babies.length, router])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface">
      <span className="material-symbols-outlined animate-spin text-primary">
        progress_activity
      </span>
    </div>
  )
}
