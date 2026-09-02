import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AUTH_SESSION_EXPIRY_KEY, AUTH_TOKEN_KEY, hasValidSessionCookie } from "@/lib/auth-constants"
import SignupFormClient from "./signup-form-client"

export default function SignupPage() {
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

  return <SignupFormClient />
}
