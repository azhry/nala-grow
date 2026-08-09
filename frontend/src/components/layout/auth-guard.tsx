"use client"

import { useEffect, useState } from "react"
import { useAppStore } from "@/lib/store"
import { getCurrentSession, navigateToLogin } from "@/lib/auth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user)
  const hasHydrated = useAppStore((s) => s._hasHydrated)
  const [sessionChecked, setSessionChecked] = useState(false)

  useEffect(() => {
    if (!hasHydrated) return

    if (user) {
      setSessionChecked(true)
      return
    }

    let cancelled = false
    setSessionChecked(false)
    void getCurrentSession().finally(() => {
      if (!cancelled) setSessionChecked(true)
    })

    return () => {
      cancelled = true
    }
  }, [hasHydrated, user])

  useEffect(() => {
    if (hasHydrated && sessionChecked && !user) {
      navigateToLogin()
    }
  }, [hasHydrated, sessionChecked, user])

  if (!hasHydrated || !sessionChecked || !user) {
    return null
  }

  return <>{children}</>
}
