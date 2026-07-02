"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { getSessionToken } from "@/lib/auth"
import { Spinner } from "@/components/ui"

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const hasHydrated = useAppStore((s) => s._hasHydrated)

  useEffect(() => {
    if (!hasHydrated) return
    const token = getSessionToken()
    if (!token && !user) {
      router.replace("/login")
    }
  }, [hasHydrated, user, router])

  if (!hasHydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface">
        <Spinner size="lg" className="text-primary" />
      </div>
    )
  }

  const token = getSessionToken()
  if (!token && !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface">
        <Spinner size="lg" className="text-primary" />
      </div>
    )
  }

  return <>{children}</>
}
