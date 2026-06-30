"use client"

import { apiFetch, ApiError } from "./api-client"
import { useAppStore } from "./store"

export interface AuthUser {
  id: string
  email: string
}

export interface AuthSession {
  user: AuthUser
  token: string
}

const SESSION_COOKIE = "nalagrow-session"
const COOKIE_MAX_AGE_DAYS = 30

function setSessionCookie(token: string) {
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60
  document.cookie = `${SESSION_COOKIE}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`
}

function clearSessionCookie() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`
}

export function getSessionToken(): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`),
  )
  return match ? decodeURIComponent(match[1]) : null
}

export function getSessionUser(): AuthUser | null {
  return useAppStore.getState().user
}

export function isAuthenticated(): boolean {
  if (typeof document === "undefined") return false
  return getSessionToken() !== null
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthSession> {
  const data = await apiFetch<{ user: AuthUser; token: string }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  )
  setSessionCookie(data.token)
  useAppStore.getState().setUser(data.user)
  return data
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<AuthSession> {
  const data = await apiFetch<{ user: AuthUser; token: string }>(
    "/auth/signup",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  )
  setSessionCookie(data.token)
  useAppStore.getState().setUser(data.user)
  return data
}

export function signInWithGoogle() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/v1"
  navigateTo(`${apiBase}/auth/google`)
}

export function navigateTo(url: string) {
  window.location.href = url
}

export async function resetPassword(email: string): Promise<void> {
  await apiFetch("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export async function updatePassword(
  token: string,
  password: string,
): Promise<void> {
  await apiFetch("/auth/update-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  })
}

export function signOut() {
  clearSessionCookie()
  useAppStore.getState().setUser(null)
  useAppStore.getState().setActiveBaby(null)
}

export { ApiError }
