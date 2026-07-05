"use client"

import type { MilestoneCategory } from "@/lib/store"

interface MilestoneCategoryChipsProps {
  selected: MilestoneCategory | "all"
  onChange: (category: MilestoneCategory | "all") => void
}

const categories: { value: MilestoneCategory | "all"; label: string; icon: string }[] = [
  { value: "all", label: "All", icon: "filter_list" },
  { value: "physical", label: "Physical", icon: "self_improvement" },
  { value: "cognitive", label: "Cognitive", icon: "psychology" },
  { value: "social", label: "Social", icon: "diversity_3" },
  { value: "language", label: "Language", icon: "record_voice_over" },
]

const activeColors: Record<string, string> = {
  all: "bg-primary text-on-primary",
  physical: "bg-accent-coral text-white",
  cognitive: "bg-tertiary text-on-tertiary",
  social: "bg-secondary text-on-secondary",
  language: "bg-primary-container text-on-primary-container",
}

const inactiveColors =
  "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"

function MilestoneCategoryChips({ selected, onChange }: MilestoneCategoryChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => (
        <button
          key={cat.value}
          type="button"
          onClick={() => onChange(cat.value)}
          className={[
            "inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-label-md text-label-md transition-colors active:scale-[0.98]",
            selected === cat.value ? activeColors[cat.value] : inactiveColors,
          ].join(" ")}
        >
          <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
          {cat.label}
        </button>
      ))}
    </div>
  )
}

MilestoneCategoryChips.displayName = "MilestoneCategoryChips"

export { MilestoneCategoryChips }
export type { MilestoneCategoryChipsProps }
