"use client"

import { useState } from "react"
import { FAB } from "@/components/ui"
import { useAppStore } from "@/lib/store"
import { useQuickLog } from "@/components/providers/quick-log-provider"
import { AppHeader } from "@/components/layout/app-header"

const quickActions = [
  { label: "Log Feed", icon: "restaurant", target: "section-feed", color: "primary" },
  { label: "Log Sleep", icon: "bedtime", target: "section-sleep", color: "surface" },
  { label: "Log Growth", icon: "monitoring", target: "section-growth", color: "surface" },
] as const

const activities = [
  { icon: "restaurant", label: "Breastfeed", detail: "15 mins • Left side", time: "10:30 AM", color: "primary" },
  { icon: "bedtime", label: "Nap", detail: "1h 15m duration", time: "8:15 AM", color: "tertiary" },
  { icon: "baby_changing_station", label: "Diaper Change", detail: "Wet • No rash", time: "7:45 AM", color: "secondary" },
  { icon: "restaurant", label: "Breastfeed", detail: "12 mins • Right side", time: "6:30 AM", color: "primary" },
] as const

const colorMap: Record<string, string> = {
  primary: "bg-primary-container/20 text-primary",
  tertiary: "bg-tertiary-container/20 text-tertiary",
  secondary: "bg-secondary-container/50 text-secondary",
}

export default function DashboardPage() {
  const activeBaby = useAppStore((s) => s.activeBaby)
  const [showAllActivities, setShowAllActivities] = useState(false)
  const { openLog } = useQuickLog()

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 17) return "Good afternoon"
    return "Good evening"
  })()

  const babyName = activeBaby?.name ?? "Maya"

  return (
    <div className="pb-stack-lg">
      <AppHeader />
      <div className="px-container-margin md:px-stack-lg space-y-stack-md max-w-6xl mx-auto">
        <section className="py-stack-sm">
          <h2 className="font-headline-lg text-headline-lg text-on-surface">
            {greeting}, {babyName}!
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            {babyName} is 4 months. You&apos;ve logged 4 events today.
          </p>
        </section>

        <section className="flex gap-stack-sm overflow-x-auto pb-2 hide-scrollbar">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                const el = document.getElementById(action.target)
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
              }}
              className={[
                "flex items-center gap-base whitespace-nowrap rounded-full px-gutter py-stack-sm text-label-md font-label-md shadow-sm transition-all active:scale-95 hover:shadow-md",
                action.color === "primary"
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-highest text-primary border border-primary/20",
              ].join(" ")}
            >
              <span aria-hidden="true" className="material-symbols-outlined">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
          <div id="section-feed" className="bento-card flex min-h-[160px] flex-col justify-between rounded-[24px] border border-primary/5 bg-surface-container-lowest p-stack-md soft-shadow">
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-container/20 text-primary">
                <span className="material-symbols-outlined fill-1 text-[28px]">restaurant</span>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                Green Status
              </span>
            </div>
            <div>
              <h3 className="mt-stack-sm font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">
                Last Feed
              </h3>
              <p className="font-headline-md text-headline-md text-on-surface">2.5 hours ago</p>
              <p className="text-body-sm text-on-surface-variant">
                Total today: <span className="font-bold text-primary">8 feeds</span>
              </p>
            </div>
          </div>

          <div id="section-sleep" className="bento-card flex min-h-[160px] flex-col justify-between rounded-[24px] border border-primary/5 bg-surface-container-lowest p-stack-md soft-shadow">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tertiary-container/20 text-tertiary">
              <span className="material-symbols-outlined fill-1 text-[28px]">bedtime</span>
            </div>
            <div>
              <h3 className="mt-stack-sm font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">
                Sleep
              </h3>
              <p className="font-headline-md text-headline-md text-on-surface">14.5 hours</p>
              <p className="text-body-sm text-on-surface-variant">
                Longest stretch: <span className="font-bold text-tertiary">4.2h</span>
              </p>
            </div>
          </div>

          <div id="section-growth" className="bento-card flex min-h-[160px] flex-col justify-between rounded-[24px] border border-primary/5 bg-surface-container-lowest p-stack-md soft-shadow">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-container/50 text-secondary">
              <span className="material-symbols-outlined fill-1 text-[28px]">monitoring</span>
            </div>
            <div>
              <h3 className="mt-stack-sm font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">
                Growth
              </h3>
              <p className="font-headline-md text-headline-md text-on-surface">6.2 kg</p>
              <p className="text-body-sm text-on-surface-variant">
                Percentile: <span className="font-bold text-secondary">42nd</span>
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-stack-md">
          <div className="rounded-[24px] border border-primary/5 bg-surface-container-lowest p-stack-md soft-shadow lg:col-span-2">
            <div className="mb-stack-md flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                Recent Activities
              </h3>
              <button
                type="button"
                className="text-body-sm font-bold text-primary hover:underline"
                aria-expanded={showAllActivities}
                aria-controls="recent-activities"
                onClick={() => setShowAllActivities((isShowingAll) => !isShowingAll)}
              >
                {showAllActivities ? "Show Less" : "View All"}
              </button>
            </div>
            <div id="recent-activities" className="space-y-base">
              {(showAllActivities ? activities : activities.slice(0, 3)).map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-gutter rounded-2xl border border-transparent bg-background/50 p-gutter transition-colors hover:border-primary/10 hover:bg-primary-container/5"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${colorMap[item.color]}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-body-md text-body-md font-medium text-on-surface">
                      {item.label}
                    </p>
                    <p className="text-body-sm text-on-surface-variant">{item.detail}</p>
                  </div>
                  <span className="font-label-md text-body-sm text-on-surface-variant">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] bg-primary p-stack-md text-on-primary shadow-lg">
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

      <div className="md:hidden">
        <FAB
          icon="add"
          aria-label="Open quick logging actions"
          onClick={openLog}
        />
      </div>
    </div>
  )
}
