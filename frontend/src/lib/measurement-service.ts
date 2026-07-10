"use client"

import {
  getMeasurements as gqlGetMeasurements,
  createMeasurement as gqlCreateMeasurement,
  updateMeasurement as gqlUpdateMeasurement,
  deleteMeasurement as gqlDeleteMeasurement,
} from "./graphql-client"
import type { Measurement } from "./graphql-types"
import { useAppStore } from "./store"
import type { Measurement as StoreMeasurement } from "./store"

function toStoreMeasurement(m: Measurement): StoreMeasurement {
  return {
    id: m.id,
    baby_id: m.babyId,
    date: m.date,
    weight_kg: m.weight || undefined,
    height_cm: m.height || undefined,
    head_cm: m.headCircumference || undefined,
  }
}

export async function fetchMeasurements(
  babyId: string,
): Promise<StoreMeasurement[]> {
  const results = await gqlGetMeasurements(babyId)
  const mapped = results.map(toStoreMeasurement)
  useAppStore.getState().setMeasurements(mapped)
  return mapped
}

export async function createMeasurement(
  data: Partial<StoreMeasurement>,
): Promise<StoreMeasurement> {
  const result = await gqlCreateMeasurement({
    babyId: data.baby_id || "",
    date: data.date,
    weight: data.weight_kg,
    height: data.height_cm,
    headCircumference: data.head_cm,
  })
  const store = toStoreMeasurement(result)
  useAppStore.getState().addMeasurement(store)
  return store
}

export async function updateMeasurement(
  id: string,
  data: Partial<StoreMeasurement>,
): Promise<StoreMeasurement> {
  const result = await gqlUpdateMeasurement(id, {
    date: data.date,
    weight: data.weight_kg,
    height: data.height_cm,
    headCircumference: data.head_cm,
  })
  const store = toStoreMeasurement(result)
  useAppStore.getState().updateMeasurement(id, store)
  return store
}

export async function deleteMeasurement(id: string): Promise<void> {
  await gqlDeleteMeasurement(id)
  useAppStore.getState().deleteMeasurement(id)
}
