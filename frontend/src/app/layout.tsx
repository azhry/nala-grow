import type { Metadata, Viewport } from "next"
import "./globals.css"
import { Providers } from "@/lib/providers"
import { designColors } from "@/lib/design-tokens"
import {
  PUBLIC_RUNTIME_CONFIG_KEYS,
  PUBLIC_RUNTIME_CONFIG_SCRIPT_ID,
  type PublicRuntimeConfig,
} from "@/lib/public-runtime-config"

export const dynamic = "force-dynamic"

function serializeRuntimeConfig(config: PublicRuntimeConfig): string {
  return JSON.stringify(config)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}

function getRuntimeConfig(): PublicRuntimeConfig {
  const config: PublicRuntimeConfig = {}
  for (const key of PUBLIC_RUNTIME_CONFIG_KEYS) {
    const value = process.env[key]
    if (typeof value === "string") config[key] = value
  }
  return config
}

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
        <script
          id={PUBLIC_RUNTIME_CONFIG_SCRIPT_ID}
          type="application/json"
          dangerouslySetInnerHTML={{ __html: serializeRuntimeConfig(getRuntimeConfig()) }}
        />
        <Providers>
          <div className="min-h-dvh bg-surface">{children}</div>
        </Providers>
      </body>
    </html>
  )
}
