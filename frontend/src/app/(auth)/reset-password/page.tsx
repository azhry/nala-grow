"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Spinner } from "@/components/ui"
import { resetPassword, updatePassword, ApiError } from "@/lib/auth"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await resetPassword(email)
      setSuccess(true)
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

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setLoading(true)
    try {
      await updatePassword(token!, newPassword)
      setSuccess(true)
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
    <div className="relative flex min-h-dvh flex-col items-center justify-center p-container-margin">
      <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden">
        <div className="organic-shape absolute -left-24 -top-24 h-96 w-96 animate-pulse bg-primary-container/20 blur-3xl" />
        <div className="organic-shape absolute -right-32 top-1/2 h-80 w-80 bg-tertiary-container/15 blur-3xl" />
        <div className="organic-shape absolute -bottom-20 left-1/3 h-64 w-64 bg-secondary-container/20 blur-3xl" />
      </div>

      <main className="z-10 w-full max-w-md">
        <div className="mb-stack-lg text-center">
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary tracking-tight md:font-headline-lg md:text-headline-lg">
            {token ? "Set New Password" : "Reset Password"}
          </h1>
          <p className="mt-base font-body-md text-body-md text-on-surface-variant">
            {token
              ? "Enter your new password below."
              : "We'll send you a link to reset your password."}
          </p>
        </div>

        <div className="glass-card soft-shadow rounded-[24px] border border-white/50 bg-surface-container-lowest p-8">
          {success ? (
            <div className="flex flex-col items-center gap-stack-md py-stack-md text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-container/30">
                <span className="material-symbols-outlined text-[36px] text-primary">
                  {token ? "check_circle" : "mail"}
                </span>
              </div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">
                {token ? "Password Updated" : "Check Your Email"}
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {token
                  ? "Your password has been updated. You can now log in."
                  : "We've sent a password reset link to your email."}
              </p>
              <Link
                href="/login"
                className="soft-shadow squishy-active mt-base flex h-14 w-full items-center justify-center rounded-xl bg-primary font-headline-sm text-headline-sm text-on-primary transition-all hover:bg-on-primary-fixed-variant"
              >
                Back to Login
              </Link>
            </div>
          ) : token ? (
            <form className="space-y-stack-md" onSubmit={handleUpdatePassword}>
              <div className="space-y-base">
                <label
                  htmlFor="new-password"
                  className="ml-1 block font-label-md text-label-md text-on-surface-variant"
                >
                  New Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                    lock
                  </span>
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-14 w-full rounded-xl border-none bg-surface-container-low pl-12 pr-12 font-body-md text-body-md text-on-surface outline-none transition-all placeholder:text-on-surface-variant placeholder:opacity-50 focus:ring-2 focus:ring-primary-container"
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
                className="soft-shadow squishy-active flex h-14 w-full items-center justify-center gap-base rounded-xl bg-primary font-headline-sm text-headline-sm text-on-primary transition-all hover:bg-on-primary-fixed-variant disabled:opacity-50"
              >
                {loading ? <Spinner size="sm" /> : "Update Password"}
              </button>
            </form>
          ) : (
            <form className="space-y-stack-md" onSubmit={handleRequestReset}>
              <div className="space-y-base">
                <label
                  htmlFor="reset-email"
                  className="ml-1 block font-label-md text-label-md text-on-surface-variant"
                >
                  Email Address
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                    mail
                  </span>
                  <input
                    id="reset-email"
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

              {error && (
                <p className="ml-1 font-body-sm text-body-sm text-error">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="soft-shadow squishy-active flex h-14 w-full items-center justify-center gap-base rounded-xl bg-primary font-headline-sm text-headline-sm text-on-primary transition-all hover:bg-on-primary-fixed-variant disabled:opacity-50"
              >
                {loading ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="mt-stack-md text-center font-body-sm text-body-sm text-on-surface-variant">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-bold text-primary transition-all hover:underline"
          >
            Back to login
          </Link>
        </p>
      </main>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-surface">
          <Spinner size="lg" className="text-primary" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
