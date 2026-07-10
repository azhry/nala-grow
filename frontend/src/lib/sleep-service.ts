"use client"

import {
  getSleepSessions as gqlGetSleepSessions,
  createSleepSession as gqlCreateSleepSession,
  updateSleepSession as gqlUpdateSleepSession,
  deleteSleepSession as gqlDeleteSleepSession,
} from "./graphql-client"
import type { SleepSession } from "./graphql-types"
import { useAppStore } from "./store"
import type { SleepSession as StoreSleepSession, SleepLocation } from "./store"

function toStoreSleepSession(s: SleepSession): StoreSleepSession {
  return {
    id: s.id,
    baby_id: s.babyId,
    started_at: s.startedAt,
    ended_at: s.endedAt || undefined,
    location: (s.location as SleepLocation) || undefined,
    notes: s.notes || undefined,
  }
}

export async function fetchSleepSessions(
  babyId: string,
): Promise<StoreSleepSession[]> {
  const results = await gqlGetSleepSessions(babyId)
  const mapped = results.map(toStoreSleepSession)
  useAppStore.getState().setSleepSessions(mapped)
  return mapped
}

export async function createSleepSession(
  data: Partial<StoreSleepSession>,
): Promise<StoreSleepSession> {
  const result = await gqlCreateSleepSession({
    babyId: data.baby_id || "",
    startedAt: data.started_at,
    endedAt: data.ended_at,
    location: data.location,
    notes: data.notes,
  })
  const store = toStoreSleepSession(result)
  useAppStore.getState().addSleepSession(store)
  return store
}

export async function updateSleepSession(
  id: string,
  data: Partial<StoreSleepSession>,
): Promise<StoreSleepSession> {
  const result = await gqlUpdateSleepSession(id, {
    startedAt: data.started_at,
    endedAt: data.ended_at,
    location: data.location,
    notes: data.notes,
  })
  const store = toStoreSleepSession(result)
  useAppStore.getState().updateSleepSession(id, store)
  return store
}

export async function deleteSleepSession(id: string): Promise<void> {
  await gqlDeleteSleepSession(id)
  useAppStore.getState().deleteSleepSession(id)
}
