"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { OAuthButton, Spinner } from "@/components/ui"
import { signInWithEmail, signInWithGoogle, ApiError } from "@/lib/auth"

const PROTECTED_REDIRECTS = [
  "/dashboard",
  "/feeding",
  "/sleep",
  "/milestones",
  "/profile",
]

function getSafeRedirect(redirect: string | null) {
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) {
    return "/dashboard"
  }

  const pathname = redirect.split(/[?#]/)[0]
  const isProtected = PROTECTED_REDIRECTS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )

  return isProtected ? redirect : "/dashboard"
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = getSafeRedirect(searchParams.get("redirect"))

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await signInWithEmail(email, password)
      router.push(redirectTo)
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
              "url('https://images.unsplash.com/photo-1519689680058-324335c77eba?w=1200&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent z-10 flex flex-col justify-end p-stack-lg">
          <div className="max-w-md">
            <h1 className="mb-base font-headline-lg text-headline-lg text-white">
              Welcome back to NalaGrow.
            </h1>
            <p className="font-body-lg text-body-lg text-white/90">
              Continue tracking milestones, monitoring growth, and finding calm
              in the everyday moments of parenting.
            </p>
          </div>
        </div>
        <div className="absolute left-12 top-12 z-20 flex items-center gap-base rounded-full border border-white/20 bg-surface-container-lowest/80 px-base py-2 backdrop-blur-md shadow-soft">
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
              Sign in to your account
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Welcome back to your parenting journey.
            </p>
          </div>

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
                  className="h-14 w-full rounded-xl border-0 bg-surface-container-low pl-12 pr-4 font-body-md text-body-md text-on-surface outline-none transition-all placeholder:text-on-surface-variant placeholder:opacity-50 focus:ring-2 focus:ring-primary"
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
                  className="h-14 w-full rounded-xl border-0 bg-surface-container-low pl-12 pr-12 font-body-md text-body-md text-on-surface outline-none transition-all placeholder:text-on-surface-variant placeholder:opacity-50 focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline transition-colors hover:text-primary"
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <p className="ml-1 font-body-sm text-body-sm text-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="soft-shadow squishy-active flex h-14 w-full items-center justify-center gap-base rounded-xl bg-primary font-headline-sm text-headline-sm text-on-primary transition-all hover:bg-on-primary-container disabled:opacity-50"
            >
              {loading ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <span>Login</span>
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </>
              )}
            </button>

            <div className="relative flex items-center py-base">
              <div className="flex-grow border-t border-outline-variant" />
              <span className="mx-4 font-label-md text-label-md italic text-outline">
                or continue with
              </span>
              <div className="flex-grow border-t border-outline-variant" />
            </div>

            <OAuthButton onClick={signInWithGoogle} />
          </form>

          <p className="mt-stack-lg text-center font-body-md text-body-md text-on-surface-variant">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="ml-1 font-bold text-primary underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>

      <footer className="z-30 p-base md:fixed md:bottom-0 md:right-0 md:w-1/2 lg:w-2/5">
        <div className="flex w-full flex-row items-center justify-center gap-gutter px-container-margin py-stack-sm font-body-sm text-body-sm text-on-surface-variant md:justify-end">
          <span>© 2024 NalaGrow</span>
          <div className="flex gap-base">
            <Link href="#" className="transition-colors hover:text-primary">
              Help
            </Link>
            <span className="text-outline-variant">•</span>
            <Link href="#" className="transition-colors hover:text-primary">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-surface">
          <Spinner size="lg" className="text-primary" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
