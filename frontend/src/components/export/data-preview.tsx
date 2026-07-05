"use client"

import type { FeedSession, SleepSession, Measurement, Milestone } from "@/lib/store"

interface DataPreviewProps {
  feedSessions: FeedSession[]
  sleepSessions: SleepSession[]
  measurements: Measurement[]
  milestones: Milestone[]
}

function DataPreview({ feedSessions, sleepSessions, measurements, milestones }: DataPreviewProps) {
  const sections = [
    {
      icon: "restaurant",
      label: "Feed Sessions",
      count: feedSessions.length,
      color: "text-primary",
      bg: "bg-primary-container/20",
    },
    {
      icon: "bedtime",
      label: "Sleep Sessions",
      count: sleepSessions.length,
      color: "text-secondary",
      bg: "bg-secondary-container/20",
    },
    {
      icon: "straighten",
      label: "Growth Measurements",
      count: measurements.length,
      color: "text-tertiary",
      bg: "bg-tertiary-container/20",
    },
    {
      icon: "stars",
      label: "Milestones",
      count: milestones.length,
      color: "text-accent-coral",
      bg: "bg-accent-coral/10",
    },
  ]

  return (
    <div className="flex flex-col gap-2">
      <label className="font-label-md text-label-md text-on-surface-variant">Data to Export</label>
      <div className="grid grid-cols-2 gap-3">
        {sections.map((section) => (
          <div
            key={section.label}
            className="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/50 active:scale-[0.98] transition-transform"
          >
            <div className={`w-10 h-10 rounded-xl ${section.bg} flex items-center justify-center shrink-0`}>
              <span className={`material-symbols-outlined text-[22px] ${section.color}`}>
                {section.icon}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-label-md text-label-md text-on-surface-variant truncate">{section.label}</p>
              <p className="font-headline-sm text-headline-sm text-on-surface">{section.count}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { DataPreview }
export type { DataPreviewProps }
