"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const tabs = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/feeding", label: "Feeding", icon: "restaurant" },
  { href: "/sleep", label: "Sleep", icon: "bedtime" },
  { href: "/milestones", label: "Milestones", icon: "celebration" },
  { href: "/profile", label: "Profile", icon: "person" },
]

export function BottomTabNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface-container-lowest border-t border-outline-variant safe-area-bottom">
      <div className="max-w-lg mx-auto flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] h-full ${
                isActive ? "text-primary" : "text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-2xl">
                {tab.icon}
              </span>
              <span className="text-label-md">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
