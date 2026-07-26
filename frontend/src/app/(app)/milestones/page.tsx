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

const JOURNEY_CARDS: Milestone[] = [
  {
    id: "journey-1",
    baby_id: "sample",
    definition_id: "journey-1",
    title: "The Very First Smile",
    category: "social",
    age_range: "0-3",
    achieved: true,
    achieved_date: "2023-10-12",
    notes: "We were singing the morning song and Lily gave us the biggest, brightest gummy smile! It melted our hearts completely.",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDkMVqCflDXBExLNx0tJyW__uPJ2XAFC-lSu16AjbteC0QIQ-BHurfuv7QuWGg_0vl6P66qN2SU33a1hAiqgO5UIDapp5dWtPpSQqPREP2BejhDcCCGHs00KuJsZKMdw-h-cohvhkSf-80bMzDYJdZjaSbApEgHUNc5mDlmR7ZW2_8JBIpCmgEoU4D0t4nlHXak0t6rv7Pk1J6yQSuzYuomN8XWbJtxFUh4pLDzDGBHrL7264bz7BfXs24Y4rpW6cpbEI32l4pPWfU",
    is_custom: false,
  },
  {
    id: "journey-2",
    baby_id: "sample",
    definition_id: "journey-2",
    title: "Rolling Like a Pro",
    category: "physical",
    age_range: "3-6",
    achieved: true,
    achieved_date: "2023-11-28",
    notes: "Finally did it! Tummy time turned into a full rotation. She looked so surprised herself!",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBxYfFlw2qma4MN0_Hy6KleKOP5040YNL67i_4g2ZhNMKa18kDiTdYr2hpalsuQqZYCWRuTlC2QCZUxfmOGG4L0lK9nGTuYMkgGIa8kDipRL3ndDuGg6ocJgmeAHKf-YG-5wg8L11Myfj1_gw0-XiIsahAS4OTr5v-wGETaJtvdWY1nuDSSAVL5eB2jg8NJ3pQjmOLtSUhkAjJDaSSqv31u8xf3NqoRP4s3IJLOjGhP8oMU5IQvSfWwlzitwjaYK1qgb7vx7L4Af6A",
    is_custom: false,
  },
]

const CURRENT_GOALS: Milestone[] = [
  {
    id: "goal-achieved",
    baby_id: "sample",
    definition_id: "goal-achieved",
    title: "First Smile",
    category: "social",
    age_range: "3-6",
    achieved: true,
    achieved_date: "2023-10-12",
    is_custom: false,
  },
  {
    id: "goal-upcoming-1",
    baby_id: "sample",
    definition_id: "goal-upcoming-1",
    title: "Sitting Up (Supported)",
    category: "physical",
    age_range: "3-6",
    achieved: false,
    is_custom: false,
  },
  {
    id: "goal-upcoming-2",
    baby_id: "sample",
    definition_id: "goal-upcoming-2",
    title: "Grasping Objects",
    category: "physical",
    age_range: "3-6",
    achieved: false,
    is_custom: false,
  },
  {
    id: "goal-upcoming-3",
    baby_id: "sample",
    definition_id: "goal-upcoming-3",
    title: "Babbles Back",
    category: "language",
    age_range: "3-6",
    achieved: false,
    is_custom: false,
  },
]

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

  const [ageFilter, setAgeFilter] = useState<MilestoneAgeRange | "all">("all")
  const [showForm, setShowForm] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [guidelinesOpen, setGuidelinesOpen] = useState(false)

  const babyMilestones = useMemo(
    () => milestones.filter((m) => m.baby_id === babyId),
    [milestones, babyId],
  )

  const isDemo = babyMilestones.length === 0

  const demoCurrentLabel = isDemo ? "4-6m" : undefined

  const [demoGoals, setDemoGoals] = useState<Milestone[]>(CURRENT_GOALS)
  const [demoJourneyCards, setDemoJourneyCards] = useState<Milestone[]>(JOURNEY_CARDS)

  const filteredDemoJourneyCards = useMemo(
    () =>
      ageFilter === "all"
        ? demoJourneyCards
        : demoJourneyCards.filter((m) => m.age_range === ageFilter),
    [demoJourneyCards, ageFilter],
  )

  const seededMilestones = useMemo(() => {
    if (isDemo) return JOURNEY_CARDS

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
  }, [babyMilestones, babyId, isDemo])

  const filteredSeeded = useMemo(
    () =>
      ageFilter === "all"
        ? seededMilestones
        : seededMilestones.filter((m) => m.age_range === ageFilter),
    [seededMilestones, ageFilter],
  )

  const handleToggleAchieve = useCallback(
    (id: string, achieved: boolean) => {
      const now = new Date().toISOString()
      if (isDemo) {
        setDemoGoals((prev) =>
          prev.map((m) =>
            m.id === id || m.definition_id === id
              ? {
                  ...m,
                  achieved,
                  achieved_date: achieved ? now : undefined,
                }
              : m,
          ),
        )
        setDemoJourneyCards((prev) =>
          prev.map((m) =>
            m.id === id || m.definition_id === id
              ? {
                  ...m,
                  achieved,
                  achieved_date: achieved ? now : undefined,
                }
              : m,
          ),
        )
        return
      }

      const existing = babyMilestones.find(
        (m) => m.id === id || m.definition_id === id,
      )

      const payload = achieved
        ? { achieved: true, achieved_date: now }
        : { achieved: false, achieved_date: undefined }

      if (existing) {
        updateMilestoneApi(existing.id, {
          ...payload,
          title: existing.title,
        }).catch(() => {
          updateMilestone(existing.id, payload)
        })
      } else if (achieved) {
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
    [babyMilestones, babyId, addMilestone, updateMilestone, isDemo],
  )

  const handleDelete = useCallback(
    (id: string) => {
      if (isDemo) {
        setDemoGoals((prev) => prev.filter((m) => m.id !== id))
        return
      }
      deleteMilestoneApi(id).catch(() => {
        deleteMilestone(id)
      })
    },
    [deleteMilestone, isDemo],
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

  const timelineMilestones = isDemo ? filteredDemoJourneyCards : filteredSeeded
  const upcomingMilestones = isDemo ? demoGoals : babyMilestones

  return (
    <div className="pb-stack-lg">
      <div className="max-w-6xl mx-auto px-container-margin py-stack-md flex flex-col gap-stack-lg">
<header className="flex justify-between items-center mb-stack-lg relative">
          <div>
            <h1 className="font-headline-md text-headline-md text-primary font-bold">
              Milestones &amp; Development
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Track {babyName}&apos;s developmental milestones.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setNotificationsOpen((open) => !open)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-primary-container/20 transition-colors"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-primary">notifications</span>
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-lg border border-outline-variant/20 p-4 z-20">
                <p className="font-headline-sm text-headline-sm text-on-surface">
                  Notifications
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                  No new notifications.
                </p>
              </div>
            )}
            <div className="w-8 h-8 rounded-full overflow-hidden md:hidden">
              <div className="w-full h-full bg-primary-container/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">child_care</span>
              </div>
            </div>
          </div>
        </header>

<div className="flex flex-col gap-stack-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-headline-sm text-on-surface-variant">
              Choose Age Range
            </h3>
            <button
              type="button"
              onClick={() => setGuidelinesOpen((open) => !open)}
              className="text-primary font-label-md text-label-md underline"
            >
              View Developmental Guidelines
            </button>
          </div>
          {guidelinesOpen && (
            <div className="bg-surface-container-low rounded-2xl p-4 space-y-3">
              <h4 className="font-headline-sm text-headline-sm text-primary">
                Developmental Guidelines
              </h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Milestones are based on CDC developmental guidelines. Every baby
                develops at their own pace — use these ranges as a general
                reference.
              </p>
              <div className="grid grid-cols-2 gap-3 text-label-md">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-[18px]">self_improvement</span>
                  <span>Physical: 0–24 months</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-[18px]">psychology</span>
                  <span>Cognitive: 0–24 months</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-[18px]">diversity_3</span>
                  <span>Social: 0–24 months</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-[18px]">record_voice_over</span>
                  <span>Language: 0–24 months</span>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 -mx-2 px-2">
            {(["all", "0-3", "3-6", "6-12", "12-24"] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setAgeFilter(range)}
                className={[
                  "flex-shrink-0 rounded-full font-label-md text-label-md transition-colors",
                  ageFilter === range
                    ? "px-8 py-3 bg-primary text-on-primary font-bold shadow-md scale-105"
                    : "px-6 py-3 bg-surface-container-highest text-on-surface-variant hover:bg-primary-container/20",
                ].join(" ")}
              >
                {range === "all" ? "All" : ageRangeLabels[range]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-stack-lg">
          <div className="lg:col-span-2 flex flex-col gap-stack-md">
            <div className="flex items-center gap-base">
              <span className="material-symbols-outlined text-primary">auto_awesome</span>
              <h2 className="font-headline-md text-headline-md">{babyName}&apos;s Journey</h2>
            </div>

            <MilestoneTimeline
              milestones={timelineMilestones}
              onToggleAchieve={handleToggleAchieve}
              onDelete={handleDelete}
            />
          </div>

          <div className="lg:col-span-1 space-y-stack-md">
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
                    milestones={upcomingMilestones}
                    currentLabel={demoCurrentLabel}
                    onToggleAchieve={handleToggleAchieve}
                    onDelete={handleDelete}
                    onAddCustom={() => setShowForm(true)}
                  />
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
