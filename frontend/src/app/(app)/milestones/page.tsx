"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useAppStore } from "@/lib/store"
import type { Milestone, MilestoneCategory, MilestoneAgeRange } from "@/lib/store"
import { MILESTONE_DEFINITIONS } from "@/lib/store"
import {
  createMilestone,
  updateMilestone as updateMilestoneApi,
  deleteMilestone as deleteMilestoneApi,
  fetchMilestones,
} from "@/lib/milestone-service"
import {
  MilestoneTimeline,
  MilestoneProgress,
  UpcomingMilestones,
  MilestoneForm,
} from "@/components/milestones"
import { FAB } from "@/components/ui"

const ageRangeLabels: Record<MilestoneAgeRange, string> = {
  "0-3": "0–3 Months",
  "3-6": "3–6 Months",
  "6-12": "6–12 Months",
  "12-24": "12–24 Months",
}

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function MilestonesPage() {
  const activeBaby = useAppStore((s) => s.activeBaby)
  const milestones = useAppStore((s) => s.milestones)
  const addMilestone = useAppStore((s) => s.addMilestone)
  const updateMilestone = useAppStore((s) => s.updateMilestone)
  const deleteMilestone = useAppStore((s) => s.deleteMilestone)
  const setMilestones = useAppStore((s) => s.setMilestones)

  useEffect(() => {
    if (activeBaby?.id) {
      fetchMilestones(activeBaby.id).catch(() => {})
    }
  }, [activeBaby?.id, setMilestones])

  const babyId = activeBaby?.id ?? "sample"
  const babyName = activeBaby?.name ?? "Lily"
  const babyDob = activeBaby?.dob ?? ""

  const [ageFilter, setAgeFilter] = useState<MilestoneAgeRange | "all">("all")
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
      ageFilter === "all"
        ? seededMilestones
        : seededMilestones.filter((m) => m.age_range === ageFilter),
    [seededMilestones, ageFilter],
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
        updateMilestoneApi(existing.id, {
          achieved: true,
          achieved_date: now,
          title: existing.title,
        }).catch(() => {
          updateMilestone(existing.id, { achieved: true, achieved_date: now })
        })
      } else {
        const def = MILESTONE_DEFINITIONS.find((d) => d.id === id)
        if (def) {
          createMilestone({
            baby_id: babyId,
            title: def.title,
            category: def.category,
            achieved: true,
            achieved_date: now,
            is_custom: false,
          }).catch(() => {
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
          })
        }
      }
    },
    [babyMilestones, babyId, addMilestone, updateMilestone],
  )

  const handleDelete = useCallback(
    (id: string) => {
      deleteMilestoneApi(id).catch(() => {
        deleteMilestone(id)
      })
    },
    [deleteMilestone],
  )

  const handleCustomSave = useCallback(
    (data: { title: string; category: MilestoneCategory; age_range: MilestoneAgeRange; notes?: string }) => {
      createMilestone({
        baby_id: babyId,
        title: data.title,
        category: data.category,
        is_custom: true,
        notes: data.notes,
      }).catch(() => {
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
            <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
              Milestones &amp; Development
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Track {babyName}&apos;s developmental milestones.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-primary-container/20 transition-colors"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-primary">notifications</span>
            </button>
            <div className="w-8 h-8 rounded-full overflow-hidden md:hidden">
              <div className="w-full h-full bg-primary-container/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">child_care</span>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-md">
          <div className="lg:col-span-8 space-y-stack-md">
            <MilestoneProgress achieved={achievedCount} total={MILESTONE_DEFINITIONS.length} />

            <section className="flex flex-col gap-stack-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-headline-sm text-headline-sm text-on-surface-variant">
                  Choose Age Range
                </h3>
                <button className="text-primary font-label-md text-label-md underline">
                  View Developmental Guidelines
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 -mx-2 px-2">
                {(["all", "0-3", "3-6", "6-12", "12-24"] as const).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setAgeFilter(range)}
                    className={[
                      "flex-shrink-0 px-6 py-3 rounded-full font-label-md text-label-md transition-colors",
                      ageFilter === range
                        ? "bg-primary text-on-primary font-bold shadow-md scale-105"
                        : "bg-surface-container-highest text-on-surface-variant hover:bg-primary-container/20",
                    ].join(" ")}
                  >
                    {range === "all" ? "All" : ageRangeLabels[range]}
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-2xl p-stack-md soft-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-stack-md">
                <h3 className="font-headline-md text-headline-md text-primary">
                  Milestone Timeline
                </h3>
              </div>

              <MilestoneTimeline
                milestones={filteredSeeded}
                onAchieve={handleAchieve}
                onDelete={handleDelete}
              />
            </section>
          </div>

          <div className="lg:col-span-4 space-y-stack-md">
            <section className="bg-surface-container-high rounded-3xl p-stack-md flex flex-col gap-stack-md sticky top-24">
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
