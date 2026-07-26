"use client"

import type { Milestone } from "@/lib/store"

interface UpcomingMilestonesProps {
  milestones: Milestone[]
  currentLabel?: string
  onToggleAchieve?: (id: string, achieved: boolean) => void
  onDelete?: (id: string) => void
  onAddCustom?: () => void
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

function UpcomingMilestones({ milestones, currentLabel, onToggleAchieve, onDelete, onAddCustom }: UpcomingMilestonesProps) {
  const achievedList = milestones.filter((m) => m.achieved)

  const upcomingList = milestones.filter((m) => !m.achieved)

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
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">trending_up</span>
          <h3 className="font-headline-md text-headline-md text-primary">Current Goals</h3>
        </div>
        {currentLabel && (
          <span className="bg-white/50 px-3 py-1 rounded-full text-label-md font-bold">{currentLabel}</span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {achievedList.map((m) => (
          <div
            key={m.id}
            className="bg-white p-4 rounded-2xl flex items-center gap-4 border border-primary/10 shadow-sm cursor-pointer hover:border-primary transition-colors group"
            role="button"
            tabIndex={0}
            onClick={() => {
              if (m.is_custom && onDelete) {
                onDelete(m.id)
              } else {
                onToggleAchieve?.(m.id, false)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                if (m.is_custom && onDelete) {
                  onDelete(m.id)
                } else {
                  onToggleAchieve?.(m.id, false)
                }
              }
            }}
          >
            <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-on-surface">{m.title}</p>
              <p className="text-xs text-on-surface-variant">
                {m.achieved_date ? `Achieved ${formatShortDate(m.achieved_date)}` : "Achieved"}
              </p>
            </div>
            {m.is_custom && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(m.id)
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full text-error hover:bg-error-container/20 transition-colors shrink-0"
                aria-label={`Delete ${m.title}`}
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            )}
          </div>
        ))}

        {upcomingList.map((m) => (
          <div
            key={m.id}
            className="bg-white p-4 rounded-2xl flex items-center gap-4 border border-outline-variant/30 shadow-sm hover:border-primary transition-colors cursor-pointer group"
            role="button"
            tabIndex={0}
            onClick={() => onToggleAchieve?.(m.id, true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onToggleAchieve?.(m.id, true)
              }
            }}
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
        onClick={onAddCustom}
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
