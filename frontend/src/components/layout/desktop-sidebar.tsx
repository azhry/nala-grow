"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useQuickLog } from "@/components/providers/quick-log-provider"
import { useAppStore } from "@/lib/store"
import { calculateAge } from "@/lib/age"

interface NavItem {
  href: string
  label: string
  icon: string
}

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/growth", label: "Growth", icon: "monitoring" },
  { href: "/feeding", label: "Feeding", icon: "restaurant" },
  { href: "/sleep", label: "Sleep", icon: "bedtime" },
  { href: "/milestones", label: "Milestones", icon: "emoji_events" },
]

const secondaryNav: NavItem[] = [
  { href: "/settings", label: "Settings", icon: "settings" },
  { href: "/export", label: "Export Data", icon: "file_download" },
  { href: "/help", label: "Help & Support", icon: "help" },
]

function DesktopSidebar() {
  const pathname = usePathname()
  const { openLog } = useQuickLog()
  const activeBaby = useAppStore((state) => state.activeBaby)
  const displayedName = activeBaby?.name ?? "Add a profile"
  const displayedAge = activeBaby ? calculateAge(activeBaby.dob) : ""
  const displayedAvatar = activeBaby?.photo_url

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-surface-container-low md:flex">
      <div className="border-b border-outline-variant/30 px-gutter py-stack-md">
        <div className="flex items-center gap-3">
          {displayedAvatar ? (
            <div className="h-12 w-12 rounded-full overflow-hidden">
              <Image alt={`${displayedName}'s profile`} className="object-cover" fill src={displayedAvatar} />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container font-headline-sm text-headline-sm text-primary">
              {displayedName.slice(0, 1)}
            </div>
          )}
          <div><h3 className="font-headline-sm text-headline-sm text-on-surface">{displayedName}</h3><p className="font-body-sm text-body-sm text-on-surface-variant">{displayedAge}</p></div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6">
        {mainNav.map((item) => {
          const active = pathname?.startsWith(item.href)
          return <Link key={item.href} href={item.href} className={["flex items-center gap-3 rounded-full px-4 py-3 font-label-md text-label-md transition-all duration-150", active ? "bg-primary-container text-on-primary-container font-semibold" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"].join(" ")}><span className={`material-symbols-outlined text-[22px] ${active ? "fill-1" : ""}`}>{item.icon}</span>{item.label}</Link>
        })}
      </nav>

      <div className="border-t border-outline-variant/30 p-3">
        <button onClick={openLog} className="mb-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-label-md text-label-md text-on-primary shadow-soft transition-transform active:scale-[0.98]"><span className="material-symbols-outlined text-[20px]">add</span>Quick Log</button>
        {secondaryNav.map((item) => <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-full px-4 py-2.5 font-label-md text-label-md text-on-surface-variant transition-all duration-150 hover:bg-surface-container-high hover:text-on-surface"><span className="material-symbols-outlined text-[20px]">{item.icon}</span>{item.label}</Link>)}
      </div>
    </aside>
  )
}

export { DesktopSidebar }
