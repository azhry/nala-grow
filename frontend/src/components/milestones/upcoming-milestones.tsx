"use client"

import type { Milestone, MilestoneAgeRange, MilestoneCategory } from "@/lib/store"
import { MILESTONE_DEFINITIONS } from "@/lib/store"

interface UpcomingMilestonesProps {
  milestones: Milestone[]
  babyDob?: string
}

const categoryIcons: Record<MilestoneCategory, string> = {
  physical: "self_improvement",
  cognitive: "psychology",
  social: "diversity_3",
  language: "record_voice_over",
}

const ageRangeLabels: Record<MilestoneAgeRange, string> = {
  "0-3": "0–3 Months",
  "3-6": "3–6 Months",
  "6-12": "6–12 Months",
  "12-24": "12–24 Months",
}

function getBabyAgeRange(dob: string): MilestoneAgeRange | null {
  try {
    const birth = new Date(dob)
    const now = new Date()
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
    if (months < 0) return null
    if (months < 3) return "0-3"
    if (months < 6) return "3-6"
    if (months < 12) return "6-12"
    if (months < 24) return "12-24"
    return "12-24"
  } catch {
    return null
  }
}

function UpcomingMilestones({ milestones, babyDob }: UpcomingMilestonesProps) {
  const achievedIds = new Set(
    milestones.filter((m) => m.achieved).map((m) => m.definition_id).filter(Boolean),
  )

  const babyRange = babyDob ? getBabyAgeRange(babyDob) : null

  const upcoming = MILESTONE_DEFINITIONS.filter((def) => !achievedIds.has(def.id))

  const ranges: MilestoneAgeRange[] = ["0-3", "3-6", "6-12", "12-24"]

  const grouped = ranges.reduce(
    (acc, range) => {
      acc[range] = upcoming.filter((d) => d.age_range === range)
      return acc
    },
    {} as Record<MilestoneAgeRange, typeof MILESTONE_DEFINITIONS>,
  )

  const hasAny = ranges.some((r) => grouped[r].length > 0)

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant">
        <span className="material-symbols-outlined text-4xl mb-3">celebration</span>
        <p className="font-body-md text-body-md">All milestones achieved!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">trending_up</span>
        <h3 className="font-headline-md text-headline-md text-primary">Upcoming Milestones</h3>
      </div>

      {ranges.map((range) => {
        const items = grouped[range]
        if (items.length === 0) return null

        const isCurrentRange = babyRange === range
        const isPastRange = babyRange && ranges.indexOf(range) < ranges.indexOf(babyRange)
        const isFutureRange = babyRange && ranges.indexOf(range) > ranges.indexOf(babyRange)

        return (
          <div
            key={range}
            className={[
              "rounded-xl p-gutter",
              isCurrentRange ? "bg-primary-container/10 border border-primary/20" : "bg-surface-container-low",
            ].join(" ")}
          >
            <div className="flex items-center gap-2 mb-2">
              {isPastRange && <span className="material-symbols-outlined text-on-surface-variant text-sm">check_circle</span>}
              {isCurrentRange && <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />}
              <h4 className={[
                "font-label-md text-label-md",
                isPastRange ? "text-on-surface-variant" : "text-primary",
              ].join(" ")}>
                {ageRangeLabels[range]}
              </h4>
            </div>
            <div className="space-y-1.5">
              {items.map((def) => (
                <div
                  key={def.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/50"
                >
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                    {categoryIcons[def.category]}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface">
                    {def.title}
                  </span>
                </div>
              ))}
            </div>
            {isFutureRange && (
              <p className="font-label-md text-label-md text-on-surface-variant mt-2">
                Coming up next
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

UpcomingMilestones.displayName = "UpcomingMilestones"

export { UpcomingMilestones }
export type { UpcomingMilestonesProps }
