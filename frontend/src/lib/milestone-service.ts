"use client"

import {
  getMilestones as gqlGetMilestones,
  createMilestone as gqlCreateMilestone,
  updateMilestone as gqlUpdateMilestone,
  deleteMilestone as gqlDeleteMilestone,
} from "./graphql-client"
import type { Milestone } from "./graphql-types"
import { useAppStore } from "./store"
import type {
  Milestone as StoreMilestone,
  MilestoneCategory,
  MilestoneAgeRange,
} from "./store"

function toStoreMilestone(m: Milestone): StoreMilestone {
  return {
    id: m.id,
    baby_id: m.babyId,
    title: m.title,
    category: m.category as MilestoneCategory,
    age_range: "0-3" as MilestoneAgeRange,
    achieved: !!m.achievedAt,
    achieved_date: m.achievedAt || undefined,
    notes: m.note || undefined,
    photo_url: m.photoUrl || undefined,
    is_custom: m.isCustom,
  }
}

export async function fetchMilestones(
  babyId: string,
): Promise<StoreMilestone[]> {
  const results = await gqlGetMilestones(babyId)
  const mapped = results.map(toStoreMilestone)
  useAppStore.getState().setMilestones(mapped)
  return mapped
}

export async function createMilestone(
  data: Partial<StoreMilestone>,
): Promise<StoreMilestone> {
  const result = await gqlCreateMilestone({
    babyId: data.baby_id || "",
    title: data.title || "",
    description: data.notes,
    category: data.category,
    achievedAt: data.achieved_date,
    note: data.notes,
    isCustom: data.is_custom,
  })
  const store = toStoreMilestone(result)
  useAppStore.getState().addMilestone(store)
  return store
}

export async function updateMilestone(
  id: string,
  data: Partial<StoreMilestone>,
): Promise<StoreMilestone> {
  const result = await gqlUpdateMilestone(id, {
    title: data.title,
    category: data.category,
    achievedAt: data.achieved_date,
    note: data.notes,
    isCustom: data.is_custom,
  })
  const store = toStoreMilestone(result)
  useAppStore.getState().updateMilestone(id, store)
  return store
}

export async function deleteMilestone(id: string): Promise<void> {
  await gqlDeleteMilestone(id)
  useAppStore.getState().deleteMilestone(id)
}
