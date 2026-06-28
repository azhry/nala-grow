"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const tabs = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/feeding", label: "Feeding", icon: "restaurant" },
  { href: "/sleep", label: "Sleep", icon: "bedtime" },
  { href: "/milestones", label: "Milestones", icon: "emoji_events" },
  { href: "/profile", label: "Profile", icon: "person" },
]

export function BottomTabNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-safe h-nav md:hidden bg-surface shadow-nav-soft rounded-t-xl border-t border-primary/5">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center rounded-full px-4 py-1 transition-all duration-200 ${
              isActive
                ? "bg-primary-container text-on-primary-container"
                : "text-on-surface-variant active:bg-surface-container-highest"
            }`}
          >
            <span className={`material-symbols-outlined ${isActive ? "fill-1" : ""}`}>
              {tab.icon}
            </span>
            <span className="font-label-xs text-label-xs leading-tight">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
