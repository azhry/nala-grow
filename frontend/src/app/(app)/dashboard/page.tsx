"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { FAB } from "@/components/ui"
import { useAppStore } from "@/lib/store"
import { SummaryCard } from "@/components/dashboard"
import { QuickLogOverlay } from "@/components/quick-log"
import { TimelineWidget } from "@/components/timeline"
import type { TimelineEntry } from "@/components/ui"

const quickActions = [
  { label: "Log Feed", icon: "restaurant", href: "/feeding/log", primary: true },
  { label: "Log Sleep", icon: "bedtime", href: "/sleep/log", primary: false },
  { label: "Log Growth", icon: "monitoring", href: "/growth/log", primary: false },
] as const

const activityEntries: TimelineEntry[] = [
  { id: "1", title: "Breastfeed", timestamp: "10:30 AM", duration: "15 mins", color: "primary", icon: "restaurant", tags: [{ label: "Left side", color: "neutral" as const }] },
  { id: "2", title: "Nap", timestamp: "8:15 AM", duration: "1h 15m", color: "tertiary", icon: "bedtime", tags: [{ label: "Duration", color: "neutral" as const }] },
  { id: "3", title: "Diaper Change", timestamp: "7:45 AM", color: "secondary", icon: "baby_changing_station", tags: [{ label: "Wet", color: "neutral" as const }, { label: "No rash", color: "neutral" as const }] },
  { id: "4", title: "Breastfeed", timestamp: "6:30 AM", duration: "12 mins", color: "primary", icon: "restaurant", tags: [{ label: "Right side", color: "neutral" as const }] },
]

export default function DashboardPage() {
  const activeBaby = useAppStore((s) => s.activeBaby)
  const [fabOpen, setFabOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [touchStart, setTouchStart] = useState(0)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 17) return "Good afternoon"
    return "Good evening"
  })()

  const babyName = activeBaby?.name ?? "Maya"
  const babyAge = activeBaby?.dob
    ? (() => {
        const diff = Date.now() - new Date(activeBaby.dob).getTime()
        const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44))
        return `${months} months`
      })()
    : "4 months"

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1200)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY)
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const delta = e.touches[0].clientY - touchStart
      if (delta > 100 && !refreshing && window.scrollY === 0) {
        handleRefresh()
      }
    },
    [touchStart, refreshing, handleRefresh],
  )

  return (
    <div
      className="pb-stack-lg"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <div className="space-y-stack-md px-container-margin md:px-stack-lg max-w-6xl mx-auto">
        <section className="py-stack-sm">
          <h2 className="font-headline-lg text-headline-lg text-on-surface">
            {greeting}, {babyName}!
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            {babyName} is {babyAge}. You&apos;ve logged 4 events today.
          </p>
        </section>

        <section className="flex gap-stack-sm overflow-x-auto pb-2 hide-scrollbar">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={[
                "flex items-center gap-base whitespace-nowrap rounded-full px-gutter py-stack-sm text-label-md font-label-md shadow-sm transition-all active:scale-95 hover:shadow-md",
                action.primary
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-highest text-primary border border-primary/20",
              ].join(" ")}
            >
              <span className="material-symbols-outlined">{action.icon}</span>
              {action.label}
            </Link>
          ))}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
          <SummaryCard
            icon="restaurant"
            iconBgColor="primary"
            label="Last Feed"
            value="2.5 hours ago"
            badge="Green Status"
          >
            Total today: <span className="font-bold text-primary">8 feeds</span>
          </SummaryCard>

          <SummaryCard
            icon="bedtime"
            iconBgColor="tertiary"
            label="Sleep"
            value="14.5 hours"
          >
            Longest stretch: <span className="font-bold text-tertiary">4.2h</span>
          </SummaryCard>

          <SummaryCard
            icon="monitoring"
            iconBgColor="secondary"
            label="Growth"
            value="6.2 kg"
          >
            Percentile: <span className="font-bold text-secondary">42nd</span>
          </SummaryCard>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-stack-md">
          <div className="lg:col-span-2">
            <TimelineWidget
              entries={activityEntries}
              onViewAll={() => {}}
            />
          </div>

          <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-primary p-stack-md text-on-primary shadow-lg">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl transition-transform group-hover:scale-110" />
            <div>
              <h3 className="font-headline-sm text-headline-sm mb-base">Daily Insight</h3>
              <p className="font-body-md opacity-90">
                {babyName} slept 20% more than her weekly average yesterday. This might be due to her
                recent growth spurt.
              </p>
            </div>
            <div className="mt-stack-md border-t border-white/20 pt-stack-md">
              <div className="flex items-center gap-base">
                <span className="material-symbols-outlined">lightbulb</span>
                <span className="text-body-sm font-medium italic">
                  &ldquo;Consistency is key for nap transitions.&rdquo;
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <FAB
        icon={refreshing ? "sync" : "add"}
        onClick={() => { if (!refreshing) setFabOpen(true) }}
        className={refreshing ? "animate-spin" : "md:hidden"}
      />

      <QuickLogOverlay open={fabOpen} onClose={() => setFabOpen(false)} />

      {refreshing && (
        <div className="fixed inset-x-0 top-0 z-50 flex justify-center pt-4">
          <div className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-on-primary shadow-lg">
            <span className="material-symbols-outlined animate-spin">sync</span>
            <span className="text-body-sm font-bold">Refreshing...</span>
          </div>
        </div>
      )}
    </div>
  )
}
