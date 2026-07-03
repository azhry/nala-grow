"use client"

import { Timeline } from "@/components/ui"
import type { TimelineEntry } from "@/components/ui"

interface TimelineWidgetProps {
  entries: TimelineEntry[]
  title?: string
  onViewAll?: () => void
  className?: string
}

function TimelineWidget({ entries, title = "Recent Activities", onViewAll, className = "" }: TimelineWidgetProps) {
  return (
    <div className={["rounded-3xl border border-primary/5 bg-surface-container-lowest p-stack-md shadow-soft", className].join(" ")}>
      <div className="mb-stack-md flex items-center justify-between">
        <h3 className="font-headline-sm text-headline-sm text-on-surface">{title}</h3>
        {onViewAll && (
          <button onClick={onViewAll} className="text-body-sm font-bold text-primary hover:underline">
            View All
          </button>
        )}
      </div>
      <Timeline entries={entries} />
    </div>
  )
}

export { TimelineWidget }
export type { TimelineWidgetProps }
