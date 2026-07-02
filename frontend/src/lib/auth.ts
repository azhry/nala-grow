"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { Session, User } from "@supabase/supabase-js"
import { ApiError } from "./api-client"
import { useAppStore } from "./store"

export interface AuthUser {
  id: string
  email: string
}

export interface AuthSession {
  user: AuthUser
  token: string
}

const SUPABASE_COOKIE_PATTERN = /^sb-.+-auth-token/
const SESSION_DAYS = 30

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new ApiError(
      500,
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      "",
    )
  }

  return { url, anonKey }
}

export function getSupabaseClient() {
  const { url, anonKey } = getSupabaseConfig()

  return createBrowserClient(url, anonKey, {
    cookieOptions: {
      maxAge: SESSION_DAYS * 24 * 60 * 60,
      sameSite: "lax",
    },
  })
}

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? "",
  }
}

function persistSession(session: Session | null, user: User | null) {
  const authUser = user ? toAuthUser(user) : null
  useAppStore.getState().setUser(authUser)

  return authUser && session
    ? { user: authUser, token: session.access_token }
    : null
}

function throwApiError(message: string, status = 400): never {
  throw new ApiError(status, message, "")
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  const {
    data: { session },
    error,
  } = await getSupabaseClient().auth.getSession()

  if (error) throwApiError(error.message)
  return session ? persistSession(session, session.user) : null
}

export function getSessionToken(): string | null {
  if (typeof document === "undefined") return null

  const cookie = document.cookie
    .split("; ")
    .find((value) => SUPABASE_COOKIE_PATTERN.test(value.split("=")[0]))

  return cookie ? decodeURIComponent(cookie.split("=")[1] ?? "") : null
}

export function getSessionUser(): AuthUser | null {
  return useAppStore.getState().user
}

export function isAuthenticated(): boolean {
  if (typeof document === "undefined") return false
  return getSessionToken() !== null || getSessionUser() !== null
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthSession> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email,
    password,
  })

  if (error) throwApiError(error.message)

  const session = persistSession(data.session, data.user)
  if (!session) throwApiError("Unable to start a Supabase session.")
  return session
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<AuthSession> {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo:
        typeof window === "undefined"
          ? undefined
          : `${window.location.origin}/dashboard`,
    },
  })

  if (error) throwApiError(error.message)

  const authUser = data.user ? toAuthUser(data.user) : null
  if (authUser) useAppStore.getState().setUser(authUser)

  return {
    user: authUser ?? { id: "", email },
    token: data.session?.access_token ?? "",
  }
}

export async function signInWithGoogle() {
  const { error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo:
        typeof window === "undefined"
          ? undefined
          : `${window.location.origin}/dashboard`,
    },
  })

  if (error) throwApiError(error.message)
}

export async function resetPassword(email: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(
    email,
    {
      redirectTo:
        typeof window === "undefined"
          ? undefined
          : `${window.location.origin}/reset-password`,
    },
  )

  if (error) throwApiError(error.message)
}

export async function updatePassword(
  recoveryCode: string,
  password: string,
): Promise<void> {
  const supabase = getSupabaseClient()

  if (recoveryCode) {
    const { data, error } =
      await supabase.auth.exchangeCodeForSession(recoveryCode)

    if (error) throwApiError(error.message)
    persistSession(data.session, data.session?.user ?? null)
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) throwApiError(error.message)
}

export async function signOut() {
  const { error } = await getSupabaseClient().auth.signOut()
  if (error) throwApiError(error.message)

  useAppStore.getState().setUser(null)
  useAppStore.getState().setActiveBaby(null)
}

export { ApiError }
