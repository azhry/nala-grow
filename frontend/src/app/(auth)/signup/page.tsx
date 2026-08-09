import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AUTH_TOKEN_KEY } from "@/lib/auth-constants"
import SignupFormClient from "./signup-form-client"

export default function SignupPage() {
  let token: string | undefined
  try {
    token = cookies().get(AUTH_TOKEN_KEY)?.value
  } catch {
    // cookies() is unavailable outside a request scope (e.g., tests)
  }
  if (token) {
    redirect("/dashboard")
  }

  return <SignupFormClient />
}
