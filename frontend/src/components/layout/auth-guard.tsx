"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { getCurrentSession, navigateToLogin } from "@/lib/auth"
import { bootstrapProfiles } from "@/lib/profile-bootstrap"

type ProfileState = "idle" | "loading" | "ready" | "empty" | "error"

function ProfileLookupStatus({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-container-margin text-center">
      <div className="flex max-w-md flex-col items-center gap-3">
        <span aria-hidden="true" className="material-symbols-outlined animate-spin text-3xl text-primary">
          progress_activity
        </span>
        <p role="status" className="font-body-md text-body-md text-on-surface-variant">
          {message}
        </p>
      </div>
    </div>
  )
}

function ProfileLookupError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-container-margin text-center">
      <div className="flex max-w-md flex-col items-center gap-4">
        <span aria-hidden="true" className="material-symbols-outlined text-4xl text-error">
          cloud_off
        </span>
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">
            We couldn&apos;t load your profiles
          </h1>
          <p role="alert" className="mt-2 font-body-md text-body-md text-on-surface-variant">
            Check your connection and try again. Your account is still signed in.
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="flex min-h-11 items-center justify-center rounded-full bg-primary px-5 py-3 font-label-md text-label-md text-on-primary shadow-md transition-colors hover:bg-on-primary-fixed-variant focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const hasHydrated = useAppStore((s) => s._hasHydrated)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [sessionValid, setSessionValid] = useState<boolean | null>(null)
  const [profileState, setProfileState] = useState<ProfileState>("idle")
  const [profileLookupAttempt, setProfileLookupAttempt] = useState(0)

  useEffect(() => {
    if (!hasHydrated) return

    let cancelled = false
    setSessionChecked(false)
    setSessionValid(null)

    void getCurrentSession()
      .then((session) => {
        if (!cancelled) setSessionValid(session !== null)
      })
      .catch(() => {
        if (!cancelled) setSessionValid(false)
      })
      .finally(() => {
        if (!cancelled) setSessionChecked(true)
      })

    return () => {
      cancelled = true
    }
  }, [hasHydrated])

  useEffect(() => {
    if (
      !hasHydrated ||
      !sessionChecked ||
      sessionValid !== true ||
      !user ||
      pathname === "/profile/create"
    ) {
      return
    }

    let cancelled = false
    setProfileState("loading")

    void bootstrapProfiles()
      .then((profiles) => {
        if (!cancelled) {
          setProfileState(profiles.length === 0 ? "empty" : "ready")
        }
      })
      .catch(() => {
        if (!cancelled) setProfileState("error")
      })

    return () => {
      cancelled = true
    }
  }, [hasHydrated, pathname, profileLookupAttempt, sessionChecked, sessionValid, user])

  useEffect(() => {
    if (profileState === "empty" && pathname !== "/profile/create") {
      router.replace("/profile/create")
    }
  }, [pathname, profileState, router])

  useEffect(() => {
    if (
      hasHydrated &&
      sessionChecked &&
      (sessionValid === false || (sessionValid === true && !user))
    ) {
      navigateToLogin()
    }
  }, [hasHydrated, sessionChecked, sessionValid, user])

  if (!hasHydrated || !sessionChecked || sessionValid !== true || !user) {
    return null
  }

  if (pathname === "/profile/create") {
    return <>{children}</>
  }

  if (profileState === "error") {
    return (
      <ProfileLookupError
        onRetry={() => {
          setProfileState("idle")
          setProfileLookupAttempt((attempt) => attempt + 1)
        }}
      />
    )
  }

  if (profileState === "empty") {
    return <ProfileLookupStatus message="Let’s set up your first baby profile…" />
  }

  if (profileState !== "ready") {
    return <ProfileLookupStatus message="Checking for your baby profiles…" />
  }

  return <>{children}</>
}
