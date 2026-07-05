"use client"

import type { SleepSession, SleepLocation } from "@/lib/store"

interface SleepTimelineProps {
  sessions: SleepSession[]
}

const locationMeta: Record<SleepLocation, { icon: string; label: string }> = {
  crib: { icon: "crib", label: "Crib" },
  bed: { icon: "bed", label: "Bed" },
  carrier: { icon: "carry_on_bag", label: "Carrier" },
  stroller: { icon: "stroller", label: "Stroller" },
  contact: { icon: "contact_page", label: "Contact" },
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return iso
  }
}

function formatDuration(startIso: string, endIso?: string): string {
  if (!endIso) return "In progress..."
  try {
    const diff = new Date(endIso).getTime() - new Date(startIso).getTime()
    const mins = Math.round(diff / 60000)
    if (mins < 60) return `${mins}m`
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  } catch {
    return ""
  }
}

function getHourBars(sessions: SleepSession[]): { label: string; sessions: SleepSession[] }[] {
  const slots = Array.from({ length: 8 }, (_, i) => {
    const hour = i * 3
    const label =
      hour === 0
        ? "12 AM"
        : hour < 12
          ? `${hour} AM`
          : hour === 12
            ? "12 PM"
            : `${hour - 12} PM`
    return { label, hour, sessions: [] as SleepSession[] }
  })

  for (const session of sessions) {
    const startHour = new Date(session.started_at).getHours()
    for (const slot of slots) {
      if (startHour >= slot.hour && startHour < slot.hour + 3) {
        slot.sessions.push(session)
        break
      }
    }
  }

  return slots
}

function SleepTimeline({ sessions }: SleepTimelineProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
        <span className="material-symbols-outlined text-5xl mb-4">bedtime</span>
        <p className="font-body-md text-body-md">No sleep recorded yet today.</p>
        <p className="font-label-md text-label-md">Start a sleep timer or log manually above.</p>
      </div>
    )
  }

  const hourBars = getHourBars(sessions)

  return (
    <section className="bg-white rounded-2xl p-stack-md soft-shadow">
      <div className="flex justify-between items-center mb-stack-lg">
        <h3 className="font-headline-md text-headline-md text-primary">Sleep Timeline (24h)</h3>
      </div>

      <div className="mb-stack-md">
        <div className="flex items-end gap-1 h-24">
          {hourBars.map((slot) => {
            const totalMins = slot.sessions.reduce((acc, s) => {
              if (!s.ended_at) return acc
              return acc + (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000
            }, 0)
            const heightPct = Math.min(100, Math.max(5, (totalMins / 120) * 100))
            return (
              <div key={slot.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="font-label-md text-label-md text-on-surface-variant">
                  {totalMins > 0 ? `${Math.round(totalMins)}m` : ""}
                </span>
                <div
                  className="w-full bg-primary-container/30 rounded-t-lg transition-all"
                  style={{ height: `${heightPct}%` }}
                />
                <span className="font-label-md text-label-md text-on-surface-variant text-[10px]">
                  {slot.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="relative pl-8 space-y-4 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-primary-container/30">
        {sessions.map((session) => {
          const location = session.location ? locationMeta[session.location] : null
          const duration = formatDuration(session.started_at, session.ended_at)
          const isActive = !session.ended_at

          return (
            <div key={session.id} className="relative group">
              <div
                className={[
                  "absolute -left-[32px] top-1 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white z-10",
                  isActive ? "bg-accent-coral" : "bg-primary",
                ].join(" ")}
              >
                <span
                  className="material-symbols-outlined text-white text-xs"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  bedtime
                </span>
              </div>
              <div className="bg-surface-container-low rounded-2xl p-gutter hover:bg-surface-container-high transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-headline-sm text-headline-sm text-primary">
                      Sleep
                    </p>
                    {duration && (
                      <span className="font-label-md text-label-md text-on-surface-variant bg-white px-3 py-1 rounded-full">
                        {duration}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {location && (
                      <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary-container/20 text-on-primary-container font-label-md text-label-md">
                        <span className="material-symbols-outlined text-xs">
                          {location.icon}
                        </span>
                        {location.label}
                      </span>
                    )}
                    <p className="font-label-md text-label-md text-on-surface-variant">
                      {formatTime(session.started_at)}
                    </p>
                  </div>
                </div>
                {isActive && (
                  <div className="mt-2 inline-flex items-center gap-1 font-label-md text-label-md text-accent-coral">
                    <span className="w-1.5 h-1.5 bg-accent-coral rounded-full animate-pulse" />
                    IN PROGRESS
                  </div>
                )}
                {session.notes && (
                  <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant italic">
                    {session.notes}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

SleepTimeline.displayName = "SleepTimeline"

export { SleepTimeline }
export type { SleepTimelineProps }
