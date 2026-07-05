"use client"

import type { Milestone, MilestoneCategory } from "@/lib/store"

interface MilestoneCardProps {
  milestone: Milestone
  onAchieve?: (id: string) => void
  onDelete?: (id: string) => void
  showActions?: boolean
}

const categoryColors: Record<MilestoneCategory, { dot: string; bg: string; icon: string }> = {
  physical: { dot: "bg-accent-coral", bg: "bg-accent-coral/10", icon: "self_improvement" },
  cognitive: { dot: "bg-tertiary", bg: "bg-tertiary/10", icon: "psychology" },
  social: { dot: "bg-secondary", bg: "bg-secondary/10", icon: "diversity_3" },
  language: { dot: "bg-primary", bg: "bg-primary/10", icon: "record_voice_over" },
}

function formatDate(iso?: string): string {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return ""
  }
}

function MilestoneCard({ milestone, onAchieve, onDelete, showActions = true }: MilestoneCardProps) {
  const colors = categoryColors[milestone.category]

  return (
    <div className={[
      "relative flex items-start gap-4 p-gutter rounded-xl transition-all",
      milestone.achieved ? "bg-primary-container/10" : "bg-surface-container-low",
    ].join(" ")}>
      <div className={[
        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
        milestone.achieved ? colors.bg : "bg-surface-container-high",
      ].join(" ")}>
        {milestone.achieved ? (
          <span className="material-symbols-outlined text-primary fill-1">check_circle</span>
        ) : (
          <span className={["material-symbols-outlined", colors.dot.replace("bg-", "text-")].join(" ")}>
            {colors.icon}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className={[
            "font-headline-sm text-headline-sm",
            milestone.achieved ? "text-on-surface line-through decoration-primary/50" : "text-primary",
          ].join(" ")}>
            {milestone.title}
          </h4>
          <span className={[
            "w-2 h-2 rounded-full",
            milestone.achieved ? "bg-primary" : colors.dot,
          ].join(" ")} />
        </div>

        {milestone.achieved && milestone.achieved_date && (
          <p className="font-label-md text-label-md text-primary mt-1">
            Achieved {formatDate(milestone.achieved_date)}
          </p>
        )}

        {milestone.notes && (
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 italic">
            {milestone.notes}
          </p>
        )}

        {!milestone.achieved && showActions && (
          <div className="flex gap-2 mt-3">
            {onAchieve && (
              <button
                type="button"
                onClick={() => onAchieve(milestone.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-on-primary rounded-full font-label-md text-label-md active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                Achieve
              </button>
            )}
            {milestone.is_custom && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(milestone.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-error-container text-error rounded-full font-label-md text-label-md active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

MilestoneCard.displayName = "MilestoneCard"

export { MilestoneCard }
export type { MilestoneCardProps }
