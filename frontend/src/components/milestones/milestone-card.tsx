"use client"

import type { Milestone, MilestoneCategory } from "@/lib/store"

interface MilestoneCardProps {
  milestone: Milestone
  onAchieve?: (id: string) => void
  onDelete?: (id: string) => void
  showActions?: boolean
  imageRotate?: string
  tapeStyle?: string
}

const categoryLabels: Record<MilestoneCategory, { primary: string; secondary?: string }> = {
  physical: { primary: "Physical", secondary: "Motor Skills" },
  cognitive: { primary: "Cognitive" },
  social: { primary: "Social", secondary: "Emotional" },
  language: { primary: "Language" },
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

function MilestoneCard({ milestone, onAchieve, onDelete, showActions = true, imageRotate = "-rotate-1", tapeStyle }: MilestoneCardProps): JSX.Element {
  const labels = categoryLabels[milestone.category]
  const hasSecondary = Boolean(labels.secondary)

  return (
    <div className="relative scrapbook-card bg-surface-container-lowest p-gutter rounded-2xl shadow-[0_8px_20px_rgba(126,182,173,0.15)] flex flex-col md:flex-row gap-gutter transition-all hover:translate-y-[-4px]">
      <div className={["tape-effect", tapeStyle].filter(Boolean).join(" ") || undefined} />

      <div className={["w-full md:w-48 h-48 rounded-xl overflow-hidden shadow-inner border-4 border-white transform", imageRotate].join(" ")}>
        {milestone.photo_url ? (
          <img
            alt={milestone.title}
            className="w-full h-full object-cover"
            src={milestone.photo_url}
          />
        ) : (
          <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-outline-variant">child_care</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center gap-base">
        <span className="inline-flex items-center gap-1 text-primary font-label-md text-label-md">
          <span className="material-symbols-outlined text-sm" data-icon="event" style={{ fontSize: 16 }}>
            event
          </span>
          {milestone.achieved && milestone.achieved_date
            ? formatDate(milestone.achieved_date)
            : "Upcoming"}
        </span>

        <h3 className="font-headline-sm text-headline-sm text-primary">
          {milestone.title}
        </h3>

        {milestone.notes && (
          <p className="text-on-surface-variant italic text-body-sm">
            &ldquo;{milestone.notes}&rdquo;
          </p>
        )}

        <div className="mt-2 flex gap-2 flex-wrap items-center">
          <span className="px-3 py-1 bg-primary-container/20 text-on-primary-container rounded-full text-[10px] font-bold uppercase tracking-wider">
            {labels.primary}
          </span>
          {hasSecondary && (
            <span className="px-3 py-1 bg-tertiary-container/20 text-on-tertiary-container rounded-full text-[10px] font-bold uppercase tracking-wider">
              {labels.secondary}
            </span>
          )}
          {!milestone.achieved && showActions && (
            <div className="flex gap-2 ml-auto">
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

      <div className="absolute -left-11 top-6 w-6 h-6 rounded-full bg-primary border-4 border-surface shadow-sm z-10" />
    </div>
  )
}

MilestoneCard.displayName = "MilestoneCard"

export { MilestoneCard }
export type { MilestoneCardProps }
