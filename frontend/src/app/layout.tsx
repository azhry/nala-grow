import type { Metadata, Viewport } from "next"
import "./globals.css"
import { Providers } from "@/lib/providers"
import { BottomTabNav } from "@/components/layout/bottom-tab-nav"
import { designColors } from "@/lib/design-tokens"

export const metadata: Metadata = {
  title: "NalaGrow",
  description: "Baby growth tracker for parents",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "NalaGrow" },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: designColors.primary,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className="font-body-md text-body-md">
        <Providers>
          <div className="min-h-dvh bg-surface">
            <main className="min-h-dvh pb-nav md:pb-0">{children}</main>
            <BottomTabNav />
          </div>
        </Providers>
      </body>
    </html>
  )
}
