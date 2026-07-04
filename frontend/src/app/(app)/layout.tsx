import { BottomTabNav, DesktopSidebar } from "@/components/layout"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <DesktopSidebar />
      <main className="min-h-dvh lg:ml-64 pb-nav md:pb-0">{children}</main>
      <BottomTabNav />
    </>
  )
}
