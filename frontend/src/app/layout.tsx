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
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,0..200&display=block"
          />
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
