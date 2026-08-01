"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { fetchBabies } from "@/lib/baby-service"
import { useAppStore } from "@/lib/store"
import { AppHeader } from "@/components/layout/app-header"

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
    <div className="min-h-dvh bg-surface">
      <AppHeader />
      <div className="content-enter flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center gap-3 px-container-margin text-center">
        <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
        <h1 className="font-headline-md text-headline-md text-on-surface">Profiles</h1>
        <p role="status" className="font-body-sm text-body-sm text-on-surface-variant">Loading your profiles…</p>
      </div>
    </div>
  )
}
