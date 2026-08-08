import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import LoginFormClient from "./login-form-client"

export default function LoginPage() {
  let token: string | undefined
  try {
    token = cookies().get("nalagrow-token")?.value
  } catch {
    // cookies() is unavailable outside a request scope (e.g., tests)
  }
  if (token) {
    redirect("/dashboard")
  }

  return <LoginFormClient />
}
