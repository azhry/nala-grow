import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AUTH_SESSION_EXPIRY_KEY, AUTH_TOKEN_KEY, hasValidSessionCookie } from "@/lib/auth-constants"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let token: string | undefined
  let expiresAt: string | undefined
  try {
    const cookieStore = cookies()
    token = cookieStore.get(AUTH_TOKEN_KEY)?.value
    expiresAt = cookieStore.get(AUTH_SESSION_EXPIRY_KEY)?.value
  } catch {
    // cookies() is unavailable outside a request scope (e.g., tests)
  }
  if (hasValidSessionCookie(token, expiresAt)) {
    redirect("/dashboard")
  }

  return <div className="min-h-dvh bg-surface">{children}</div>
}
