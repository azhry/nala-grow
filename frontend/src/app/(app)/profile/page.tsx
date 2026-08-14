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
  const [profileError, setProfileError] = useState("")

  useEffect(() => {
    if (!hasHydrated) return
    let cancelled = false

    async function loadProfiles() {
      setProfileError("")
      setProfilesLoaded(false)
      try {
        const profiles = await fetchBabies()
        if (cancelled) return
        setBabies(profiles)
        setActiveBaby(profiles[0] ?? null)
        setProfilesLoaded(true)
      } catch {
        if (!cancelled) {
          setProfileError("We couldn’t load your profiles. Check your connection and try again.")
        }
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

  if (profileError) {
    return (
      <div className="min-h-dvh bg-surface">
        <AppHeader />
        <div className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center gap-4 px-container-margin text-center">
          <h1 className="font-headline-md text-headline-md text-on-surface">Profiles unavailable</h1>
          <p role="alert" className="max-w-md font-body-md text-body-md text-on-surface-variant">
            {profileError}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-11 rounded-full bg-primary px-5 py-3 font-label-md text-label-md text-on-primary shadow-md transition-colors hover:bg-on-primary-fixed-variant focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

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
