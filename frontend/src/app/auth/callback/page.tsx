"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Spinner } from "@/components/ui"
import {
  ApiError,
  consumeCasdoorOAuthState,
  getCasdoorRedirectUri,
  signInWithCasdoor,
} from "@/lib/auth"
import { getPostAuthDestination, isProfileLookupError } from "@/lib/profile-bootstrap"

type CallbackState = "loading" | "error"

function CasdoorCallbackPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const started = useRef(false)
  const [state, setState] = useState<CallbackState>("loading")
  const [error, setError] = useState("")

  useEffect(() => {
    if (started.current) return
    started.current = true

    const providerError = searchParams.get("error")
    const code = searchParams.get("code")
    const oauthState = searchParams.get("state")

    if (providerError || !code || !oauthState) {
      setError("Google sign-in could not be completed. Please try again.")
      setState("error")
      return
    }

    const redirect = consumeCasdoorOAuthState(oauthState)
    if (!redirect) {
      setError("This Google sign-in link has expired. Please try again.")
      setState("error")
      return
    }

    void signInWithCasdoor(code, getCasdoorRedirectUri())
      .then(() => getPostAuthDestination(redirect))
      .then((destination) => {
        router.replace(destination)
      })
      .catch((reason: unknown) => {
        if (isProfileLookupError(reason)) {
          setError(reason.message)
        } else if (reason instanceof ApiError) {
          setError(reason.message)
        } else {
          setError("Google sign-in could not be completed. Please try again.")
        }
        setState("error")
      })
  }, [router, searchParams])

  if (state === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-surface px-container-margin">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <Spinner size="lg" className="text-primary" />
          <p role="status" className="font-body-md text-body-md text-on-surface-variant">
            Connecting your Google account…
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-surface p-container-margin">
      <div className="glass-card soft-shadow w-full max-w-md rounded-[24px] border border-white/50 bg-surface-container-lowest p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-container/30">
          <span className="material-symbols-outlined text-[36px] text-error" aria-hidden="true">
            error
          </span>
        </div>
        <h1 className="font-headline-md text-headline-md text-on-surface">
          Sign-in needs another try
        </h1>
        <p role="alert" className="mt-2 font-body-md text-body-md text-on-surface-variant">
          {error}
        </p>
        <Link
          href="/login"
          className="soft-shadow mt-6 flex h-14 w-full items-center justify-center rounded-xl bg-primary font-headline-sm text-headline-sm text-on-primary transition-all hover:bg-on-primary-fixed-variant"
        >
          Back to Login
        </Link>
      </div>
    </main>
  )
}

export default function CasdoorCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-surface px-container-margin">
          <div className="flex max-w-md flex-col items-center gap-4 text-center">
            <Spinner size="lg" className="text-primary" />
            <p role="status" className="font-body-md text-body-md text-on-surface-variant">
              Connecting your Google account…
            </p>
          </div>
        </main>
      }
    >
      <CasdoorCallbackPageContent />
    </Suspense>
  )
}
