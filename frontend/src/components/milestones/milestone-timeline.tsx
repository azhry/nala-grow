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
  "6-12": "baby_changing_station",
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
    <div className="relative pl-10 space-y-8">
      <div className="absolute left-[11px] top-2 bottom-2 w-[2px] timeline-line opacity-30" />

      {ranges.map((range, rangeIdx) => {
        const items = grouped[range]
        if (items.length === 0) return null

        return (
          <div key={range} className="relative group">
            <div className="absolute -left-[40px] top-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center ring-4 ring-white z-10">
              <span className="material-symbols-outlined text-white text-xs fill-1">
                {ageRangeIcons[range]}
              </span>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-gutter">
              <h3 className="font-headline-md text-headline-md text-primary mb-4">
                {ageRangeLabels[range]}
              </h3>
              <div className="space-y-3">
                {items.map((milestone, idx) => (
                  <MilestoneCard
                    key={milestone.id}
                    milestone={milestone}
                    onAchieve={onAchieve}
                    onDelete={onDelete}
                    imageRotate={idx % 2 === 0 ? "-rotate-1" : "rotate-2"}
                    tapeStyle={idx % 2 === 0 ? undefined : "transform: translateX(-50%) rotate(3deg); background: rgba(126, 182, 173, 0.2);"}
                  />
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

MilestoneTimeline.displayName = "MilestoneTimeline"

export { MilestoneTimeline }
export type { MilestoneTimelineProps }
