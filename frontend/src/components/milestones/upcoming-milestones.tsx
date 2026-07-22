"use client"

import type { Milestone, MilestoneAgeRange } from "@/lib/store"
import { MILESTONE_DEFINITIONS } from "@/lib/store"

interface UpcomingMilestonesProps {
  milestones: Milestone[]
  babyDob?: string
}

const ageRangeLabels: Record<MilestoneAgeRange, string> = {
  "0-3": "0–3 Months",
  "3-6": "3–6 Months",
  "6-12": "6–12 Months",
  "12-24": "12–24 Months",
}

function getBabyAgeMonths(dob: string): number | null {
  try {
    const birth = new Date(dob)
    const now = new Date()
    return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  } catch {
    return null
  }
}

function getCurrentAgeRange(dob: string): MilestoneAgeRange | null {
  const months = getBabyAgeMonths(dob)
  if (months === null || months < 0) return null
  if (months < 3) return "0-3"
  if (months < 6) return "3-6"
  if (months < 12) return "6-12"
  return "12-24"
}

function formatShortDate(iso?: string): string {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  } catch {
    return ""
  }
}

function UpcomingMilestones({ milestones, babyDob }: UpcomingMilestonesProps) {
  const currentRange = babyDob ? getCurrentAgeRange(babyDob) : null
  const currentLabel = currentRange ? ageRangeLabels[currentRange].replace(" Months", "m") : ""

  const rangeMilestones = currentRange
    ? milestones.filter((m) => m.age_range === currentRange)
    : milestones

  const achievedList = rangeMilestones
    .filter((m) => m.achieved)
    .sort((a, b) => (b.achieved_date || "").localeCompare(a.achieved_date || ""))

  const upcomingList = rangeMilestones
    .filter((m) => !m.achieved)
    .sort((a, b) => a.title.localeCompare(b.title))

  if (achievedList.length === 0 && upcomingList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant">
        <span className="material-symbols-outlined text-4xl mb-3">celebration</span>
        <p className="font-body-md text-body-md">All milestones achieved!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-headline-sm text-headline-sm text-primary">Current Goals</h3>
        {currentRange && (
          <span className="bg-white/50 px-3 py-1 rounded-full text-label-md font-bold">{currentLabel}</span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {achievedList.map((m) => (
          <div key={m.id} className="bg-white p-4 rounded-2xl flex items-center gap-4 border border-primary/10 shadow-sm opacity-70">
            <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-on-surface">{m.title}</p>
              <p className="text-xs text-on-surface-variant">
                {m.achieved_date ? `Achieved ${formatShortDate(m.achieved_date)}` : "Achieved"}
              </p>
            </div>
          </div>
        ))}

        {upcomingList.map((m) => (
          <div
            key={m.id}
            className="bg-white p-4 rounded-2xl flex items-center gap-4 border border-outline-variant/30 shadow-sm hover:border-primary transition-colors cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full border-2 border-outline-variant text-outline-variant flex items-center justify-center group-hover:border-primary group-hover:text-primary transition-colors shrink-0">
              <span className="material-symbols-outlined">add</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-on-surface">{m.title}</p>
              <p className="text-xs text-primary font-bold">Upcoming</p>
            </div>
            <span className="material-symbols-outlined text-outline-variant">chevron_right</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="w-full py-4 rounded-2xl border-2 border-dashed border-primary/30 text-primary font-bold hover:bg-white/50 transition-all active:scale-[0.98]"
      >
        <span className="material-symbols-outlined align-middle mr-2" data-icon="add_circle">
          add_circle
        </span>
        Add Custom Milestone
      </button>
    </div>
  )
}

UpcomingMilestones.displayName = "UpcomingMilestones"

export { UpcomingMilestones }
export type { UpcomingMilestonesProps }
