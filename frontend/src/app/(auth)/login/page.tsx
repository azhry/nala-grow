import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AUTH_TOKEN_KEY } from "@/lib/auth-constants"
import LoginFormClient from "./login-form-client"

export default function LoginPage() {
  let token: string | undefined
  try {
    token = cookies().get(AUTH_TOKEN_KEY)?.value
  } catch {
    // cookies() is unavailable outside a request scope (e.g., tests)
  }
  if (token) {
    redirect("/dashboard")
  }

  return <LoginFormClient />
}
