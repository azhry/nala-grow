import { BottomTabNav, DesktopSidebar } from "@/components/layout"
import { AuthGuard } from "@/components/auth"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <DesktopSidebar />
      <main className="min-h-dvh lg:ml-64 pb-nav md:pb-0">{children}</main>
      <BottomTabNav />
    </AuthGuard>
  )
}
