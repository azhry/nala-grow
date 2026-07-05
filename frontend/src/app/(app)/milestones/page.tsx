"use client"

import { useState, useMemo, useCallback } from "react"
import { useAppStore } from "@/lib/store"
import type { Milestone, MilestoneCategory, MilestoneAgeRange } from "@/lib/store"
import { MILESTONE_DEFINITIONS } from "@/lib/store"
import {
  MilestoneCategoryChips,
  MilestoneTimeline,
  MilestoneProgress,
  UpcomingMilestones,
  MilestoneForm,
} from "@/components/milestones"
import { FAB } from "@/components/ui"

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function MilestonesPage() {
  const activeBaby = useAppStore((s) => s.activeBaby)
  const milestones = useAppStore((s) => s.milestones)
  const addMilestone = useAppStore((s) => s.addMilestone)
  const updateMilestone = useAppStore((s) => s.updateMilestone)
  const deleteMilestone = useAppStore((s) => s.deleteMilestone)

  const babyId = activeBaby?.id ?? "sample"
  const babyName = activeBaby?.name ?? "Lily"
  const babyDob = activeBaby?.dob ?? ""

  const [categoryFilter, setCategoryFilter] = useState<MilestoneCategory | "all">("all")
  const [showForm, setShowForm] = useState(false)

  const babyMilestones = useMemo(
    () => milestones.filter((m) => m.baby_id === babyId),
    [milestones, babyId],
  )

  const seededMilestones = useMemo(() => {
    const existing = new Map(babyMilestones.map((m) => [m.definition_id, m]))
    const result: Milestone[] = []

    for (const def of MILESTONE_DEFINITIONS) {
      const existing_m = existing.get(def.id)
      if (existing_m) {
        result.push(existing_m)
      } else {
        result.push({
          id: `def-${def.id}`,
          baby_id: babyId,
          definition_id: def.id,
          title: def.title,
          category: def.category,
          age_range: def.age_range,
          achieved: false,
          is_custom: false,
        })
      }
    }

    const customMilestones = babyMilestones.filter((m) => m.is_custom)
    result.push(...customMilestones)

    return result
  }, [babyMilestones, babyId])

  const filteredSeeded = useMemo(
    () =>
      categoryFilter === "all"
        ? seededMilestones
        : seededMilestones.filter((m) => m.category === categoryFilter),
    [seededMilestones, categoryFilter],
  )

  const achievedCount = useMemo(
    () => seededMilestones.filter((m) => m.achieved).length,
    [seededMilestones],
  )

  const handleAchieve = useCallback(
    (id: string) => {
      const now = new Date().toISOString()
      const existing = babyMilestones.find(
        (m) => m.id === id || m.definition_id === id,
      )

      if (existing) {
        updateMilestone(existing.id, { achieved: true, achieved_date: now })
      } else {
        const def = MILESTONE_DEFINITIONS.find((d) => d.id === id)
        if (def) {
          addMilestone({
            id: generateId(),
            baby_id: babyId,
            definition_id: def.id,
            title: def.title,
            category: def.category,
            age_range: def.age_range,
            achieved: true,
            achieved_date: now,
            is_custom: false,
          })
        }
      }
    },
    [babyMilestones, babyId, addMilestone, updateMilestone],
  )

  const handleDelete = useCallback(
    (id: string) => {
      deleteMilestone(id)
    },
    [deleteMilestone],
  )

  const handleCustomSave = useCallback(
    (data: { title: string; category: MilestoneCategory; age_range: MilestoneAgeRange; notes?: string }) => {
      addMilestone({
        id: generateId(),
        baby_id: babyId,
        title: data.title,
        category: data.category,
        age_range: data.age_range,
        achieved: false,
        notes: data.notes,
        is_custom: true,
      })
      setShowForm(false)
    },
    [babyId, addMilestone],
  )

  return (
    <div className="pb-stack-lg">
      <div className="px-container-margin md:px-stack-lg py-stack-md max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-stack-lg">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary">Milestones</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Track {babyName}&apos;s developmental milestones.
            </p>
          </div>
          <div className="flex items-center gap-base">
            <button
              type="button"
              className="p-3 bg-white rounded-full soft-shadow text-primary hover:bg-primary-container/10 transition-colors"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="w-10 h-10 rounded-full border-2 border-primary-container overflow-hidden soft-shadow bg-primary-container/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">child_care</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-md">
          <div className="lg:col-span-8 space-y-stack-md">
            <MilestoneProgress achieved={achievedCount} total={MILESTONE_DEFINITIONS.length} />

            <section className="bg-white rounded-2xl p-stack-md soft-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-stack-md">
                <h3 className="font-headline-md text-headline-md text-primary">
                  Milestone Timeline
                </h3>
                <MilestoneCategoryChips
                  selected={categoryFilter}
                  onChange={setCategoryFilter}
                />
              </div>

              <MilestoneTimeline
                milestones={filteredSeeded}
                onAchieve={handleAchieve}
                onDelete={handleDelete}
              />
            </section>
          </div>

          <div className="lg:col-span-4 space-y-stack-md">
            <section className="bg-white rounded-2xl p-stack-md soft-shadow">
              {showForm ? (
                <div>
                  <div className="flex items-center justify-between mb-stack-md">
                    <h3 className="font-headline-md text-headline-md text-primary">
                      Custom Milestone
                    </h3>
                  </div>
                  <MilestoneForm
                    onSave={handleCustomSave}
                    onCancel={() => setShowForm(false)}
                  />
                </div>
              ) : (
                <div>
                  <UpcomingMilestones
                    milestones={babyMilestones}
                    babyDob={babyDob || undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="w-full mt-4 py-4 bg-surface-container-high text-primary rounded-2xl font-headline-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">add_circle</span>
                    Add Custom Milestone
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <FAB icon="add" onClick={() => setShowForm(true)} />
    </div>
  )
}
