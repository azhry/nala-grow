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
  const achieved = milestones.filter((m) => m.achieved)
  const upcoming = milestones.filter((m) => !m.achieved)

  const babyRange = babyDob ? getBabyAgeRange(babyDob) : null

  const achievedDefs = achieved
    .map((m) => MILESTONE_DEFINITIONS.find((d) => d.id === m.definition_id))
    .filter(Boolean)

  const upcomingDefs = upcoming
    .map((m) => {
      if (m.is_custom) return { id: m.id, title: m.title, category: m.category, age_range: m.age_range }
      return MILESTONE_DEFINITIONS.find((d) => d.id === m.definition_id)
    })
    .filter(Boolean)

  const ranges: MilestoneAgeRange[] = ["0-3", "3-6", "6-12", "12-24"]

  const achievedGrouped = ranges.reduce(
    (acc, range) => {
      acc[range] = achievedDefs.filter((d) => d && d.age_range === range) as typeof achievedDefs
      return acc
    },
    {} as Record<MilestoneAgeRange, typeof achievedDefs>,
  )

  const upcomingGrouped = ranges.reduce(
    (acc, range) => {
      acc[range] = upcomingDefs.filter((d) => d && d.age_range === range) as typeof upcomingDefs
      return acc
    },
    {} as Record<MilestoneAgeRange, typeof upcomingDefs>,
  )

  const hasAny = ranges.some((r) => achievedGrouped[r].length > 0 || upcomingGrouped[r].length > 0)

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
        <h3 className="font-headline-md text-headline-md text-primary">Current Goals</h3>
      </div>

      <div className="flex flex-col gap-3">
        {ranges.map((range) => {
          const achievedItems = achievedGrouped[range]
          const upcomingItems = upcomingGrouped[range]
          if (achievedItems.length === 0 && upcomingItems.length === 0) return null

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
                {achievedItems.map((def) => (
                  <div
                    key={def.id}
                    className="bg-white p-4 rounded-2xl flex items-center gap-4 border border-primary/10 shadow-sm opacity-70"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined fill-1">check</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-on-surface">{def.title}</p>
                      <p className="text-xs text-on-surface-variant">Achieved</p>
                    </div>
                  </div>
                ))}

                {upcomingItems.map((def) => (
                  <div
                    key={def.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/50 hover:border-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                      {categoryIcons[def.category]}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface flex-1">
                      {def.title}
                    </span>
                    <span className="material-symbols-outlined text-outline-variant text-[16px]">
                      chevron_right
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
