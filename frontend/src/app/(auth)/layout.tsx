import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AUTH_TOKEN_KEY } from "@/lib/auth-constants"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const token = cookies().get(AUTH_TOKEN_KEY)?.value
  if (token) {
    redirect("/dashboard")
  }

  return <div className="min-h-dvh bg-surface">{children}</div>
}
