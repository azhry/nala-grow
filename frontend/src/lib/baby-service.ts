/**
 * @deprecated Use graphql-client.ts directly instead. This file is a
 * compatibility shim that will be removed in FE-016.
 *
 * Wraps graphql-client functions with backward-compatible snake_case → camelCase
 * field mapping so existing pages continue to work until FE-015.
 */

import {
  getBabies as gqlGetBabies,
  createBaby as gqlCreateBaby,
  updateBaby as gqlUpdateBaby,
  deleteBaby as gqlDeleteBaby,
} from "./graphql-client"
import type { BabyInput } from "./graphql-types"
import type { BabyProfile as GraphQLBabyProfile } from "./graphql-types"
import type { BabyProfile as StoreBabyProfile } from "./store"

export type { StoreBabyProfile as BabyProfile }

function toStoreBabyProfile(profile: GraphQLBabyProfile): StoreBabyProfile {
  return {
    id: profile.id,
    name: profile.name,
    dob: profile.dob,
    sex: profile.sex as StoreBabyProfile["sex"],
    photo_url: profile.photoUrl || undefined,
  }
}

export async function fetchBabies(): Promise<StoreBabyProfile[]> {
  const profiles = await gqlGetBabies()
  return profiles.map(toStoreBabyProfile)
}

/**
 * Backward-compatible createBaby wrapper.
 * Accepts both snake_case (legacy) and camelCase fields.
 */
export async function createBaby(
  data: Record<string, unknown>
): Promise<StoreBabyProfile> {
  const input: BabyInput = {
    name: data.name as string,
    dob: data.dob as string | undefined,
    sex: data.sex as string | undefined,
    photoUrl: (data.photoUrl ?? data.photo_url) as string | undefined,
  }
  const result = await gqlCreateBaby(input)
  return toStoreBabyProfile(result)
}

/**
 * Backward-compatible updateBaby wrapper.
 * Accepts both snake_case (legacy) and camelCase fields.
 */
export async function updateBaby(
  id: string,
  data: Record<string, unknown>
): Promise<StoreBabyProfile> {
  const input: Partial<BabyInput> = {}
  if (data.name) input.name = data.name as string
  if (data.dob) input.dob = data.dob as string
  if (data.sex) input.sex = data.sex as string
  if (data.photoUrl ?? data.photo_url)
    input.photoUrl = (data.photoUrl ?? data.photo_url) as string
  const result = await gqlUpdateBaby(id, input)
  return toStoreBabyProfile(result)
}

export async function deleteBaby(
  id: string
): Promise<StoreBabyProfile> {
  const result = await gqlDeleteBaby(id)
  return toStoreBabyProfile(result)
}

// Underscore-prefixed names for explicit migration (used by FE-015)
export const createBaby_ = gqlCreateBaby
export const updateBaby_ = gqlUpdateBaby
export const deleteBaby_ = gqlDeleteBaby
