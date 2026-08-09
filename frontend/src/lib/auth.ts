"use client"

import { ApiError } from "./api-client"
import { useAppStore } from "./store"
import {
  login as gqlLogin,
  signup as gqlSignup,
  loginWithGoogle as gqlLoginWithGoogle,
  requestPasswordReset as gqlRequestPasswordReset,
  resetPassword as gqlResetPassword,
  getMe as gqlGetMe,
  setAuthToken,
  clearAuthToken,
} from "./graphql-client"
import { GraphQLError } from "./graphql-types"
import type { AuthResponse as GqlAuthResponse } from "./graphql-types"
import { AUTH_TOKEN_KEY } from "./auth-constants"

export interface AuthUser {
  id: string
  email: string
}

export interface AuthSession {
  user: AuthUser
  token: string
}

// ─── Token persistence ───────────────────────────────────────────────────────

function getAuthCookie(): string | null {
  if (typeof document === "undefined") return null

  const prefix = `${AUTH_TOKEN_KEY}=`
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null

  const cookieToken = getAuthCookie()
  const storedToken = localStorage.getItem(AUTH_TOKEN_KEY)
  const token = cookieToken ?? storedToken
  if (!token) return null

  if (storedToken !== token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    setAuthToken(token)
  }
  if (!cookieToken) setAuthCookie(token)

  const state = useAppStore.getState()
  if (state.token !== token) state.setToken(token)
  return token
}

function setAuthCookie(token: string): void {
  if (typeof document === "undefined") return
  document.cookie = `${AUTH_TOKEN_KEY}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
}

function clearAuthCookie(): void {
  if (typeof document === "undefined") return
  document.cookie = `${AUTH_TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`
}

function storeToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  setAuthCookie(token)
  setAuthToken(token)
  useAppStore.getState().setToken(token)
}

function clearStoredToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  clearAuthCookie()
  clearAuthToken()
  useAppStore.getState().setToken(null)
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function mapGqlUserToAuthUser(gqlUser: {
  id: string
  email: string
}): AuthUser {
  return { id: gqlUser.id, email: gqlUser.email }
}

function persistAuthResponse(response: GqlAuthResponse): AuthSession {
  storeToken(response.token)
  const user = mapGqlUserToAuthUser(response.user)
  useAppStore.getState().setUser(user)
  return { user, token: response.token }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthSession> {
  try {
    const response = await gqlLogin(email, password)
    return persistAuthResponse(response)
  } catch (err) {
    if (err instanceof GraphQLError) {
      throw new ApiError(401, err.message, "")
    }
    throw new ApiError(500, (err as Error).message, "")
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<AuthSession> {
  try {
    const response = await gqlSignup(email, password)
    return persistAuthResponse(response)
  } catch (err) {
    if (err instanceof GraphQLError) {
      throw new ApiError(400, err.message, "")
    }
    throw new ApiError(500, (err as Error).message, "")
  }
}

// ─── Google OAuth (GSI One Tap) ──────────────────────────────────────────────

let gsiLoaded = false
let gsiLoading: Promise<void> | null = null

function loadGsiScript(): Promise<void> {
  if (gsiLoaded) return Promise.resolve()
  if (gsiLoading) return gsiLoading

  gsiLoading = new Promise<void>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Cannot load GSI script: not in browser"))
      return
    }
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.onload = () => {
      gsiLoaded = true
      resolve()
    }
    script.onerror = () => {
      gsiLoading = null
      reject(new Error("Failed to load Google Identity Services script"))
    }
    document.head.appendChild(script)
  })

  return gsiLoading
}

export async function signInWithGoogle(): Promise<void> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  if (!clientId) {
    console.warn(
      "Google sign-in is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID.",
    )
    return
  }

  await loadGsiScript()

  return new Promise<void>((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google

    google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        try {
          const gqlResponse = await gqlLoginWithGoogle(response.credential)
          persistAuthResponse(gqlResponse)
          // Hard redirect to dashboard after successful Google sign-in
          window.location.href = "/dashboard"
        } catch (err) {
          console.error("Google sign-in failed:", err)
        }
        resolve()
      },
      cancel_on_tap_outside: false,
    })

    google.accounts.id.prompt()
  })
}

// ─── Password reset ──────────────────────────────────────────────────────────

export async function resetPassword(email: string): Promise<void> {
  try {
    await gqlRequestPasswordReset(email)
  } catch (err) {
    if (err instanceof GraphQLError) {
      throw new ApiError(400, err.message, "")
    }
    throw new ApiError(500, (err as Error).message, "")
  }
}

export async function updatePassword(
  recoveryCode: string,
  password: string,
): Promise<void> {
  try {
    await gqlResetPassword(recoveryCode, password)
  } catch (err) {
    if (err instanceof GraphQLError) {
      throw new ApiError(400, err.message, "")
    }
    throw new ApiError(500, (err as Error).message, "")
  }
}

// ─── Session management ──────────────────────────────────────────────────────

let loginNavigationStarted = false

/**
 * Leave the current document so the server and middleware establish the
 * authoritative unauthenticated route. The module guard prevents an
 * intentional logout from racing with AuthGuard's fallback redirect.
 */
export function navigateToLogin(): void {
  if (typeof window === "undefined" || loginNavigationStarted || window.location.pathname === "/login") {
    return
  }

  loginNavigationStarted = true
  window.location.replace("/login")
}

export function signOut(): void {
  clearStoredToken()
  useAppStore.getState().resetState()
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  const token = getStoredToken()
  if (!token) return null

  try {
    const user = await gqlGetMe()
    const authUser = mapGqlUserToAuthUser(user)
    useAppStore.getState().setUser(authUser)
    return { user: authUser, token }
  } catch {
    // Token is invalid or expired — clear it
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
  return getStoredToken() !== null
}

export { ApiError }
