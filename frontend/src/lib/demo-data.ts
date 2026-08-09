import type { BabyProfile } from "@/lib/store"
import type { DemoData } from "@/lib/graphql-client"

export const DEMO_BABY_ID = "00000000-0000-0000-0000-000000000001"

let cachedDemoData: DemoData | null = null

export function setCachedDemoData(data: DemoData | null) {
  cachedDemoData = data
}

export function getCachedDemoData(): DemoData | null {
  return cachedDemoData
}

export function recordsForProfile<T extends { baby_id: string }>(
  activeBaby: BabyProfile | null,
  records: T[],
  demoRecords: T[],
  isLoggedIn: boolean,
): T[] {
  if (!activeBaby) {
    return isLoggedIn ? [] : demoRecords
  }
  return records.filter((record) => record.baby_id === activeBaby.id)
}
