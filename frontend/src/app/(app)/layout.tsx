"use client"

import { QuickLogOverlay } from "@/components/layout/quick-log-overlay"
import { QuickLogProvider } from "@/components/providers/quick-log-provider"
import { BottomTabNav, DesktopSidebar } from "@/components/layout"
import { AuthGuard } from "@/components/layout/auth-guard"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <QuickLogProvider>
      <AuthGuard>
        <DesktopSidebar />
        <main className="min-h-dvh pb-nav md:ml-64 md:pb-0">{children}</main>
        <BottomTabNav />
        <QuickLogOverlay />
      </AuthGuard>
    </QuickLogProvider>
  )
}
