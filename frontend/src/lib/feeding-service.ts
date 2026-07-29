"use client"

import {
  getFeedingSessions as gqlGetFeedingSessions,
  createFeedingSession as gqlCreateFeedingSession,
  deleteFeedingSession as gqlDeleteFeedingSession,
  updateFeedingSession as gqlUpdateFeedingSession,
} from "./graphql-client"
import type { FeedingSession } from "./graphql-types"
import { useAppStore } from "./store"
import type { FeedSession as StoreFeedSession, FeedType } from "./store"

function toStoreFeedSession(s: FeedingSession): StoreFeedSession {
  return {
    id: s.id,
    baby_id: s.babyId,
    feed_type: s.feedType as FeedType,
    started_at: s.startedAt,
    ended_at: s.endedAt || undefined,
    left_duration_sec: s.leftDurationSec || undefined,
    right_duration_sec: s.rightDurationSec || undefined,
    amount_ml: s.amountMl || undefined,
    milk_type: (s.milkType as StoreFeedSession["milk_type"]) || undefined,
    temperature: (s.temperature as StoreFeedSession["temperature"]) || undefined,
    food_name: s.foodName || undefined,
    quantity: s.quantity ?? undefined,
    quantity_unit: s.quantityUnit || undefined,
    reaction: (s.reaction as StoreFeedSession["reaction"]) || undefined,
    notes: s.notes || undefined,
  }
}

export async function fetchFeedSessions(
  babyId: string,
): Promise<StoreFeedSession[]> {
  const results = await gqlGetFeedingSessions(babyId)
  const mapped = results.map(toStoreFeedSession)
  useAppStore.getState().setFeedSessions(mapped)
  return mapped
}

export async function createFeedSession(
  data: Partial<StoreFeedSession>,
): Promise<StoreFeedSession> {
  const result = await gqlCreateFeedingSession({
    babyId: data.baby_id || "",
    feedType: data.feed_type || "",
    startedAt: data.started_at,
    endedAt: data.ended_at,
    leftDurationSec: data.left_duration_sec,
    rightDurationSec: data.right_duration_sec,
    amountMl: data.amount_ml,
    milkType: data.milk_type,
    temperature: data.temperature,
    foodName: data.food_name,
    quantity: data.quantity,
    quantityUnit: data.quantity_unit,
    reaction: data.reaction,
    notes: data.notes,
  })
  const store = toStoreFeedSession(result)
  useAppStore.getState().addFeedSession(store)
  return store
}

export async function deleteFeedSession(id: string): Promise<void> {
  await gqlDeleteFeedingSession(id)
  useAppStore.getState().deleteFeedSession(id)
}

export async function updateFeedSession(
  id: string,
  data: Partial<StoreFeedSession>,
): Promise<void> {
  await gqlUpdateFeedingSession(id, {
    feedType: data.feed_type,
    startedAt: data.started_at,
    endedAt: data.ended_at,
    leftDurationSec: data.left_duration_sec,
    rightDurationSec: data.right_duration_sec,
    amountMl: data.amount_ml,
    milkType: data.milk_type,
    temperature: data.temperature,
    foodName: data.food_name,
    quantity: data.quantity,
    quantityUnit: data.quantity_unit,
    reaction: data.reaction,
    notes: data.notes,
  })
  useAppStore.getState().updateFeedSession(id, data)
}
