"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Avatar } from "../ui/avatar"

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
  { href: "/export", label: "Export", icon: "file_download" },
]

interface DesktopSidebarProps {
  babyName?: string
  babyAge?: string
  babyAvatar?: string
}

function DesktopSidebar({
  babyName = "Nala",
  babyAge = "6 months",
  babyAvatar,
}: DesktopSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-surface-container-low rounded-r-xl z-30">
      <div className="flex flex-col items-center gap-2 pt-8 pb-6 px-4 border-b border-outline-variant/30">
        <Avatar src={babyAvatar} size="xl" fallback={babyName[0]} />
        <div className="text-center">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">{babyName}</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{babyAge}</p>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-1 p-3">
        {mainNav.map((item) => {
          const active = pathname?.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-150",
                "font-label-md text-label-md",
                active
                  ? "bg-primary-container/30 text-on-primary-container font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
              ].join(" ")}
            >
              <span
                className={`material-symbols-outlined text-[22px] ${active ? "fill-1" : ""}`}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-outline-variant/30 p-3">
        {secondaryNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-2.5 rounded-full font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all duration-150"
          >
            <span className="material-symbols-outlined text-[20px]">
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  )
}

export { DesktopSidebar }
export type { DesktopSidebarProps }
