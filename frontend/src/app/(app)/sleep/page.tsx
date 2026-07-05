"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { useAppStore } from "@/lib/store"
import type { SleepLocation } from "@/lib/store"
import {
  DailySleepSummary,
  SleepTimeline,
  SleepTimer,
  SleepForm,
} from "@/components/sleep"

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getTodayRange(): [Date, Date] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start.getTime() + 86400000)
  return [start, end]
}

export default function SleepPage() {
  const activeBaby = useAppStore((s) => s.activeBaby)
  const sleepSessions = useAppStore((s) => s.sleepSessions)
  const addSleepSession = useAppStore((s) => s.addSleepSession)
  const updateSleepSession = useAppStore((s) => s.updateSleepSession)

  const babyId = activeBaby?.id ?? "sample"
  const babyName = activeBaby?.name ?? "Lily"

  const [activeTab, setActiveTab] = useState<"timer" | "manual">("timer")
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerElapsed, setTimerElapsed] = useState(0)
  const [timerLocation, setTimerLocation] = useState<SleepLocation | undefined>()
  const [timerNotes, setTimerNotes] = useState("")
  const [activeTimerSessionId, setActiveTimerSessionId] = useState<string | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setTimerElapsed((s) => s + 1)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timerRunning])

  const handleStartTimer = useCallback(() => {
    const now = new Date().toISOString()
    const id = generateId()
    setTimerElapsed(0)
    setTimerRunning(true)
    setActiveTimerSessionId(id)

    addSleepSession({
      id,
      baby_id: babyId,
      started_at: now,
      location: timerLocation,
      notes: timerNotes.trim() || undefined,
    })
  }, [babyId, timerLocation, timerNotes, addSleepSession])

  const handleStopTimer = useCallback(() => {
    if (!activeTimerSessionId) return
    const now = new Date().toISOString()

    updateSleepSession(activeTimerSessionId, { ended_at: now })

    setTimerRunning(false)
    setTimerElapsed(0)
    setActiveTimerSessionId(null)
    setTimerLocation(undefined)
    setTimerNotes("")
  }, [activeTimerSessionId, updateSleepSession])

  const handleManualSave = useCallback(
    (data: { started_at: string; ended_at: string; location?: SleepLocation; notes?: string }) => {
      addSleepSession({
        id: generateId(),
        baby_id: babyId,
        started_at: data.started_at,
        ended_at: data.ended_at,
        location: data.location,
        notes: data.notes,
      })
    },
    [babyId, addSleepSession],
  )

  const todaySessions = useMemo(() => {
    const [start, end] = getTodayRange()
    return sleepSessions
      .filter((s) => s.baby_id === babyId)
      .filter((s) => {
        const d = new Date(s.started_at)
        return d >= start && d < end
      })
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
  }, [sleepSessions, babyId])

  const totalMinutes = useMemo(
    () =>
      todaySessions.reduce((acc, s) => {
        if (!s.ended_at) return acc
        return acc + (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000
      }, 0),
    [todaySessions],
  )

  const longestStretch = useMemo(() => {
    let max = 0
    for (const s of todaySessions) {
      if (!s.ended_at) continue
      const dur = (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000
      if (dur > max) max = dur
    }
    return Math.round(max)
  }, [todaySessions])

  const timelineSessions = useMemo(() => {
    const twentyFourHrsAgo = new Date(Date.now() - 86400000)
    return sleepSessions
      .filter((s) => s.baby_id === babyId)
      .filter((s) => new Date(s.started_at) >= twentyFourHrsAgo)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
  }, [sleepSessions, babyId])

  return (
    <div className="pb-stack-lg">
      <div className="px-container-margin md:px-stack-lg py-stack-md max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-stack-lg">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary">Sleep Tracking</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Monitor {babyName}&apos;s sleep patterns and duration.
            </p>
          </div>
          <div className="flex items-center gap-base">
            <button
              type="button"
              className="p-3 bg-white rounded-full soft-shadow text-primary hover:bg-primary-container/10 transition-colors"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="w-10 h-10 rounded-full border-2 border-primary-container overflow-hidden soft-shadow bg-primary-container/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">child_care</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-md">
          <div className="lg:col-span-8">
            <DailySleepSummary
              totalMinutes={Math.round(totalMinutes)}
              longestStretchMinutes={longestStretch}
              sessionCount={todaySessions.length}
            />
          </div>

          <section className="lg:col-span-4 bg-white rounded-2xl p-stack-md soft-shadow flex flex-col">
            <div className="flex justify-between items-center mb-stack-md">
              <h3 className="font-headline-md text-headline-md text-primary">Record Sleep</h3>
            </div>

            <div className="flex bg-surface-container-low rounded-xl p-1 mb-stack-md">
              {(["timer", "manual"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={[
                    "flex-1 py-2 rounded-lg font-label-md text-label-md transition-all",
                    activeTab === tab
                      ? "bg-white text-primary font-bold shadow-sm"
                      : "text-on-surface-variant hover:bg-white/50",
                  ].join(" ")}
                >
                  {tab === "timer" ? "Timer" : "Manual"}
                </button>
              ))}
            </div>

            <div className="flex-1">
              {activeTab === "timer" ? (
                <div className="space-y-4">
                  <SleepTimer
                    running={timerRunning}
                    elapsedSeconds={timerElapsed}
                    onStart={handleStartTimer}
                    onStop={handleStopTimer}
                    onElapsedChange={setTimerElapsed}
                  />
                  <div className="space-y-2">
                    <label className="font-label-md text-label-md text-on-surface-variant">
                      Location
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["crib", "bed", "carrier", "stroller", "contact"] as const).map(
                        (loc) => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => setTimerLocation(loc)}
                            className={[
                              "py-2 rounded-xl font-label-md text-label-md transition-all active:scale-95 border-2",
                              timerLocation === loc
                                ? "border-primary bg-primary-container/20 text-primary"
                                : "border-transparent bg-surface-container text-on-surface-variant",
                            ].join(" ")}
                          >
                            {loc}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-label-md text-on-surface-variant">
                      Notes
                    </label>
                    <textarea
                      value={timerNotes}
                      onChange={(e) => setTimerNotes(e.target.value)}
                      placeholder="Observations..."
                      className="w-full h-20 p-gutter bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 font-body-md text-body-md resize-none outline-none"
                    />
                  </div>
                </div>
              ) : (
                <SleepForm onSave={handleManualSave} />
              )}
            </div>
          </section>

          <SleepTimeline sessions={timelineSessions} />
        </div>
      </div>
    </div>
  )
}
