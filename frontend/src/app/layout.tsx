import type { Metadata, Viewport } from "next"
import { Quicksand, Public_Sans } from "next/font/google"
import "./globals.css"
import { Providers } from "@/lib/providers"
import { BottomTabNav } from "@/components/layout/bottom-tab-nav"

const quicksand = Quicksand({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-quicksand",
})

const publicSans = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-public-sans",
})

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
  themeColor: "#2f6760",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className={`${quicksand.variable} ${publicSans.variable} font-public-sans`}>
        <Providers>
          <div className="flex flex-col min-h-dvh max-w-lg mx-auto bg-surface">
            <main className="flex-1 px-container-margin pt-4 pb-20 overflow-y-auto">
              {children}
            </main>
            <BottomTabNav />
          </div>
        </Providers>
      </body>
    </html>
  )
}
