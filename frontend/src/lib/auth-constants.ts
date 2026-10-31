export const AUTH_TOKEN_KEY = "nalagrow-token"
export const AUTH_SESSION_KEY = "nalagrow-session"
export const AUTH_SESSION_EXPIRY_KEY = "nalagrow-session-expires-at"
export const AUTH_OAUTH_STATE_KEY = "nalagrow-casdoor-oauth-state"

export const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export function isSessionExpired(expiresAt: number | string | null | undefined): boolean {
  if (expiresAt === null || expiresAt === undefined || expiresAt === "") {
    return false
  }

  const timestamp = typeof expiresAt === "string" ? Number(expiresAt) : expiresAt
  return !Number.isFinite(timestamp) || timestamp <= Date.now()
}

export function hasValidSessionCookie(
  token: string | undefined,
  expiresAt: string | undefined,
): boolean {
  return Boolean(token) && !isSessionExpired(expiresAt)
}
