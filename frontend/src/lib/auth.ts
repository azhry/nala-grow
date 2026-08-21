"use client"

import { ApiError } from "./api-client"
import { useAppStore, type UserIdentity } from "./store"
import {
  login as gqlLogin,
  signup as gqlSignup,
  loginWithCasdoor as gqlLoginWithCasdoor,
  requestPasswordReset as gqlRequestPasswordReset,
  resetPassword as gqlResetPassword,
  getMe as gqlGetMe,
  refreshSession as gqlRefreshSession,
  setAuthToken,
  clearAuthToken,
} from "./graphql-client"
import { GraphQLError } from "./graphql-types"
import type { AuthResponse as GqlAuthResponse, AuthUser as GqlAuthUser } from "./graphql-types"
import {
  AUTH_OAUTH_STATE_KEY,
  AUTH_SESSION_EXPIRY_KEY,
  AUTH_SESSION_KEY,
  AUTH_TOKEN_KEY,
  DEFAULT_SESSION_MAX_AGE_SECONDS,
  isSessionExpired,
} from "./auth-constants"
import { getSafeRedirect } from "./profile-bootstrap"

export type AuthUser = UserIdentity

export interface AuthSession {
  user: AuthUser
  token: string
  expiresAt?: number
}

interface StoredAuthSession {
  token: string
  refreshToken?: string
  expiresAt?: number
}

interface CasdoorOAuthState {
  state: string
  redirect: string
}

// ─── Token/session persistence ──────────────────────────────────────────────

function getAuthCookie(): string | null {
  if (typeof document === "undefined") return null

  const prefix = `${AUTH_TOKEN_KEY}=`
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))

  if (!cookie) return null

  try {
    return decodeURIComponent(cookie.slice(prefix.length))
  } catch {
    return null
  }
}

function readStoredAuthSession(): StoredAuthSession | null {
  if (typeof window === "undefined") return null

  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredAuthSession>
      if (typeof parsed.token === "string" && parsed.token) {
        return {
          token: parsed.token,
          refreshToken:
            typeof parsed.refreshToken === "string" && parsed.refreshToken
              ? parsed.refreshToken
              : undefined,
          expiresAt:
            typeof parsed.expiresAt === "number" && Number.isFinite(parsed.expiresAt)
              ? parsed.expiresAt
              : undefined,
        }
      }
    }
  } catch {
    localStorage.removeItem(AUTH_SESSION_KEY)
  }

  const legacyToken = localStorage.getItem(AUTH_TOKEN_KEY)
  return legacyToken ? { token: legacyToken } : null
}

function setAuthCookie(token: string, expiresAt?: number): void {
  if (typeof document === "undefined") return

  const maxAge = expiresAt
    ? Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000))
    : DEFAULT_SESSION_MAX_AGE_SECONDS
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${AUTH_TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`
  if (expiresAt) {
    document.cookie = `${AUTH_SESSION_EXPIRY_KEY}=${expiresAt}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`
  } else {
    document.cookie = `${AUTH_SESSION_EXPIRY_KEY}=; path=/; max-age=0; SameSite=Lax${secure}`
  }
}

function clearAuthCookie(): void {
  if (typeof document === "undefined") return
  document.cookie = `${AUTH_TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`
  document.cookie = `${AUTH_SESSION_EXPIRY_KEY}=; path=/; max-age=0; SameSite=Lax`
}

function storeAuthSession(session: StoredAuthSession): void {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
  localStorage.setItem(AUTH_TOKEN_KEY, session.token)
  setAuthCookie(session.token, session.expiresAt)
  setAuthToken(session.token)
  useAppStore.getState().setToken(session.token)
}

function clearStoredToken(): void {
  localStorage.removeItem(AUTH_SESSION_KEY)
  localStorage.removeItem(AUTH_TOKEN_KEY)
  clearAuthCookie()
  clearAuthToken()
  useAppStore.getState().setToken(null)
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null

  const cookieToken = getAuthCookie()
  const storedSession = readStoredAuthSession()
  const token = cookieToken ?? storedSession?.token ?? null
  if (!token) return null

  const session = storedSession ?? { token }
  if (session.token !== token) {
    storeAuthSession({ ...session, token })
  } else {
    if (localStorage.getItem(AUTH_TOKEN_KEY) !== token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token)
      setAuthToken(token)
    }
    if (!cookieToken) setAuthCookie(token, session.expiresAt)
    if (useAppStore.getState().token !== token) {
      useAppStore.getState().setToken(token)
    }
  }

  return token
}

// ─── Internal helpers ──────────────────────────────────────────────────────

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "")
}

function mapGqlUserToAuthUser(gqlUser: GqlAuthUser): AuthUser {
  return {
    id: gqlUser.id,
    email: gqlUser.email,
    displayName: gqlUser.displayName ?? "",
    photoUrl: gqlUser.photoUrl ?? "",
    createdAt: gqlUser.createdAt ?? "",
    subject: gqlUser.subject ?? null,
    organization: gqlUser.organization ?? null,
    roles: stringArray(gqlUser.roles),
    permissions: stringArray(gqlUser.permissions),
  }
}

function expiresAtFromResponse(response: GqlAuthResponse): number | undefined {
  if (typeof response.expiresIn !== "number" || !Number.isFinite(response.expiresIn)) {
    return undefined
  }
  if (response.expiresIn <= 0) return Date.now()
  return Date.now() + response.expiresIn * 1000
}

function persistAuthResponse(
  response: GqlAuthResponse,
  previousRefreshToken?: string,
): AuthSession {
  const refreshToken =
    response.refreshToken === undefined
      ? previousRefreshToken
      : response.refreshToken || undefined
  const expiresAt = expiresAtFromResponse(response)
  storeAuthSession({
    token: response.token,
    ...(refreshToken ? { refreshToken } : {}),
    ...(expiresAt ? { expiresAt } : {}),
  })
  const user = mapGqlUserToAuthUser(response.user)
  useAppStore.getState().setUser(user)
  return { user, token: response.token, ...(expiresAt ? { expiresAt } : {}) }
}

function authError(err: unknown, status: number): ApiError {
  if (err instanceof GraphQLError) {
    return new ApiError(status, err.message, "")
  }
  return new ApiError(500, (err as Error).message || "Authentication failed", "")
}

// ─── Email/password and Casdoor callback auth ───────────────────────────────

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthSession> {
  try {
    return persistAuthResponse(await gqlLogin(email, password))
  } catch (err) {
    throw authError(err, 401)
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<AuthSession> {
  try {
    return persistAuthResponse(await gqlSignup(email, password))
  } catch (err) {
    throw authError(err, 400)
  }
}

export async function signInWithCasdoor(
  code: string,
  redirectUri: string,
): Promise<AuthSession> {
  try {
    return persistAuthResponse(await gqlLoginWithCasdoor(code, redirectUri))
  } catch {
    throw new ApiError(401, "Google sign-in could not be completed. Please try again.", "")
  }
}

// ─── Casdoor Google authorization-code flow ─────────────────────────────────

export function getCasdoorRedirectUri(): string {
  const configured = process.env.NEXT_PUBLIC_CASDOOR_REDIRECT_URI?.trim()
  if (configured) return configured
  if (typeof window !== "undefined") return `${window.location.origin}/auth/callback`
  return "http://localhost:3000/auth/callback"
}

export function isCasdoorGoogleConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CASDOOR_ISSUER?.trim() &&
      process.env.NEXT_PUBLIC_CASDOOR_CLIENT_ID?.trim(),
  )
}

function createOAuthState(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
  }
  throw new ApiError(503, "Google sign-in is unavailable in this browser.", "")
}

export function startCasdoorGoogleSignIn(redirect: string | null = null): void {
  if (!isCasdoorGoogleConfigured()) {
    throw new ApiError(503, "Google sign-in is not configured. Please try again later.", "")
  }
  if (typeof window === "undefined") {
    throw new ApiError(503, "Google sign-in is unavailable outside the browser.", "")
  }

  const issuer = process.env.NEXT_PUBLIC_CASDOOR_ISSUER!.replace(/\/$/, "")
  const authorizationEndpoint =
    process.env.NEXT_PUBLIC_CASDOOR_AUTHORIZATION_URL?.trim() ||
    `${issuer}/login/oauth/authorize`
  const state = createOAuthState()
  const oauthState: CasdoorOAuthState = {
    state,
    redirect: getSafeRedirect(redirect),
  }

  try {
    sessionStorage.setItem(AUTH_OAUTH_STATE_KEY, JSON.stringify(oauthState))
  } catch {
    throw new ApiError(503, "Google sign-in is unavailable in this browser.", "")
  }

  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_CASDOOR_CLIENT_ID!,
    redirect_uri: getCasdoorRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    provider_hint: "google",
  })
  const organization = process.env.NEXT_PUBLIC_CASDOOR_ORGANIZATION?.trim()
  const application = process.env.NEXT_PUBLIC_CASDOOR_APPLICATION?.trim()
  if (organization) params.set("organization", organization)
  if (application) params.set("application", application)

  window.location.assign(`${authorizationEndpoint}?${params.toString()}`)
}

/** Backwards-compatible auth entry point used by the existing Google buttons. */
export async function signInWithGoogle(
  redirect: string | null = null,
): Promise<AuthSession | null> {
  startCasdoorGoogleSignIn(redirect)
  return null
}

export function consumeCasdoorOAuthState(state: string): string | null {
  if (typeof window === "undefined") return null

  try {
    const raw = sessionStorage.getItem(AUTH_OAUTH_STATE_KEY)
    sessionStorage.removeItem(AUTH_OAUTH_STATE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as Partial<CasdoorOAuthState>
    if (saved.state !== state || typeof saved.redirect !== "string") return null
    return getSafeRedirect(saved.redirect)
  } catch {
    return null
  }
}

// ─── Password reset ──────────────────────────────────────────────────────────

export async function resetPassword(email: string): Promise<void> {
  try {
    await gqlRequestPasswordReset(email)
  } catch (err) {
    throw authError(err, 400)
  }
}

export async function updatePassword(
  recoveryCode: string,
  password: string,
): Promise<void> {
  try {
    await gqlResetPassword(recoveryCode, password)
  } catch (err) {
    throw authError(err, 400)
  }
}

// ─── Session validation and refresh ─────────────────────────────────────────

let refreshInFlight: Promise<AuthSession | null> | null = null

async function refreshStoredSession(): Promise<AuthSession | null> {
  if (refreshInFlight) return refreshInFlight

  const stored = readStoredAuthSession()
  if (!stored?.refreshToken) return null

  refreshInFlight = gqlRefreshSession(stored.refreshToken)
    .then((response) => persistAuthResponse(response, stored.refreshToken))
    .catch(() => null)
    .finally(() => {
      refreshInFlight = null
    })

  return refreshInFlight
}

export async function refreshAuthSession(): Promise<AuthSession | null> {
  return refreshStoredSession()
}

export function navigateToLogin(): void {
  if (
    typeof window === "undefined" ||
    window.location.pathname === "/login"
  ) {
    return
  }

  window.location.replace("/login")
}

export function signOut(): void {
  clearStoredToken()
  useAppStore.getState().resetState()
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  const token = getStoredToken()
  if (!token) return null

  let session = readStoredAuthSession() ?? { token }
  let didRefresh = false

  if (isSessionExpired(session.expiresAt)) {
    const refreshed = await refreshStoredSession()
    if (!refreshed) {
      clearStoredToken()
      useAppStore.getState().resetState()
      return null
    }
    session = readStoredAuthSession() ?? { token: refreshed.token }
    didRefresh = true
  }

  try {
    const user = mapGqlUserToAuthUser(await gqlGetMe())
    useAppStore.getState().setUser(user)
    return {
      user,
      token: session.token,
      ...(session.expiresAt ? { expiresAt: session.expiresAt } : {}),
    }
  } catch {
    if (!didRefresh && session.refreshToken) {
      const refreshed = await refreshStoredSession()
      if (refreshed) {
        try {
          const user = mapGqlUserToAuthUser(await gqlGetMe())
          useAppStore.getState().setUser(user)
          return refreshed
        } catch {
          // Fall through to clearing the invalid session.
        }
      }
    }
    clearStoredToken()
    useAppStore.getState().resetState()
    return null
  }
}

export function getSessionToken(): string | null {
  return getStoredToken()
}

export function getSessionUser(): AuthUser | null {
  return useAppStore.getState().user
}

export function isAuthenticated(): boolean {
  const session = readStoredAuthSession()
  if (!session?.token) return getStoredToken() !== null
  return !isSessionExpired(session.expiresAt) || Boolean(session.refreshToken)
}

export { ApiError }
