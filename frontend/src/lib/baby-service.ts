import type { BabyProfile } from "./store"
import { apiFetch } from "./api-client"

export type { BabyProfile }

export async function fetchBabies(): Promise<BabyProfile[]> {
  return apiFetch<BabyProfile[]>("/babies")
}

export async function createBaby(
  data: Omit<BabyProfile, "id">,
): Promise<BabyProfile> {
  return apiFetch<BabyProfile>("/babies", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateBaby(
  id: string,
  data: Partial<Omit<BabyProfile, "id">>,
): Promise<BabyProfile> {
  return apiFetch<BabyProfile>(`/babies/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteBaby(id: string): Promise<void> {
  await apiFetch(`/babies/${id}`, { method: "DELETE" })
}
