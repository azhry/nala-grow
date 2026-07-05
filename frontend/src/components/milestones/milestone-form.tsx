"use client"

import { useState } from "react"
import type { MilestoneCategory, MilestoneAgeRange } from "@/lib/store"

interface MilestoneFormProps {
  onSave: (data: {
    title: string
    category: MilestoneCategory
    age_range: MilestoneAgeRange
    notes?: string
  }) => void
  onCancel: () => void
}

const categories: { value: MilestoneCategory; label: string; icon: string }[] = [
  { value: "physical", label: "Physical", icon: "self_improvement" },
  { value: "cognitive", label: "Cognitive", icon: "psychology" },
  { value: "social", label: "Social", icon: "diversity_3" },
  { value: "language", label: "Language", icon: "record_voice_over" },
]

const ageRanges: { value: MilestoneAgeRange; label: string }[] = [
  { value: "0-3", label: "0–3 Months" },
  { value: "3-6", label: "3–6 Months" },
  { value: "6-12", label: "6–12 Months" },
  { value: "12-24", label: "12–24 Months" },
]

function MilestoneForm({ onSave, onCancel }: MilestoneFormProps) {
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<MilestoneCategory>("physical")
  const [ageRange, setAgeRange] = useState<MilestoneAgeRange>("0-3")
  const [notes, setNotes] = useState("")

  const handleSave = () => {
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      category,
      age_range: ageRange,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="font-label-md text-label-md text-on-surface-variant">
          Milestone Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What did your baby achieve?"
          className="w-full h-field px-gutter bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 font-body-md text-body-md outline-none"
        />
      </div>

      <div className="space-y-2">
        <label className="font-label-md text-label-md text-on-surface-variant">
          Category
        </label>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={[
                "flex items-center gap-2 px-4 py-3 rounded-xl font-label-md text-label-md transition-all active:scale-[0.98]",
                category === cat.value
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-high text-on-surface-variant",
              ].join(" ")}
            >
              <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="font-label-md text-label-md text-on-surface-variant">
          Age Range
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ageRanges.map((range) => (
            <button
              key={range.value}
              type="button"
              onClick={() => setAgeRange(range.value)}
              className={[
                "px-4 py-3 rounded-xl font-label-md text-label-md transition-all active:scale-[0.98]",
                ageRange === range.value
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-high text-on-surface-variant",
              ].join(" ")}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="font-label-md text-label-md text-on-surface-variant">
          Notes <span className="text-on-surface-variant/60">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any observations about this milestone?"
          className="w-full h-20 p-gutter bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 font-body-md text-body-md resize-none outline-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-4 bg-surface-container-high text-on-surface-variant rounded-2xl font-headline-sm active:scale-[0.98] transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!title.trim()}
          className="flex-1 py-4 bg-primary text-white rounded-2xl font-headline-sm shadow-md hover:scale-[0.98] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Add Milestone
        </button>
      </div>
    </div>
  )
}

MilestoneForm.displayName = "MilestoneForm"

export { MilestoneForm }
export type { MilestoneFormProps }
