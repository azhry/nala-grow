"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"

export default function ProfileIndexPage() {
  const router = useRouter()
  const babies = useAppStore((s) => s.babies)
  const hasHydrated = useAppStore((s) => s._hasHydrated)

  useEffect(() => {
    if (!hasHydrated) return
    if (babies.length === 0) {
      router.replace("/profile/create")
    } else {
      router.replace("/profile/manage")
    }
  }, [hasHydrated, babies.length, router])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface">
      <span className="material-symbols-outlined animate-spin text-primary">
        progress_activity
      </span>
    </div>
  )
}
