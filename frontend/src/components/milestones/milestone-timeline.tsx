"use client"

import type { Milestone, MilestoneAgeRange } from "@/lib/store"
import { MilestoneCard } from "./milestone-card"

interface MilestoneTimelineProps {
  milestones: Milestone[]
  onAchieve?: (id: string) => void
  onDelete?: (id: string) => void
}

const ageRangeLabels: Record<MilestoneAgeRange, string> = {
  "0-3": "0–3 Months",
  "3-6": "3–6 Months",
  "6-12": "6–12 Months",
  "12-24": "12–24 Months",
}

const ageRangeIcons: Record<MilestoneAgeRange, string> = {
  "0-3": "newborn",
  "3-6": "child_care",
  "12-24": "toddler",
}

function MilestoneTimeline({ milestones, onAchieve, onDelete }: MilestoneTimelineProps) {
  const ranges: MilestoneAgeRange[] = ["0-3", "3-6", "6-12", "12-24"]

  const grouped = ranges.reduce(
    (acc, range) => {
      acc[range] = milestones.filter((m) => m.age_range === range)
      return acc
    },
    {} as Record<MilestoneAgeRange, Milestone[]>,
  )

  const hasAny = ranges.some((r) => grouped[r].length > 0)

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
        <span className="material-symbols-outlined text-5xl mb-4">emoji_events</span>
        <p className="font-body-md text-body-md">No milestones yet.</p>
        <p className="font-label-md text-label-md">Start tracking your baby&apos;s achievements!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 relative pl-8">
      <div className="absolute left-3 top-0 bottom-0 w-0.5 timeline-line opacity-30" />

      {milestones.map((milestone, idx) => (
        <div key={milestone.id} className="relative group">
          <div className="absolute -left-11 top-6 w-6 h-6 rounded-full bg-primary border-4 border-surface shadow-sm z-10" />

          <MilestoneCard
            milestone={milestone}
            onAchieve={onAchieve}
            onDelete={onDelete}
            idx={idx}
          />
        </div>
      ))}
    </div>
  )
}

MilestoneTimeline.displayName = "MilestoneTimeline"

export { MilestoneTimeline }
export type { MilestoneTimelineProps }
