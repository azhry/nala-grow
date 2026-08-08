import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const token = cookies().get("nalagrow-token")?.value
  if (token) {
    redirect("/dashboard")
  }

  return <div className="min-h-dvh bg-surface">{children}</div>
}
