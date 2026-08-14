import { fetchBabies } from "./baby-service"
import { useAppStore, type BabyProfile } from "./store"

export const PROFILE_LOOKUP_ERROR_MESSAGE =
  "We couldn’t check your baby profiles. Please try again."

export class ProfileLookupError extends Error {
  constructor() {
    super(PROFILE_LOOKUP_ERROR_MESSAGE)
    this.name = "ProfileLookupError"
  }
}

export function isProfileLookupError(error: unknown): error is ProfileLookupError {
  return error instanceof ProfileLookupError ||
    (error instanceof Error && error.name === "ProfileLookupError")
}

const PROTECTED_REDIRECTS = [
  "/dashboard",
  "/feeding",
  "/sleep",
  "/milestones",
  "/profile",
]

export function getSafeRedirect(redirect: string | null): string {
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) {
    return "/dashboard"
  }

  const pathname = redirect.split(/[?#]/)[0]
  const isProtected = PROTECTED_REDIRECTS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )

  return isProtected ? redirect : "/dashboard"
}

/**
 * Resolve the authenticated user's baby profiles and seed the shared store.
 * A rejected babies query is intentionally allowed to throw so callers can
 * keep the lookup in an explicit error/retry state instead of treating it as
 * an empty profile list.
 */
export async function bootstrapProfiles(): Promise<BabyProfile[]> {
  const profiles = await fetchBabies()
  const { setBabies, setActiveBaby } = useAppStore.getState()

  setBabies(profiles)
  setActiveBaby(profiles[0] ?? null)

  return profiles
}

export async function getPostAuthDestination(
  redirect: string | null,
): Promise<string> {
  try {
    const profiles = await bootstrapProfiles()
    return profiles.length === 0 ? "/profile/create" : getSafeRedirect(redirect)
  } catch {
    throw new ProfileLookupError()
  }
}
