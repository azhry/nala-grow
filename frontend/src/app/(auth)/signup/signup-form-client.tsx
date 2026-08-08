"use client"

import { useLayoutEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { OAuthButton, Spinner } from "@/components/ui"
import { signUpWithEmail, signInWithGoogle, ApiError } from "@/lib/auth"
import { useAppStore } from "@/lib/store"

export default function SignupFormClient() {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const hasHydrated = useAppStore((s) => s._hasHydrated)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useLayoutEffect(() => {
    if (hasHydrated && user) {
      router.replace("/dashboard")
    }
  }, [hasHydrated, user, router])

  if (!hasHydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (!agreed) {
      setError("Please accept the Terms of Service and Privacy Policy.")
      return
    }

    setLoading(true)
    try {
      await signUpWithEmail(email, password)
      router.push("/dashboard")
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Something went wrong. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-hidden md:flex-row">
      <div className="relative hidden bg-primary-fixed md:flex md:w-1/2 lg:w-3/5">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCsnByYGP_SjfsLSLtpO3aUqqkiABJAWCiNbu5on4YmAvkQzTxfe5e2UlU5ltqebcH0Ugb1y3PG9CpVaEO0CB97jvYSEnBA9KmLF89uRt1zq3Q04dT07BWOwDYdsP1WvpIYpIgZIyMuBRquZqVPjsT9axWIryjGD1BHc5vzeoAm7q9g5GVxxJHY93RAWJTSDdKrzwh853p2wMm24jlXf_7I7xSZZVEo8XpZwkChlFmFaMP0ljXpEgGAyY8XsvonT9SVoWRbOOjPM8U')",
          }}
        />
        <div className="z-10 absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-primary/40 to-transparent p-stack-lg">
          <div className="max-w-md">
            <h1 className="mb-base font-headline-lg text-headline-lg text-white">
              Nurture every step of the journey.
            </h1>
            <p className="font-body-lg text-body-lg text-white/90">
              Join NalaGrow to track milestones, monitor growth, and find calm
              in the everyday moments of parenting.
            </p>
          </div>
        </div>
        <div className="absolute left-12 top-12 z-20 flex items-center gap-base rounded-full border border-white/20 bg-surface-container-lowest/80 px-base py-2 backdrop-blur-md soft-shadow">
          <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          <span className="font-label-md text-label-md text-primary">
            Trusted by 10k+ Parents
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-surface px-container-margin py-stack-lg md:bg-surface-container-lowest">
        <div className="w-full max-w-sm">
          <div className="mb-stack-md flex justify-center md:hidden">
            <span className="font-headline-lg-mobile text-headline-lg-mobile text-primary">
              NalaGrow
            </span>
          </div>

          <div className="mb-stack-lg text-center md:text-left">
            <h2 className="mb-base font-headline-md text-headline-md text-on-surface">
              Create your account
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Start tracking your baby&apos;s progress today.
            </p>
          </div>

          <OAuthButton onClick={signInWithGoogle} className="mb-stack-md" />

          <div className="relative mb-stack-md flex items-center gap-base">
            <div className="flex-grow border-t border-outline-variant" />
            <span className="font-label-md text-label-md text-outline">
              OR EMAIL
            </span>
            <div className="flex-grow border-t border-outline-variant" />
          </div>

          <form className="space-y-stack-sm" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="ml-1 font-label-md text-label-md text-on-surface-variant"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="hello@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 w-full rounded-xl border-0 bg-surface-container-low px-4 font-body-md text-body-md text-on-surface outline-none transition-all placeholder:text-on-surface-variant placeholder:opacity-50 focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="password"
                className="ml-1 font-label-md text-label-md text-on-surface-variant"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 w-full rounded-xl border-0 bg-surface-container-low px-4 font-body-md text-body-md text-on-surface outline-none transition-all placeholder:text-on-surface-variant placeholder:opacity-50 focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-base">
              <input
                id="terms"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 rounded border-outline-variant bg-surface-container-high text-primary focus:ring-primary"
              />
              <label
                htmlFor="terms"
                className="font-body-sm text-body-sm text-on-surface-variant"
              >
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="font-medium text-primary underline underline-offset-2"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-primary underline underline-offset-2"
                >
                  Privacy Policy
                </Link>
                .
              </label>
            </div>

            {error && (
              <p className="ml-1 font-body-sm text-body-sm text-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="soft-shadow squishy-active mt-base flex h-14 w-full items-center justify-center rounded-xl bg-primary font-headline-sm text-headline-sm text-on-primary transition-all hover:bg-on-primary-container disabled:opacity-50"
            >
              {loading ? <Spinner size="sm" /> : "Create Account"}
            </button>
          </form>

          <div className="mt-stack-lg text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Already have an account?{" "}
              <Link
                href="/login"
                className="ml-1 font-bold text-primary underline-offset-4 hover:underline"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>

      <footer className="z-30 p-base md:fixed md:bottom-0 md:right-0 md:w-1/2 lg:w-2/5">
        <div className="flex w-full flex-row items-center justify-center gap-gutter px-container-margin py-stack-sm font-body-sm text-body-sm text-on-surface-variant md:justify-end">
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
    </div>
  )
}
