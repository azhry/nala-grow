"use client"

import { ProgressBar } from "@/components/ui"

interface MilestoneProgressProps {
  achieved: number
  total: number
}

function MilestoneProgress({ achieved, total }: MilestoneProgressProps) {
  const pct = total > 0 ? Math.round((achieved / total) * 100) : 0

  return (
    <div className="bg-surface-container-low rounded-2xl p-gutter">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-primary-container/30 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary">emoji_events</span>
        </div>
        <div className="flex-1">
          <p className="font-headline-sm text-headline-sm text-primary">Milestone Progress</p>
          <p className="font-label-md text-label-md text-on-surface-variant">
            {achieved} of {total} milestones achieved
          </p>
        </div>
        <span className="font-headline-lg text-headline-lg text-primary">{pct}%</span>
      </div>
      <ProgressBar value={pct} max={100} />
    </div>
  )
}

MilestoneProgress.displayName = "MilestoneProgress"

export { MilestoneProgress }
export type { MilestoneProgressProps }
