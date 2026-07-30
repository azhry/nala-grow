"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AppHeader } from "@/components/layout/app-header"
import { useQuickLog } from "@/components/providers/quick-log-provider"
import { FAB } from "@/components/ui"
import { calculateAge } from "@/lib/age"
import { type FeedSession, type Measurement, type SleepSession, useAppStore } from "@/lib/store"
import { getFeedingSessions, getMeasurements, getSleepSessions } from "@/lib/graphql-client"
import type { FeedingSession as GraphQLFeedingSession, Measurement as GraphQLMeasurement, SleepSession as GraphQLSleepSession } from "@/lib/graphql-types"

type DashboardSection = "feed" | "sleep" | "growth" | null
type Activity = { id: string; icon: string; label: string; detail: string; time: string; color: string; occurredAt: string }

const quickActions = [
  { label: "Log Feed", icon: "restaurant", section: "feed" as DashboardSection },
  { label: "Log Sleep", icon: "bedtime", section: "sleep" as DashboardSection },
  { label: "Log Growth", icon: "monitoring", section: "growth" as DashboardSection },
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

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function feedDetail(feed: FeedSession) {
  if (feed.feed_type === "breast") {
    const minutes = Math.round(((feed.left_duration_sec ?? 0) + (feed.right_duration_sec ?? 0)) / 60)
    return minutes ? `${minutes} min${feed.position ? ` • ${feed.position} side` : ""}` : "Breastfeed logged"
  }
  if (feed.feed_type === "bottle") return feed.amount_ml ? `${feed.amount_ml} ml bottle` : "Bottle feed"
  return feed.food_name ? `${feed.food_name}${feed.quantity ? ` • ${feed.quantity} ${feed.quantity_unit ?? ""}` : ""}` : "Solids logged"
}

function activityFromRecords(feeds: FeedSession[], sleeps: SleepSession[], measurements: Measurement[]): Activity[] {
  return [
    ...feeds.map((feed) => ({ id: `feed-${feed.id}`, icon: "restaurant", label: feed.feed_type === "solids" ? "Solids" : feed.feed_type === "bottle" ? "Bottle feed" : "Breastfeed", detail: feedDetail(feed), time: timeLabel(feed.started_at), color: "primary", occurredAt: feed.started_at })),
    ...sleeps.map((sleep) => ({ id: `sleep-${sleep.id}`, icon: "bedtime", label: sleep.ended_at ? "Sleep session" : "Sleep started", detail: sleep.ended_at ? `${Math.max(0, Math.round((new Date(sleep.ended_at).getTime() - new Date(sleep.started_at).getTime()) / 60000))} min${sleep.location ? ` • ${sleep.location}` : ""}` : "In progress", time: timeLabel(sleep.started_at), color: "tertiary", occurredAt: sleep.started_at })),
    ...measurements.map((measurement) => ({ id: `growth-${measurement.id}`, icon: "monitoring", label: "Growth recorded", detail: [measurement.weight_kg != null ? `${measurement.weight_kg.toFixed(1)} kg` : null, measurement.height_cm != null ? `${measurement.height_cm.toFixed(1)} cm` : null].filter(Boolean).join(" • ") || "Measurement logged", time: new Date(measurement.date).toLocaleDateString([], { month: "short", day: "numeric" }), color: "secondary", occurredAt: measurement.date })),
  ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
}

function getFeedStatus(hours: number | null) {
  if (hours === null) return { label: "No recent feed", tone: "bg-surface-container-high text-on-surface-variant" }
  if (hours <= 3) return { label: "On track", tone: "bg-primary-container/30 text-primary" }
  if (hours <= 4) return { label: "Feed soon", tone: "bg-tertiary-container/30 text-tertiary" }
  return { label: "Feed overdue", tone: "bg-error-container text-on-error-container" }
}

function toFeedSession(feed: GraphQLFeedingSession): FeedSession {
  return { id: feed.id, baby_id: feed.babyId, feed_type: feed.feedType as FeedSession["feed_type"], started_at: feed.startedAt, ended_at: feed.endedAt || undefined, left_duration_sec: feed.leftDurationSec || undefined, right_duration_sec: feed.rightDurationSec || undefined, amount_ml: feed.amountMl || undefined, milk_type: feed.milkType ? feed.milkType as FeedSession["milk_type"] : undefined, food_name: feed.foodName || undefined, reaction: feed.reaction || undefined, notes: feed.notes || undefined }
}

function toSleepSession(session: GraphQLSleepSession): SleepSession {
  return { id: session.id, baby_id: session.babyId, started_at: session.startedAt, ended_at: session.endedAt || undefined, location: session.location as SleepSession["location"], notes: session.notes || undefined }
}

function toMeasurement(measurement: GraphQLMeasurement): Measurement {
  return { id: measurement.id, baby_id: measurement.babyId, date: measurement.date, weight_kg: measurement.weight || undefined, height_cm: measurement.height || undefined, head_cm: measurement.headCircumference || undefined }
}

export default function DashboardPage() {
  const activeBaby = useAppStore((s) => s.activeBaby)
  const [feedSessions, setFeedSessions] = useState<FeedSession[]>([])
  const [sleepSessions, setSleepSessions] = useState<SleepSession[]>([])
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error" | "ready">("idle")
  const requestNumber = useRef(0)
  const [showAllActivities, setShowAllActivities] = useState(false)
  const [activeSection, setActiveSection] = useState<DashboardSection>(null)
  const { openLog } = useQuickLog()
  const todayKey = getTodayKey()
  const babyId = activeBaby?.id
  const babyName = activeBaby?.name
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening"

  const loadDashboard = useCallback(async () => {
    const request = ++requestNumber.current
    if (!babyId) {
      setFeedSessions([])
      setSleepSessions([])
      setMeasurements([])
      setLoadState("idle")
      return
    }
    setLoadState("loading")
    try {
      const [feeds, sleeps, growth] = await Promise.all([getFeedingSessions(babyId), getSleepSessions(babyId), getMeasurements(babyId)])
      if (request !== requestNumber.current) return
      setFeedSessions(feeds.map(toFeedSession))
      setSleepSessions(sleeps.map(toSleepSession))
      setMeasurements(growth.map(toMeasurement))
      setLoadState("ready")
    } catch {
      if (request !== requestNumber.current) return
      setLoadState("error")
    }
  }, [babyId])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const dashboard = useMemo(() => {
    const feeds = babyId ? feedSessions.filter((feed) => feed.baby_id === babyId) : []
    const sleeps = babyId ? sleepSessions.filter((sleep) => sleep.baby_id === babyId) : []
    const growth = babyId ? measurements.filter((measurement) => measurement.baby_id === babyId) : []
    const todayFeeds = feeds.filter((feed) => feed.started_at.startsWith(todayKey))
    const todaySleeps = sleeps.filter((sleep) => sleep.started_at.startsWith(todayKey))
    const completedSleeps = todaySleeps.filter((sleep) => sleep.ended_at)
    const totalMinutes = completedSleeps.reduce((total, sleep) => total + Math.max(0, (new Date(sleep.ended_at!).getTime() - new Date(sleep.started_at).getTime()) / 60000), 0)
    const longestMinutes = completedSleeps.reduce((longest, sleep) => Math.max(longest, (new Date(sleep.ended_at!).getTime() - new Date(sleep.started_at).getTime()) / 60000), 0)
    const latestFeed = [...feeds].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0]
    const lastFeedHours = latestFeed ? Math.max(0, (Date.now() - new Date(latestFeed.started_at).getTime()) / 3_600_000) : null
    const latestGrowth = [...growth].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    const todayActivities = activityFromRecords(todayFeeds, todaySleeps, growth.filter((measurement) => measurement.date.startsWith(todayKey)))
    return { feeds, sleeps, growth, todayFeeds, totalMinutes, longestMinutes, latestFeed, lastFeedHours, latestGrowth, activities: todayActivities }
  }, [babyId, feedSessions, sleepSessions, measurements, todayKey])

  const feedStatus = getFeedStatus(dashboard.lastFeedHours)
  const eventCount = dashboard.activities.length
  const summarySentence = babyName
    ? `${calculateAge(activeBaby!.dob)}. ${eventCount ? `You’ve logged ${eventCount} event${eventCount === 1 ? "" : "s"} today.` : "No events logged today yet."}`
    : "Choose a baby profile to see today’s care summary."
  const visibleActivities = showAllActivities ? dashboard.activities : dashboard.activities.slice(0, 3)

  const renderExpandedContent = () => {
    if (!activeSection) return null
    const title = activeSection === "feed" ? "Feed Summary" : activeSection === "sleep" ? "Sleep Summary" : "Growth Summary"
    const cards = activeSection === "feed"
      ? [["Last feed", dashboard.latestFeed ? `${dashboard.lastFeedHours!.toFixed(1)}h ago` : "No feeds yet", "text-primary"], ["Total today", `${dashboard.todayFeeds.length} feeds`, "text-on-surface"], ["Status", feedStatus.label, "text-on-surface"]]
      : activeSection === "sleep"
        ? [["Total sleep today", `${(dashboard.totalMinutes / 60).toFixed(1)}h`, "text-primary"], ["Longest stretch", dashboard.longestMinutes ? `${(dashboard.longestMinutes / 60).toFixed(1)}h` : "—", "text-tertiary"], ["Status", dashboard.sleeps.some((sleep) => !sleep.ended_at) ? "Currently sleeping" : "Awake", "text-on-surface"]]
        : [["Latest weight", dashboard.latestGrowth?.weight_kg != null ? `${dashboard.latestGrowth.weight_kg.toFixed(1)} kg` : "—", "text-primary"], ["Latest height", dashboard.latestGrowth?.height_cm != null ? `${dashboard.latestGrowth.height_cm.toFixed(1)} cm` : "—", "text-secondary"], ["Last recorded", dashboard.latestGrowth?.date ?? "No data", "text-on-surface"]]
    return <section aria-live="polite" className="motion-safe:animate-[dashboard-expand_220ms_ease-out] rounded-[24px] border border-primary/5 bg-surface-container-lowest p-stack-md soft-shadow">
      <div className="mb-stack-md flex items-center justify-between"><h3 className="font-headline-sm text-headline-sm text-on-surface">{title}</h3><button type="button" onClick={() => setActiveSection(null)} className="text-body-sm font-bold text-primary hover:underline">Close</button></div>
      <div className="grid grid-cols-1 gap-stack-md md:grid-cols-3">{cards.map(([label, value, color]) => <div key={label} className="rounded-xl bg-surface-container-low p-stack-md text-center"><p className="font-label-md uppercase tracking-wider text-on-surface-variant">{label}</p><p className={`font-headline-lg text-headline-lg ${color}`}>{value}</p></div>)}</div>
    </section>
  }

  return <div className="pb-stack-lg"><AppHeader /><div className="mx-auto max-w-6xl space-y-stack-md px-container-margin pt-16 md:px-stack-lg">
    <section className="py-stack-sm"><h2 className="font-headline-lg text-headline-lg text-on-surface">{greeting}{babyName ? `, ${babyName}!` : "!"}</h2><p className="font-body-lg text-body-lg text-on-surface-variant">{summarySentence}</p></section>
    {loadState === "loading" && <p role="status" className="rounded-2xl bg-surface-container-low p-gutter text-body-sm text-on-surface-variant">Loading dashboard records…</p>}
    {loadState === "error" && <div role="alert" className="flex items-center justify-between rounded-2xl bg-error-container p-gutter text-body-sm text-on-error-container"><span>Couldn&apos;t load dashboard records.</span><button type="button" onClick={() => void loadDashboard()} className="font-bold underline">Retry</button></div>}
    <section aria-label="Quick actions" className="relative"><div className="flex gap-stack-sm overflow-x-auto pb-2 pr-10 hide-scrollbar">{quickActions.map((action) => <button key={action.label} type="button" onClick={() => setActiveSection((current) => current === action.section ? null : action.section)} aria-pressed={activeSection === action.section} className={["flex items-center gap-base whitespace-nowrap rounded-full px-gutter py-stack-sm text-label-md font-label-md shadow-sm transition-all active:scale-95 hover:shadow-md", activeSection === action.section ? "bg-primary text-on-primary" : "border border-primary/20 bg-surface-container-highest text-primary"].join(" ")}><span aria-hidden="true" className="material-symbols-outlined">{action.icon}</span>{action.label}</button>)}</div><span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 flex items-center bg-gradient-to-l from-surface via-surface to-transparent pl-8 text-primary"><span className="material-symbols-outlined">arrow_forward</span></span><p className="text-body-sm text-on-surface-variant md:hidden">Swipe for more actions</p></section>
    {activeSection ? renderExpandedContent() : <><section className="grid grid-cols-1 gap-stack-md md:grid-cols-3">{[["restaurant", "Last Feed", dashboard.latestFeed ? `${dashboard.lastFeedHours!.toFixed(1)}h ago` : "No feeds yet", `Total today: ${dashboard.todayFeeds.length} feeds`, "primary"], ["bedtime", "Sleep", `${(dashboard.totalMinutes / 60).toFixed(1)}h`, `Longest stretch: ${dashboard.longestMinutes ? `${(dashboard.longestMinutes / 60).toFixed(1)}h` : "—"}`, "tertiary"], ["monitoring", "Growth", dashboard.latestGrowth?.weight_kg != null ? `${dashboard.latestGrowth.weight_kg.toFixed(1)} kg` : "—", `Height: ${dashboard.latestGrowth?.height_cm != null ? `${dashboard.latestGrowth.height_cm.toFixed(1)} cm` : "—"}`, "secondary"]].map(([icon, heading, value, detail, tone], index) => <div key={heading} className="bento-card flex min-h-[160px] flex-col justify-between rounded-[24px] border border-primary/5 bg-surface-container-lowest p-stack-md soft-shadow"><div className="flex items-start justify-between"><div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${colorMap[tone]}`}><span className="material-symbols-outlined fill-1 text-[28px]">{icon}</span></div>{index === 0 && <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${feedStatus.tone}`}>{feedStatus.label}</span>}</div><div><h3 className="mt-stack-sm font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">{heading}</h3><p className="font-headline-md text-headline-md text-on-surface">{value}</p><p className="text-body-sm text-on-surface-variant">{detail}</p></div></div>)}</section>
      <section className="grid grid-cols-1 gap-stack-md lg:grid-cols-3"><div className="rounded-[24px] border border-primary/5 bg-surface-container-lowest p-stack-md soft-shadow lg:col-span-2"><div className="mb-stack-md flex items-center justify-between"><h3 className="font-headline-sm text-headline-sm text-on-surface">Recent Activities</h3>{dashboard.activities.length > 3 && <button type="button" className="text-body-sm font-bold text-primary hover:underline" aria-expanded={showAllActivities} aria-controls="recent-activities" onClick={() => setShowAllActivities((shown) => !shown)}>{showAllActivities ? "Show Less" : "View All"}</button>}</div><div id="recent-activities" className="space-y-base">{visibleActivities.length ? visibleActivities.map((item) => <div key={item.id} className="flex items-center gap-gutter rounded-2xl bg-background/50 p-gutter"><div className={`flex h-10 w-10 items-center justify-center rounded-full ${colorMap[item.color]}`}><span className="material-symbols-outlined text-[20px]">{item.icon}</span></div><div className="flex-1"><p className="font-body-md text-body-md font-medium text-on-surface">{item.label}</p><p className="text-body-sm text-on-surface-variant">{item.detail}</p></div><span className="font-label-md text-body-sm text-on-surface-variant">{item.time}</span></div>) : <p className="rounded-2xl bg-background/50 p-gutter text-body-sm text-on-surface-variant">No activity logged for {babyName ?? "this profile"} today.</p>}</div></div><aside className="flex flex-col justify-between rounded-[24px] border border-primary/10 bg-primary-container/10 p-stack-md text-on-surface"><div><p className="font-label-md text-label-md uppercase tracking-widest text-primary">Daily insight</p><h3 className="mt-base font-headline-sm text-headline-sm">Today at a glance</h3><p className="mt-base font-body-md text-on-surface-variant">{eventCount ? `${eventCount} care event${eventCount === 1 ? "" : "s"} logged today. ${feedStatus.label.toLowerCase()}.` : "Log a feed, sleep, or growth update to begin today’s care timeline."}</p></div><div className="mt-stack-md border-t border-primary/10 pt-stack-md text-body-sm text-on-surface-variant"><span className="material-symbols-outlined mr-base text-primary">lightbulb</span>Every entry here comes from this baby’s care log.</div></aside></section></>}</div><div className="md:hidden"><FAB icon="add" aria-label="Open quick logging actions" onClick={openLog} /></div></div>
}
