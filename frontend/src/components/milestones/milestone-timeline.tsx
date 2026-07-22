"use client"

import type { Milestone } from "@/lib/store"
import { MilestoneCard } from "./milestone-card"

interface MilestoneTimelineProps {
  milestones: Milestone[]
  onAchieve?: (id: string) => void
  onDelete?: (id: string) => void
}

function MilestoneTimeline({ milestones, onAchieve, onDelete }: MilestoneTimelineProps) {
  if (milestones.length === 0) {
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
          <div className={["absolute -left-11 top-6 w-6 h-6 rounded-full border-4 border-surface shadow-sm z-10", idx % 2 === 0 ? "bg-primary" : "bg-primary-container"].join(" ")} />

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
