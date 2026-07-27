"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAppStore } from "@/lib/store"
import type { SleepLocation, SleepSession } from "@/lib/store"
import {
  createSleepSession,
  fetchSleepSessions,
  updateSleepSession as updateSleepSessionApi,
} from "@/lib/sleep-service"
import { AppHeader } from "@/components/layout/app-header"

const locations: SleepLocation[] = ["crib", "bed", "carrier", "stroller", "contact"]

const demoSessions: SleepSession[] = [
  {
    id: "demo-night-sleep",
    baby_id: "demo",
    started_at: new Date(new Date().setHours(0, 0, 0, 0) - 210 * 60000).toISOString(),
    ended_at: new Date(new Date().setHours(6, 15, 0, 0)).toISOString(),
    location: "crib",
  },
  {
    id: "demo-morning-nap",
    baby_id: "demo",
    started_at: new Date(new Date().setHours(9, 15, 0, 0)).toISOString(),
    ended_at: new Date(new Date().setHours(10, 30, 0, 0)).toISOString(),
    location: "carrier",
  },
  {
    id: "demo-current-nap",
    baby_id: "demo",
    started_at: new Date(new Date().setHours(12, 45, 0, 0)).toISOString(),
    location: "crib",
  },
]

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.max(0, Math.round(minutes))}m`
  return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`
}

function formatHours(minutes: number): string {
  return (minutes / 60).toFixed(1)
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function sessionMinutes(session: SleepSession): number {
  const end = session.ended_at ? new Date(session.ended_at).getTime() : Date.now()
  return Math.max(0, Math.round((end - new Date(session.started_at).getTime()) / 60000))
}

function timeInputValue(date: Date): string {
  return date.toTimeString().slice(0, 5)
}

function locationLabel(location?: SleepLocation): string {
  return location ?? "crib"
}

export default function SleepPage() {
  const activeBaby = useAppStore((state) => state.activeBaby)
  const sleepSessions = useAppStore((state) => state.sleepSessions)
  const addSleepSession = useAppStore((state) => state.addSleepSession)
  const updateSleepSession = useAppStore((state) => state.updateSleepSession)
  const setSleepSessions = useAppStore((state) => state.setSleepSessions)
  const babyId = activeBaby?.id ?? "sample"
  const babyName = activeBaby?.name ?? "Nala"

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isManualModalOpen, setManualModalOpen] = useState(false)
  const [timelineView, setTimelineView] = useState<"day" | "week">("day")
  const [demoSessionRunning, setDemoSessionRunning] = useState(true)
  const [manualStart, setManualStart] = useState(() => timeInputValue(new Date(Date.now() - 3600000)))
  const [manualEnd, setManualEnd] = useState(() => timeInputValue(new Date()))
  const [manualLocation, setManualLocation] = useState<SleepLocation>("crib")
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null)

  useEffect(() => {
    if (activeBaby?.id) fetchSleepSessions(activeBaby.id).catch(() => {})
  }, [activeBaby?.id, setSleepSessions])

  useEffect(() => {
    if (!activeSessionId || isPaused) return
    const interval = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000)
    return () => window.clearInterval(interval)
  }, [activeSessionId, isPaused])

  const sessions = useMemo(
    () => sleepSessions.filter((session) => session.baby_id === babyId),
    [babyId, sleepSessions],
  )
  // Newly created profiles can contain zero-length placeholder records. They do not
  // provide a useful dashboard, so show the supplied design's representative data
  // until at least one meaningful session has been logged.
  const isShowingDemo = sessions.length === 0 || sessions.every((session) => sessionMinutes(session) < 1)
  const displaySessions = isShowingDemo ? demoSessions : sessions

  const todaySessions = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return displaySessions
      .filter((session) => new Date(session.started_at) >= today)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
  }, [displaySessions])

  const activeSession = useMemo(
    () => {
      if (isShowingDemo) return demoSessionRunning ? demoSessions[2] : undefined
      return sessions.find((session) => session.id === activeSessionId) ?? sessions.find((session) => !session.ended_at)
    },
    [activeSessionId, demoSessionRunning, isShowingDemo, sessions],
  )
  const totalMinutes = isShowingDemo ? 870 : todaySessions.reduce((total, session) => total + sessionMinutes(session), 0)
  const longestMinutes = isShowingDemo ? 252 : Math.max(0, ...todaySessions.map(sessionMinutes))

  const handleStart = useCallback(() => {
    const id = generateId()
    const now = new Date().toISOString()
    const session = { id, baby_id: babyId, started_at: now, location: "crib" as SleepLocation }
    setActiveSessionId(id)
    setElapsedSeconds(0)
    setIsPaused(false)
    createSleepSession(session).catch(() => addSleepSession(session))
  }, [addSleepSession, babyId])

  const handleStop = useCallback(() => {
    if (!activeSession) return
    if (activeSession.id.startsWith("demo-")) {
      setDemoSessionRunning(false)
      setIsPaused(false)
      setAlert({ title: "Sleep Logged", message: "Well done! A new sleep entry has been added to the history." })
      return
    }
    const ended_at = new Date().toISOString()
    updateSleepSessionApi(activeSession.id, { ended_at }).catch(() =>
      updateSleepSession(activeSession.id, { ended_at }),
    )
    setActiveSessionId(null)
    setElapsedSeconds(0)
    setIsPaused(false)
    setAlert({ title: "Sleep Logged", message: "Well done! A new sleep entry has been added to the history." })
  }, [activeSession, updateSleepSession])

  const handleManualSave = useCallback(() => {
    const now = new Date()
    const [startHour, startMinute] = manualStart.split(":").map(Number)
    const [endHour, endMinute] = manualEnd.split(":").map(Number)
    const started = new Date(now)
    const ended = new Date(now)
    started.setHours(startHour, startMinute, 0, 0)
    ended.setHours(endHour, endMinute, 0, 0)
    if (ended <= started) ended.setDate(ended.getDate() + 1)
    const session = {
      id: generateId(),
      baby_id: babyId,
      started_at: started.toISOString(),
      ended_at: ended.toISOString(),
      location: manualLocation,
    }
    createSleepSession(session).catch(() => addSleepSession(session))
    setManualModalOpen(false)
    setAlert({ title: "Success", message: "Sleep entry has been logged manually." })
  }, [addSleepSession, babyId, manualEnd, manualLocation, manualStart])

  const timelineSessions = useMemo(
    () => displaySessions.filter((session) => new Date(session.started_at).getTime() >= Date.now() - 86400000),
    [displaySessions],
  )
  const weeklyMinutes = useMemo(() => {
    return Array.from({ length: 7 }, (_, offset) => {
      const day = new Date()
      day.setDate(day.getDate() - (6 - offset))
      day.setHours(0, 0, 0, 0)
      const nextDay = new Date(day)
      nextDay.setDate(nextDay.getDate() + 1)
      return displaySessions
        .filter((session) => new Date(session.started_at) >= day && new Date(session.started_at) < nextDay)
        .reduce((total, session) => total + sessionMinutes(session), 0)
    })
  }, [displaySessions])

  const timerText = new Date((isShowingDemo ? 4522 : elapsedSeconds) * 1000).toISOString().slice(11, 19)
  return (
    <div className="mx-auto max-w-[1200px] px-container-margin py-stack-md md:px-12 md:py-stack-lg">
      <AppHeader />
      <div className="mb-stack-md flex items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background md:font-headline-lg md:text-headline-lg">Sleep Dashboard</h1>
          <p className="font-body-md text-on-surface-variant">Monitoring {babyName}&apos;s rest and cycles.</p>
        </div>
        <button type="button" onClick={() => setAlert({ title: "Sleep Trends", message: "Opening detailed analytics view..." })} className="hidden rounded-full border border-primary-container bg-surface-container-high px-6 py-2 font-label-md text-primary transition-colors hover:bg-primary-container md:block">View Trends</button>
      </div>

      <section className="mb-stack-lg grid grid-cols-1 gap-gutter md:grid-cols-3">
        <MetricCard icon="schedule" label="Total sleep today" value={formatHours(totalMinutes)} suffix="h" />
        <MetricCard icon="show_chart" label="Longest stretch" value={formatHours(longestMinutes)} suffix="h" accent />
        <div className="relative overflow-hidden rounded-xl bg-primary p-6 text-on-primary soft-shadow">
          <div className="relative z-10 flex h-full flex-col">
            <div className="mb-2 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full bg-primary-fixed ${activeSession ? "animate-pulse" : "opacity-60"}`} />
              <p className="font-label-md uppercase tracking-wider text-primary-fixed">{activeSession ? isPaused ? "Session paused" : "Currently sleeping" : "Awake"}</p>
            </div>
            <h2 className="font-headline-md text-headline-md">{activeSession ? `${babyName} is resting...` : `${babyName} is awake`}</h2>
            <p className="mt-auto font-body-sm opacity-90">{activeSession ? `Session started at ${formatClock(activeSession.started_at)}` : "Start a timer to track the next nap."}</p>
          </div>
          <span className="material-symbols-outlined fill-1 absolute -bottom-4 -right-4 text-9xl opacity-10">bedtime</span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-stack-lg lg:grid-cols-12">
        <section className="space-y-stack-md lg:col-span-5">
          <div className="rounded-xl bg-surface-container-lowest p-stack-md soft-shadow">
            <h2 className="mb-6 font-headline-sm text-headline-sm text-on-surface">Quick Log</h2>
            {activeSession ? (
              <div className="rounded-xl bg-gradient-to-br from-primary to-primary-container p-8 text-center text-on-primary">
                <p className="mb-2 font-label-md uppercase tracking-widest text-primary-fixed">Active sleep session</p>
                <p className="mb-6 font-display-timer text-display-timer tabular-nums">{timerText}</p>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsPaused((paused) => !paused)} className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-white/20 p-4 font-label-md transition-colors hover:bg-white/30">
                    <span className="material-symbols-outlined">{isPaused ? "play_arrow" : "pause"}</span>{isPaused ? "Resume" : "Pause"}
                  </button>
                  <button type="button" onClick={handleStop} className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-white p-4 font-label-md text-primary transition-colors hover:bg-secondary-container">
                    <span className="material-symbols-outlined fill-1">stop_circle</span>Wake Up
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={handleStart} className="flex w-full flex-col items-center rounded-xl border-2 border-dashed border-primary-container bg-surface-container-low p-10 text-primary transition-colors hover:bg-primary-container/20">
                <span className="material-symbols-outlined mb-2 text-4xl">bedtime</span><span className="font-headline-sm">Start Sleep Timer</span><span className="mt-1 font-body-sm text-on-surface-variant">Track a nap as it happens</span>
              </button>
            )}
            <button type="button" onClick={() => setManualModalOpen(true)} className="mt-stack-sm flex w-full items-center justify-center gap-2 rounded-xl bg-surface-container-high py-4 font-label-md text-primary transition-colors hover:bg-primary-container/30">
              <span className="material-symbols-outlined">edit_note</span>Manual Entry
            </button>
          </div>
          <LastSession session={todaySessions.find((session) => session.ended_at)} />
        </section>

        <section className="rounded-xl bg-surface-container-lowest p-stack-md soft-shadow lg:col-span-7">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Sleep Timeline <span className="font-normal text-on-surface-variant">({timelineView === "day" ? "Last 24h" : "Weekly"})</span></h2>
            <div className="flex rounded-full bg-surface-container-low p-1">
              {(["day", "week"] as const).map((view) => <button key={view} type="button" onClick={() => setTimelineView(view)} className={`rounded-full px-4 py-1.5 text-xs font-bold capitalize transition-colors ${timelineView === view ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-highest"}`}>{view}</button>)}
            </div>
          </div>
          {timelineView === "day" ? <DayTimeline sessions={timelineSessions} onSessionClick={(session) => setAlert({ title: session.ended_at ? "Sleep Session" : "Live Session", message: `${formatClock(session.started_at)}${session.ended_at ? ` – ${formatClock(session.ended_at)}` : " • currently sleeping"} in ${locationLabel(session.location)}.` })} /> : <WeekTimeline values={weeklyMinutes} />}
          <div className="mt-6 space-y-3">
            {todaySessions.length ? todaySessions.slice(0, 4).map((session) => <SessionRow key={session.id} session={session} onClick={() => setAlert({ title: session.ended_at ? "Sleep Session Details" : "Live Session", message: session.ended_at ? `Sleep lasted ${formatDuration(sessionMinutes(session))} in ${locationLabel(session.location)}.` : `${babyName} is still sleeping. We will notify you when they wake up.` })} />) : <p className="rounded-xl bg-surface-container-low p-6 text-center font-body-md text-on-surface-variant">No sleep logged today. Start a timer or add an entry.</p>}
          </div>
        </section>
      </div>

      {isManualModalOpen && <ManualEntryModal start={manualStart} end={manualEnd} location={manualLocation} onStartChange={setManualStart} onEndChange={setManualEnd} onLocationChange={setManualLocation} onCancel={() => setManualModalOpen(false)} onSave={handleManualSave} />}
      {alert && <AlertModal title={alert.title} message={alert.message} onClose={() => setAlert(null)} />}
    </div>
  )
}

function MetricCard({ icon, label, value, suffix, accent = false }: { icon: string; label: string; value: string; suffix: string; accent?: boolean }) {
  return <div className="flex flex-col items-center justify-center rounded-xl border border-primary-container/10 bg-surface-container-lowest p-6 text-center soft-shadow"><span className={`material-symbols-outlined mb-2 text-4xl ${accent ? "text-tertiary-container" : "text-primary-container"}`}>{icon}</span><p className="font-label-md uppercase tracking-wider text-on-surface-variant">{label}</p><p className={`mt-1 font-headline-lg text-headline-lg ${accent ? "text-tertiary" : "text-primary"}`}>{value}<span className="ml-1 font-headline-sm text-headline-sm font-normal">{suffix}</span></p></div>
}

function LastSession({ session }: { session?: SleepSession }) {
  return <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-6"><p className="mb-4 font-label-md uppercase text-on-surface-variant">Last sleep session</p>{session ? <div className="flex items-start gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-primary-container shadow-sm"><span className="material-symbols-outlined">wb_twilight</span></div><div><p className="font-headline-sm text-on-surface">Sleep session</p><p className="font-body-sm text-on-surface-variant">{formatClock(session.started_at)} – {session.ended_at ? formatClock(session.ended_at) : "In progress"} ({formatDuration(sessionMinutes(session))})</p><span className="mt-2 inline-block rounded bg-primary-container/20 px-2 py-0.5 text-[10px] font-bold uppercase text-on-primary-container">{locationLabel(session.location)}</span></div></div> : <p className="font-body-sm text-on-surface-variant">Your latest completed session will appear here.</p>}</div>
}

function DayTimeline({ sessions, onSessionClick }: { sessions: SleepSession[]; onSessionClick: (session: SleepSession) => void }) {
  return <><div className="flex justify-between px-1 text-[10px] font-bold uppercase text-on-surface-variant/60"><span>12am</span><span>4am</span><span>8am</span><span>12pm</span><span>4pm</span><span>8pm</span><span>12am</span></div><div className="relative mt-2 h-24 overflow-hidden rounded-xl bg-surface-container-low">{sessions.map((session) => { const start = new Date(session.started_at); const end = session.ended_at ? new Date(session.ended_at) : new Date(); const startMinutes = start.getHours() * 60 + start.getMinutes(); const duration = Math.max(20, Math.min(1440 - startMinutes, (end.getTime() - start.getTime()) / 60000)); return <button type="button" key={session.id} onClick={() => onSessionClick(session)} title={`${formatClock(session.started_at)} • ${formatDuration(sessionMinutes(session))}`} className={`absolute top-0 flex h-full items-center justify-center border-x border-primary-container ${session.ended_at ? "bg-primary-container/40" : "bg-tertiary-container/70"}`} style={{ left: `${(startMinutes / 1440) * 100}%`, width: `${(duration / 1440) * 100}%` }}><span className="material-symbols-outlined text-xs text-on-primary-container">bedtime</span></button> })}</div></>
}

function WeekTimeline({ values }: { values: number[] }) { const max = Math.max(60, ...values); const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; return <div className="flex h-28 items-end gap-2 rounded-xl bg-surface-container-low p-3">{values.map((value, index) => <div key={days[index]} className="flex h-full flex-1 flex-col justify-end gap-1 text-center"><div title={`${formatDuration(value)} sleep`} className="rounded-t-lg bg-primary/50 transition-all hover:bg-primary" style={{ height: `${Math.max(5, (value / max) * 100)}%` }} /><span className="text-[10px] font-bold text-on-surface-variant">{days[index]}</span></div>)}</div> }

function SessionRow({ session, onClick }: { session: SleepSession; onClick: () => void }) { const ongoing = !session.ended_at; return <button type="button" onClick={onClick} className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left ${ongoing ? "border-primary-container/20 bg-primary-container/5" : "border-transparent hover:bg-surface-container-low"}`}><div className={`h-10 w-2 rounded-full ${ongoing ? "bg-tertiary-container" : "bg-primary"}`} /><div className="min-w-0 flex-1"><div className="flex justify-between gap-4"><p className="font-label-md text-on-surface">{ongoing ? "Current sleep" : "Sleep session"}</p><p className="font-label-md text-primary">{ongoing ? "IN PROGRESS" : formatDuration(sessionMinutes(session))}</p></div><p className="text-xs text-on-surface-variant">{formatClock(session.started_at)}{session.ended_at ? ` – ${formatClock(session.ended_at)}` : " • Started"} • {locationLabel(session.location)}</p></div><span className="material-symbols-outlined text-on-surface-variant">chevron_right</span></button> }

function ManualEntryModal({ start, end, location, onStartChange, onEndChange, onLocationChange, onCancel, onSave }: { start: string; end: string; location: SleepLocation; onStartChange: (value: string) => void; onEndChange: (value: string) => void; onLocationChange: (value: SleepLocation) => void; onCancel: () => void; onSave: () => void }) { return <div role="dialog" aria-modal="true" aria-label="Add sleep log" className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/40 p-4 backdrop-blur-sm"><div className="w-full max-w-md overflow-hidden rounded-xl bg-surface-container-lowest soft-shadow"><div className="flex items-center justify-between border-b border-outline-variant/30 p-6"><h2 className="font-headline-sm text-on-surface">Add Sleep Log</h2><button type="button" aria-label="Close" onClick={onCancel} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high"><span className="material-symbols-outlined">close</span></button></div><div className="space-y-4 p-6"><label className="block font-label-md text-on-surface-variant">Start Time<input value={start} onChange={(event) => onStartChange(event.target.value)} type="time" className="mt-1 block w-full rounded-xl border-outline-variant/50 bg-white p-3 font-body-md text-on-surface focus:border-primary focus:ring-primary" /></label><label className="block font-label-md text-on-surface-variant">End Time<input value={end} onChange={(event) => onEndChange(event.target.value)} type="time" className="mt-1 block w-full rounded-xl border-outline-variant/50 bg-white p-3 font-body-md text-on-surface focus:border-primary focus:ring-primary" /></label><label className="block font-label-md text-on-surface-variant">Location<select value={location} onChange={(event) => onLocationChange(event.target.value as SleepLocation)} className="mt-1 block w-full rounded-xl border-outline-variant/50 bg-white p-3 font-body-md text-on-surface focus:border-primary focus:ring-primary">{locations.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div><div className="flex gap-3 bg-surface-container-low p-6"><button type="button" onClick={onCancel} className="flex-1 rounded-xl bg-surface-container-high py-3 font-label-md text-on-surface-variant">Cancel</button><button type="button" onClick={onSave} className="flex-1 rounded-xl bg-primary py-3 font-label-md text-on-primary">Save Log</button></div></div></div> }

function AlertModal({ title, message, onClose }: { title: string; message: string; onClose: () => void }) { return <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[60] flex items-center justify-center bg-on-background/40 p-4 backdrop-blur-sm"><div className="w-full max-w-sm rounded-xl bg-surface-container-lowest p-8 text-center soft-shadow"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-container/20 text-primary"><span className="material-symbols-outlined text-4xl">info</span></div><h2 className="font-headline-sm text-on-surface">{title}</h2><p className="mt-2 font-body-md text-on-surface-variant">{message}</p><button type="button" onClick={onClose} className="mt-6 w-full rounded-xl bg-primary py-3 font-label-md text-on-primary">Got it</button></div></div> }
