"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const tabs = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/growth", label: "Growth", icon: "monitoring" },
  { href: "/feeding", label: "Feeding", icon: "restaurant" },
  { href: "/sleep", label: "Sleep", icon: "bedtime" },
  { href: "/milestones", label: "Milestones", icon: "emoji_events" },
  { href: "/profile", label: "Profile", icon: "person" },
]

export function BottomTabNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 z-50 grid h-nav w-full grid-cols-6 items-center rounded-t-xl border-t border-primary/5 bg-surface px-1 pb-safe shadow-nav-soft md:hidden">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`min-w-0 flex flex-col items-center justify-center rounded-full px-1 py-1 transition-all duration-200 ${
              isActive
                ? "bg-primary-container text-on-primary-container"
                : "text-on-surface-variant active:bg-surface-container-highest"
            }`}
          >
            <span className={`material-symbols-outlined ${isActive ? "fill-1" : ""}`}>
              {tab.icon}
            </span>
            <span className="max-w-full truncate font-label-xs text-[10px] leading-tight">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
