import { BottomTabNav, DesktopSidebar } from "@/components/layout"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <DesktopSidebar />
      <main className="min-h-dvh pb-nav md:ml-64 md:pb-0">{children}</main>
      <BottomTabNav />
    </>
  )
}
