"use client"

import { useState, useMemo } from "react"
import { FAB } from "@/components/ui"
import { useAppStore } from "@/lib/store"
import { useQuickLog } from "@/components/providers/quick-log-provider"
import { AppHeader } from "@/components/layout/app-header"

type DashboardSection = "feed" | "sleep" | "growth" | null

const quickActions = [
  { label: "Log Feed", icon: "restaurant", section: "feed" as DashboardSection, color: "primary" },
  { label: "Log Sleep", icon: "bedtime", section: "sleep" as DashboardSection, color: "surface" },
  { label: "Log Growth", icon: "monitoring", section: "growth" as DashboardSection, color: "surface" },
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

function getTodayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

export default function DashboardPage() {
  const activeBaby = useAppStore((s) => s.activeBaby)
  const feedSessions = useAppStore((s) => s.feedSessions)
  const sleepSessions = useAppStore((s) => s.sleepSessions)
  const measurements = useAppStore((s) => s.measurements)
  const [showAllActivities, setShowAllActivities] = useState(false)
  const [activeSection, setActiveSection] = useState<DashboardSection>(null)
  const { openLog } = useQuickLog()

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 17) return "Good afternoon"
    return "Good evening"
  })()

  const babyName = activeBaby?.name ?? "Maya"
  const babyId = activeBaby?.id ?? "sample"
  const todayKey = getTodayKey()

  const feedSummary = useMemo(() => {
    const todayFeeds = feedSessions
      .filter((f) => f.baby_id === babyId && f.started_at?.startsWith(todayKey))
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    const lastFeed = todayFeeds[0]
    const hoursSince = lastFeed ? (Date.now() - new Date(lastFeed.started_at).getTime()) / (1000 * 60 * 60) : null
    return {
      total: todayFeeds.length,
      lastFeedHours: hoursSince,
      lastFeedLabel: lastFeed ? `${hoursSince?.toFixed(1)}h ago` : "No feeds yet",
    }
  }, [feedSessions, babyId, todayKey])

  const sleepSummary = useMemo(() => {
    const todaySleep = sleepSessions
      .filter((s) => s.baby_id === babyId && s.started_at?.startsWith(todayKey))
    const completed = todaySleep.filter((s) => s.ended_at)
    const totalMinutes = completed.reduce((sum, s) => {
      const start = new Date(s.started_at).getTime()
      const end = new Date(s.ended_at ?? "").getTime()
      return sum + Math.max(0, (end - start) / 60000)
    }, 0)
    const longestStretch = completed.reduce((max, s) => {
      const duration = (new Date(s.ended_at ?? "").getTime() - new Date(s.started_at).getTime()) / 60000
      return Math.max(max, duration)
    }, 0)
    const activeSession = todaySleep.find((s) => !s.ended_at)
    return {
      totalHours: (totalMinutes / 60).toFixed(1),
      longestStretch: longestStretch > 0 ? `${longestStretch.toFixed(1)}h` : "—",
      activeLabel: activeSession ? "Currently sleeping" : "Awake",
    }
  }, [sleepSessions, babyId, todayKey])

  const growthSummary = useMemo(() => {
    const babyMeasurements = measurements
      .filter((m) => m.baby_id === babyId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const latest = babyMeasurements[0]
    return {
      weight: latest?.weight_kg != null ? `${latest.weight_kg.toFixed(1)} kg` : "—",
      height: latest?.height_cm != null ? `${latest.height_cm.toFixed(1)} cm` : "—",
      date: latest?.date ?? "No data",
    }
  }, [measurements, babyId])

  const handleQuickAction = (section: DashboardSection) => {
    setActiveSection((current) => (current === section ? null : section))
  }

  const renderExpandedContent = () => {
    if (!activeSection) return null
    if (activeSection === "sleep") {
      return (
        <div className="rounded-[24px] border border-primary/5 bg-surface-container-lowest p-stack-md soft-shadow">
          <div className="mb-stack-md flex items-center justify-between">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Sleep Summary</h3>
            <button type="button" onClick={() => setActiveSection(null)} className="text-body-sm font-bold text-primary hover:underline">Close</button>
          </div>
          <div className="grid grid-cols-1 gap-stack-md md:grid-cols-3">
            <div className="rounded-xl bg-surface-container-low p-stack-md text-center">
              <p className="font-label-md uppercase tracking-wider text-on-surface-variant">Total sleep today</p>
              <p className="font-headline-lg text-headline-lg text-primary">{sleepSummary.totalHours}h</p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-stack-md text-center">
              <p className="font-label-md uppercase tracking-wider text-on-surface-variant">Longest stretch</p>
              <p className="font-headline-lg text-headline-lg text-tertiary">{sleepSummary.longestStretch}</p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-stack-md text-center">
              <p className="font-label-md uppercase tracking-wider text-on-surface-variant">Status</p>
              <p className="font-headline-lg text-headline-lg text-on-surface">{sleepSummary.activeLabel}</p>
            </div>
          </div>
          <div className="mt-stack-md">
            <h4 className="font-headline-sm text-headline-sm text-on-surface mb-stack-sm">Recent sessions</h4>
            <div className="space-y-base">
              {sleepSessions
                .filter((s) => s.baby_id === babyId)
                .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
                .slice(0, 5)
                .map((session) => (
                  <div key={session.id} className="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-white p-stack-md">
                    <div>
                      <p className="font-body-md text-body-md font-medium text-on-surface">
                        {session.ended_at ? "Sleep session" : "Current sleep"}
                      </p>
                      <p className="text-body-sm text-on-surface-variant">
                        {new Date(session.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {session.ended_at
                          ? ` – ${new Date(session.ended_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : " • Started"}
                      </p>
                    </div>
                    <span className="font-label-md text-body-sm text-on-surface-variant">
                      {session.ended_at
                        ? `${((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000).toFixed(0)} min`
                        : "In progress"}
                    </span>
                  </div>
                ))}
              {sleepSessions.filter((s) => s.baby_id === babyId).length === 0 && (
                <p className="text-body-sm text-on-surface-variant">No sleep logged yet.</p>
              )}
            </div>
          </div>
        </div>
      )
    }
    if (activeSection === "growth") {
      const babyMeasurements = measurements
        .filter((m) => m.baby_id === babyId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      return (
        <div className="rounded-[24px] border border-primary/5 bg-surface-container-lowest p-stack-md soft-shadow">
          <div className="mb-stack-md flex items-center justify-between">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Growth Summary</h3>
            <button type="button" onClick={() => setActiveSection(null)} className="text-body-sm font-bold text-primary hover:underline">Close</button>
          </div>
          <div className="grid grid-cols-1 gap-stack-md md:grid-cols-3">
            <div className="rounded-xl bg-surface-container-low p-stack-md text-center">
              <p className="font-label-md uppercase tracking-wider text-on-surface-variant">Latest weight</p>
              <p className="font-headline-lg text-headline-lg text-primary">{growthSummary.weight}</p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-stack-md text-center">
              <p className="font-label-md uppercase tracking-wider text-on-surface-variant">Latest height</p>
              <p className="font-headline-lg text-headline-lg text-secondary">{growthSummary.height}</p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-stack-md text-center">
              <p className="font-label-md uppercase tracking-wider text-on-surface-variant">Last recorded</p>
              <p className="font-headline-lg text-headline-lg text-on-surface">{growthSummary.date}</p>
            </div>
          </div>
          <div className="mt-stack-md">
            <h4 className="font-headline-sm text-headline-sm text-on-surface mb-stack-sm">Recent measurements</h4>
            <div className="space-y-base">
              {babyMeasurements.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-white p-stack-md">
                  <div>
                    <p className="font-body-md text-body-md font-medium text-on-surface">
                      {m.weight_kg != null && `${m.weight_kg.toFixed(1)} kg`}
                      {m.height_cm != null && ` • ${m.height_cm.toFixed(1)} cm`}
                    </p>
                    <p className="text-body-sm text-on-surface-variant">{new Date(m.date).toLocaleDateString()}</p>
                  </div>
                  {m.notes && <span className="text-body-sm text-on-surface-variant">{m.notes}</span>}
                </div>
              ))}
              {babyMeasurements.length === 0 && (
                <p className="text-body-sm text-on-surface-variant">No measurements logged yet.</p>
              )}
            </div>
          </div>
        </div>
      )
    }
    return null
  }

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
              onClick={() => handleQuickAction(action.section)}
              className={[
                "flex items-center gap-base whitespace-nowrap rounded-full px-gutter py-stack-sm text-label-md font-label-md shadow-sm transition-all active:scale-95 hover:shadow-md",
                activeSection === action.section
                  ? "bg-primary text-on-primary"
                  : action.color === "primary"
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-highest text-primary border border-primary/20",
              ].join(" ")}
            >
              <span aria-hidden="true" className="material-symbols-outlined">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </section>

        {activeSection ? (
          renderExpandedContent()
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
            <div className="bento-card flex min-h-[160px] flex-col justify-between rounded-[24px] border border-primary/5 bg-surface-container-lowest p-stack-md soft-shadow">
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
                <p className="font-headline-md text-headline-md text-on-surface">{feedSummary.lastFeedLabel}</p>
                <p className="text-body-sm text-on-surface-variant">
                  Total today: <span className="font-bold text-primary">{feedSummary.total} feeds</span>
                </p>
              </div>
            </div>

            <div className="bento-card flex min-h-[160px] flex-col justify-between rounded-[24px] border border-primary/5 bg-surface-container-lowest p-stack-md soft-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tertiary-container/20 text-tertiary">
                <span className="material-symbols-outlined fill-1 text-[28px]">bedtime</span>
              </div>
              <div>
                <h3 className="mt-stack-sm font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">
                  Sleep
                </h3>
                <p className="font-headline-md text-headline-md text-on-surface">{sleepSummary.totalHours}h</p>
                <p className="text-body-sm text-on-surface-variant">
                  Longest stretch: <span className="font-bold text-tertiary">{sleepSummary.longestStretch}</span>
                </p>
              </div>
            </div>

            <div className="bento-card flex min-h-[160px] flex-col justify-between rounded-[24px] border border-primary/5 bg-surface-container-lowest p-stack-md soft-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-container/50 text-secondary">
                <span className="material-symbols-outlined fill-1 text-[28px]">monitoring</span>
              </div>
              <div>
                <h3 className="mt-stack-sm font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">
                  Growth
                </h3>
                <p className="font-headline-md text-headline-md text-on-surface">{growthSummary.weight}</p>
                <p className="text-body-sm text-on-surface-variant">
                  Height: <span className="font-bold text-secondary">{growthSummary.height}</span>
                </p>
              </div>
            </div>
          </section>
        )}

        {!activeSection && (
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
        )}
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
