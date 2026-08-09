"use client"

import { useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { navigateToLogin } from "@/lib/auth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user)

  useEffect(() => {
    if (!user) {
      navigateToLogin()
    }
  }, [user])

  if (!user) {
    return null
  }

  return <>{children}</>
}
