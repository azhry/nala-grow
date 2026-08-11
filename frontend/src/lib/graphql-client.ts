// ---------------------------------------------------------------------------
// NalaGrow — Typed GraphQL client
//
// Wraps fetch() for the backend's hand-rolled GraphQL endpoint at /graphql.
// Auth is provided via a JWT token stored in localStorage (set by FE-014).
// ---------------------------------------------------------------------------

import {
  type AuthResponse,
  type AuthUser,
  type BabyProfile,
  type BabyInput,
  type Measurement,
  type MeasurementInput,
  type FeedingSession,
  type FeedingSessionInput,
  type SleepSession,
  type SleepSessionInput,
  type Milestone,
  type MilestoneInput,
  type ExportDataResult,
  type GraphQLResponse,
  GraphQLError,
} from "./graphql-types"

import {
  SIGNUP_MUTATION,
  LOGIN_MUTATION,
  LOGIN_GOOGLE_MUTATION,
  REQUEST_PASSWORD_RESET_MUTATION,
  RESET_PASSWORD_MUTATION,
  ME_QUERY,
  BABIES_QUERY,
  BABY_QUERY,
  CREATE_BABY_MUTATION,
  UPDATE_BABY_MUTATION,
  DELETE_BABY_MUTATION,
  MEASUREMENTS_QUERY,
  MEASUREMENT_QUERY,
  CREATE_MEASUREMENT_MUTATION,
  UPDATE_MEASUREMENT_MUTATION,
  DELETE_MEASUREMENT_MUTATION,
  FEEDING_SESSIONS_QUERY,
  FEEDING_SESSION_QUERY,
  CREATE_FEEDING_SESSION_MUTATION,
  UPDATE_FEEDING_SESSION_MUTATION,
  DELETE_FEEDING_SESSION_MUTATION,
  SLEEP_SESSIONS_QUERY,
  SLEEP_SESSION_QUERY,
  CREATE_SLEEP_SESSION_MUTATION,
  UPDATE_SLEEP_SESSION_MUTATION,
  DELETE_SLEEP_SESSION_MUTATION,
  MILESTONES_QUERY,
  MILESTONE_QUERY,
  CREATE_MILESTONE_MUTATION,
  UPDATE_MILESTONE_MUTATION,
  DELETE_MILESTONE_MUTATION,
  EXPORT_DATA_QUERY,
  EXPORT_CSV_QUERY,
} from "./graphql-queries"
import { DEMO_BABY_ID } from "./demo-data"
import { AUTH_TOKEN_KEY } from "./auth-constants"

export type {
  AuthResponse,
  AuthUser,
  BabyProfile,
  BabyInput,
  Measurement,
  MeasurementInput,
  FeedingSession,
  FeedingSessionInput,
  SleepSession,
  SleepSessionInput,
  Milestone,
  MilestoneInput,
  ExportDataResult,
}

// ─── Configuration ──────────────────────────────────────────────────────────

const API_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:4000/graphql"

// ─── Token helpers ──────────────────────────────────────────────────────────

/**
 * Retrieve the JWT auth token.
 *
 * Priority:
 * 1. Dedicated auth-token localStorage key (set by FE-014)
 * 2. Zustand persist store ("nalagrow-store") — extract token if stored there
 * 3. Returns null if no token is found
 */
function getAuthToken(): string | null {
  // 1. Dedicated key
  const dedicated = localStorage.getItem(AUTH_TOKEN_KEY)
  if (dedicated) return dedicated

  // 2. Zustand persist store (pre-FE-014 compatibility)
  try {
    const raw = localStorage.getItem("nalagrow-store")
    if (raw) {
      const parsed = JSON.parse(raw)
      const state = parsed?.state
      if (state?.token) return state.token
      // Some users might store the token inline
      if (parsed?.token) return parsed.token
    }
  } catch {
    // ignore parse errors
  }

  return null
}

/** Persist a JWT auth token for subsequent requests (used by FE-014). */
export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

/** Remove the stored JWT token (logout). */
export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

// ─── Core executor ──────────────────────────────────────────────────────────

/**
 * Execute a GraphQL query or mutation.
 *
 * @param query    The GraphQL operation string (from graphql-queries.ts).
 * @param variables Optional variables map.
 * @param options  If `{ auth: false }` the Authorization header is omitted.
 * @returns The data payload under the operation's root key.
 */
export async function execute<T>(
  query: string,
  variables?: object,
  options?: { auth?: boolean }
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  // Attach auth unless explicitly disabled
  const needsAuth = options?.auth !== false
  if (needsAuth) {
    const token = getAuthToken()
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
  }

  const body = JSON.stringify({ query, variables })

  let res: Response
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers,
      body,
    })
  } catch (err) {
    throw new GraphQLError([
      { message: `Network error: ${(err as Error).message}` },
    ])
  }

  // Parse the JSON envelope
  let json: GraphQLResponse<Record<string, unknown>>
  try {
    json = await res.json()
  } catch {
    throw new GraphQLError([
      {
        message: `Invalid JSON response (HTTP ${res.status})`,
      },
    ])
  }

  // GraphQL-level errors
  if (json.errors && json.errors.length > 0) {
    throw new GraphQLError(json.errors)
  }

  // Ensure data exists
  if (!json.data) {
    throw new GraphQLError([{ message: "Empty response data" }])
  }

  // Return the first (and only) key's value
  const keys = Object.keys(json.data)
  if (keys.length === 0) {
    throw new GraphQLError([{ message: "Empty data object" }])
  }

  return json.data[keys[0]] as T
}

// ─── Convenience functions ──────────────────────────────────────────────────

// Auth ─────────

export async function signup(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResponse> {
  return execute<AuthResponse>(
    SIGNUP_MUTATION,
    {
      email,
      password,
      displayName: displayName ?? undefined,
    },
    { auth: false },
  )
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  return execute<AuthResponse>(LOGIN_MUTATION, { email, password }, { auth: false })
}

export async function loginWithGoogle(
  idToken: string
): Promise<AuthResponse> {
  return execute<AuthResponse>(LOGIN_GOOGLE_MUTATION, { idToken }, { auth: false })
}

export async function requestPasswordReset(
  email: string
): Promise<boolean> {
  return execute<boolean>(REQUEST_PASSWORD_RESET_MUTATION, { email }, { auth: false })
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<boolean> {
  return execute<boolean>(RESET_PASSWORD_MUTATION, { token, newPassword }, { auth: false })
}

export async function getMe(): Promise<AuthUser> {
  return execute<AuthUser>(ME_QUERY, undefined, { auth: true })
}

// Babies ──────

export async function getBabies(): Promise<BabyProfile[]> {
  return execute<BabyProfile[]>(BABIES_QUERY, undefined, { auth: true })
}

export async function getBaby(id: string): Promise<BabyProfile> {
  return execute<BabyProfile>(BABY_QUERY, { id }, { auth: true })
}

export async function createBaby(input: BabyInput): Promise<BabyProfile> {
  return execute<BabyProfile>(CREATE_BABY_MUTATION, input, { auth: true })
}

export async function updateBaby(
  id: string,
  input: Partial<BabyInput>
): Promise<BabyProfile> {
  return execute<BabyProfile>(UPDATE_BABY_MUTATION, { id, ...input }, { auth: true })
}

export async function deleteBaby(id: string): Promise<BabyProfile> {
  return execute<BabyProfile>(DELETE_BABY_MUTATION, { id }, { auth: true })
}

// Measurements ─

export async function getMeasurements(
  babyId: string
): Promise<Measurement[]> {
  return execute<Measurement[]>(MEASUREMENTS_QUERY, { babyId }, { auth: true })
}

export async function getMeasurement(id: string): Promise<Measurement> {
  return execute<Measurement>(MEASUREMENT_QUERY, { id }, { auth: true })
}

export async function createMeasurement(
  input: MeasurementInput
): Promise<Measurement> {
  return execute<Measurement>(CREATE_MEASUREMENT_MUTATION, input, { auth: true })
}

export async function updateMeasurement(
  id: string,
  input: Partial<MeasurementInput>
): Promise<Measurement> {
  return execute<Measurement>(UPDATE_MEASUREMENT_MUTATION, { id, ...input }, { auth: true })
}

export async function deleteMeasurement(id: string): Promise<Measurement> {
  return execute<Measurement>(DELETE_MEASUREMENT_MUTATION, { id }, { auth: true })
}

// Feeding ─────

export async function getFeedingSessions(
  babyId: string
): Promise<FeedingSession[]> {
  return execute<FeedingSession[]>(FEEDING_SESSIONS_QUERY, { babyId }, { auth: true })
}

export async function getFeedingSession(id: string): Promise<FeedingSession> {
  return execute<FeedingSession>(FEEDING_SESSION_QUERY, { id }, { auth: true })
}

export async function createFeedingSession(
  input: FeedingSessionInput
): Promise<FeedingSession> {
  return execute<FeedingSession>(CREATE_FEEDING_SESSION_MUTATION, input, { auth: true })
}

export async function updateFeedingSession(
  id: string,
  input: Partial<FeedingSessionInput>
): Promise<FeedingSession> {
  return execute<FeedingSession>(UPDATE_FEEDING_SESSION_MUTATION, { id, ...input }, { auth: true })
}

export async function deleteFeedingSession(
  id: string
): Promise<FeedingSession> {
  return execute<FeedingSession>(DELETE_FEEDING_SESSION_MUTATION, { id }, { auth: true })
}

// Sleep ───────

export async function getSleepSessions(
  babyId: string
): Promise<SleepSession[]> {
  return execute<SleepSession[]>(SLEEP_SESSIONS_QUERY, { babyId }, { auth: true })
}

export async function getSleepSession(id: string): Promise<SleepSession> {
  return execute<SleepSession>(SLEEP_SESSION_QUERY, { id }, { auth: true })
}

export async function createSleepSession(
  input: SleepSessionInput
): Promise<SleepSession> {
  return execute<SleepSession>(CREATE_SLEEP_SESSION_MUTATION, input, { auth: true })
}

export async function updateSleepSession(
  id: string,
  input: Partial<SleepSessionInput>
): Promise<SleepSession> {
  return execute<SleepSession>(UPDATE_SLEEP_SESSION_MUTATION, { id, ...input }, { auth: true })
}

export async function deleteSleepSession(id: string): Promise<SleepSession> {
  return execute<SleepSession>(DELETE_SLEEP_SESSION_MUTATION, { id }, { auth: true })
}

// Milestones ──

export async function getMilestones(
  babyId: string
): Promise<Milestone[]> {
  return execute<Milestone[]>(MILESTONES_QUERY, { babyId }, { auth: true })
}

export async function getMilestone(id: string): Promise<Milestone> {
  return execute<Milestone>(MILESTONE_QUERY, { id }, { auth: true })
}

export async function createMilestone(
  input: MilestoneInput
): Promise<Milestone> {
  return execute<Milestone>(CREATE_MILESTONE_MUTATION, input, { auth: true })
}

export async function updateMilestone(
  id: string,
  input: Partial<MilestoneInput>
): Promise<Milestone> {
  return execute<Milestone>(UPDATE_MILESTONE_MUTATION, { id, ...input }, { auth: true })
}

export async function deleteMilestone(id: string): Promise<Milestone> {
  return execute<Milestone>(DELETE_MILESTONE_MUTATION, { id }, { auth: true })
}

// Export ───────

export async function getExportData(
  babyId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<ExportDataResult> {
  return execute<ExportDataResult>(
    EXPORT_DATA_QUERY,
    { babyId, dateFrom: dateFrom ?? undefined, dateTo: dateTo ?? undefined },
    { auth: true }
  )
}

export async function getExportCSV(
  babyId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<string> {
  return execute<string>(
    EXPORT_CSV_QUERY,
    { babyId, dateFrom: dateFrom ?? undefined, dateTo: dateTo ?? undefined },
    { auth: true }
  )
}

export interface DemoData {
  baby: {
    id: string
    name: string
    dob: string
    sex: string
    photoUrl: string
    createdAt: string
    userId: string
  }
  feedingSessions: {
    id: string
    babyId: string
    feedType: string
    startedAt: string
    endedAt: string
    leftDurationSec: number
    rightDurationSec: number
    amountMl: number
    milkType: string
    foodName: string
    reaction: string
    temperature?: string | null
    quantity?: number | null
    quantityUnit?: string | null
    notes: string
    createdAt: string
  }[]
  sleepSessions: {
    id: string
    babyId: string
    startedAt: string
    endedAt: string
    location: string
    notes: string
    createdAt: string
  }[]
  measurements: {
    id: string
    babyId: string
    date: string
    weight: number
    height: number
    headCircumference: number
    createdAt: string
  }[]
  milestones: {
    id: string
    babyId: string
    title: string
    description: string
    category: string
    achievedAt: string
    note: string
    photoUrl: string
    isCustom: boolean
    createdAt: string
  }[]
}

export async function fetchDemoData(): Promise<DemoData> {
  const variables = { babyId: DEMO_BABY_ID }
  const [baby, feedingSessions, sleepSessions, measurements, milestones] =
    await Promise.all([
      execute<BabyProfile>(BABY_QUERY, { id: DEMO_BABY_ID }),
      execute<DemoData["feedingSessions"]>(FEEDING_SESSIONS_QUERY, variables),
      execute<DemoData["sleepSessions"]>(SLEEP_SESSIONS_QUERY, variables),
      execute<DemoData["measurements"]>(MEASUREMENTS_QUERY, variables),
      execute<DemoData["milestones"]>(MILESTONES_QUERY, variables),
    ])

  return { baby, feedingSessions, sleepSessions, measurements, milestones }
}
