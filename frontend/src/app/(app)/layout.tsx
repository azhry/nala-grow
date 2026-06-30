import { BottomTabNav } from "@/components/layout"
import { AuthGuard } from "@/components/auth"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <main className="min-h-dvh pb-nav md:pb-0">{children}</main>
      <BottomTabNav />
    </AuthGuard>
  )
}
