import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import SignupFormClient from "./signup-form-client"

export default function SignupPage() {
  let token: string | undefined
  try {
    token = cookies().get("nalagrow-token")?.value
  } catch {
    // cookies() is unavailable outside a request scope (e.g., tests)
  }
  if (token) {
    redirect("/dashboard")
  }

  return <SignupFormClient />
}
