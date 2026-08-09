"use client"

import { useLayoutEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { OAuthButton, Spinner } from "@/components/ui"
import { signInWithEmail, signInWithGoogle, ApiError } from "@/lib/auth"
import { useAppStore } from "@/lib/store"
import {
  getPostAuthDestination,
  getSafeRedirect,
  isProfileLookupError,
} from "@/lib/profile-bootstrap"

export default function LoginFormClient() {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const hasHydrated = useAppStore((s) => s._hasHydrated)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [authFlowActive, setAuthFlowActive] = useState(false)
  const [profileLookupRetry, setProfileLookupRetry] = useState(false)
  const [error, setError] = useState("")

  useLayoutEffect(() => {
    if (hasHydrated && user && !authFlowActive) {
      router.replace("/dashboard")
    }
  }, [authFlowActive, hasHydrated, user, router])

  if (!hasHydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    )
  }

  function getRedirect(): string {
    if (typeof window === "undefined") return "/dashboard"
    const params = new URLSearchParams(window.location.search)
    return params.get("redirect") ?? ""
  }

  async function completeAuth(redirect: string) {
    const destination = await getPostAuthDestination(redirect || null)
    router.push(destination)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setProfileLookupRetry(false)
    setAuthFlowActive(true)
    setLoading(true)
    try {
      await signInWithEmail(email, password)
      await completeAuth(getRedirect())
    } catch (err) {
      if (isProfileLookupError(err)) {
        setProfileLookupRetry(true)
        setError(err.message)
      } else {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleProfileLookupRetry() {
    setError("")
    setLoading(true)
    try {
      await completeAuth(getRedirect())
    } catch (err) {
      setError(isProfileLookupError(err) ? err.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setError("")
    setProfileLookupRetry(false)
    setAuthFlowActive(true)
    setGoogleLoading(true)
    try {
      const session = await signInWithGoogle()
      if (!session) {
        setAuthFlowActive(false)
        return
      }
      await completeAuth(getRedirect())
    } catch (err) {
      if (isProfileLookupError(err)) {
        setProfileLookupRetry(true)
        setError(err.message)
      } else {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.")
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center p-container-margin">
      <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden">
        <div className="organic-shape absolute -left-24 -top-24 h-96 w-96 animate-pulse bg-primary-container/20 blur-3xl" />
        <div className="organic-shape absolute -right-32 top-1/2 h-80 w-80 bg-tertiary-container/15 blur-3xl" />
        <div className="organic-shape absolute -bottom-20 left-1/3 h-64 w-64 bg-secondary-container/20 blur-3xl" />
      </div>

      <main className="z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-headline-lg-mobile text-headline-lg-mobile text-primary md:font-headline-lg md:text-headline-lg">
            Welcome back
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Welcome back to your parenting journey.
          </p>
        </div>

        <div className="glass-card soft-shadow rounded-[24px] border border-white/50 bg-surface-container-lowest p-8">
          <form className="space-y-stack-md" onSubmit={handleSubmit}>
            <div className="space-y-base">
              <label
                htmlFor="email"
                className="ml-1 block font-label-md text-label-md text-on-surface-variant"
              >
                Email Address
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                  mail
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="hello@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 w-full rounded-xl border-none bg-surface-container-low pl-12 pr-4 font-body-md text-body-md text-on-surface outline-none transition-all placeholder:text-on-surface-variant placeholder:opacity-50 focus:ring-2 focus:ring-primary-container"
                />
              </div>
            </div>

            <div className="space-y-base">
              <div className="ml-1 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block font-label-md text-label-md text-on-surface-variant"
                >
                  Password
                </label>
                <Link
                  href="/reset-password"
                  className="font-label-md text-label-md text-primary transition-all hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                  lock
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 w-full rounded-xl border-none bg-surface-container-low pl-12 pr-12 font-body-md text-body-md text-on-surface outline-none transition-all placeholder:text-on-surface-variant placeholder:opacity-50 focus:ring-2 focus:ring-primary-container"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="ml-1 font-body-sm text-body-sm text-error" data-testid="login-error">
                {error}
              </p>
            )}

            {profileLookupRetry && (
              <button
                type="button"
                onClick={handleProfileLookupRetry}
                disabled={loading}
                className="ml-1 font-label-md text-label-md text-primary underline underline-offset-2 disabled:opacity-50"
              >
                Retry profile lookup
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary font-headline-sm text-headline-sm text-on-primary shadow-md shadow-primary/20 transition-all hover:brightness-110 disabled:opacity-50"
            >
              {loading ? <Spinner size="sm" /> : <>{getSafeRedirect(getRedirect() || null) === "/dashboard" ? "Login" : "Continue"}</>}
              {!loading && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
            </button>
          </form>

          <div className="mt-stack-md space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-outline-variant/30" />
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                or continue with
              </span>
              <div className="h-px flex-1 bg-outline-variant/30" />
            </div>
            <OAuthButton onClick={handleGoogleSignIn} />
            {googleLoading && (
              <p role="status" className="text-center font-body-sm text-body-sm text-on-surface-variant">
                Connecting to Google…
              </p>
            )}
          </div>
        </div>

        <p className="mt-stack-md text-center font-body-md text-body-md text-on-surface-variant">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-primary transition-all hover:underline"
          >
            Create an account
          </Link>
        </p>

        <footer className="mt-stack-lg text-center">
          <div className="flex items-center justify-center gap-gutter px-container-margin py-stack-sm font-body-sm text-body-sm text-on-surface-variant">
            <span>© 2024 NalaGrow</span>
            <div className="flex gap-base">
              <Link href="/help" className="transition-colors hover:text-primary">
                Help
              </Link>
              <span className="text-outline-variant">•</span>
              <Link href="/privacy" className="transition-colors hover:text-primary">
                Privacy
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
