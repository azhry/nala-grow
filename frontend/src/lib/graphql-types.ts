// ---------------------------------------------------------------------------
// NalaGrow — Typed GraphQL types matching the backend data model
// Backend: Go hand-rolled GraphQL at POST /graphql
// Fields are camelCase to match the JSON serialised by handler.go
// ---------------------------------------------------------------------------

// ─── Auth ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  displayName: string
  photoUrl: string
  createdAt: string
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

// ─── Baby ───────────────────────────────────────────────────────────────────

export interface BabyProfile {
  id: string
  name: string
  dob: string
  sex: string
  photoUrl: string
  createdAt: string
  userId: string
}

export interface BabyInput {
  name: string
  dob?: string
  sex?: string
  photoUrl?: string
}

// ─── Measurement ────────────────────────────────────────────────────────────

export interface Measurement {
  id: string
  babyId: string
  date: string
  weight: number
  height: number
  headCircumference: number
  createdAt: string
  /** Returned by createMeasurement when WHO LMS data is available */
  weightPercentile?: number
  heightPercentile?: number
  headCircumferencePercentile?: number
}

export interface MeasurementInput {
  babyId: string
  date?: string
  weight?: number
  height?: number
  headCircumference?: number
}

// ─── Feeding Session ────────────────────────────────────────────────────────

export interface FeedingSession {
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
  notes: string
  createdAt: string
}

export interface FeedingSessionInput {
  babyId: string
  feedType: string
  startedAt?: string
  endedAt?: string
  leftDurationSec?: number
  rightDurationSec?: number
  amountMl?: number
  milkType?: string
  foodName?: string
  reaction?: string
  notes?: string
}

// ─── Sleep Session ──────────────────────────────────────────────────────────

export interface SleepSession {
  id: string
  babyId: string
  startedAt: string
  endedAt: string
  location: string
  notes: string
  createdAt: string
}

export interface SleepSessionInput {
  babyId: string
  startedAt?: string
  endedAt?: string
  location?: string
  notes?: string
}

// ─── Milestone ──────────────────────────────────────────────────────────────

export interface Milestone {
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
}

export interface MilestoneInput {
  babyId: string
  title: string
  description?: string
  category?: string
  achievedAt?: string
  note?: string
  photoUrl?: string
  isCustom?: boolean
}

// ─── Export ─────────────────────────────────────────────────────────────────

export interface ExportDataResult {
  babyName: string
  babyDob: string
  babySex: string
  feedSessions: FeedingSession[]
  sleepSessions: SleepSession[]
  measurements: Measurement[]
  milestones: Milestone[]
  dateFrom: string
  dateTo: string
}

// ─── GraphQL Envelope ───────────────────────────────────────────────────────

export interface GraphQLErrorObj {
  message: string
  locations?: Array<{ line: number; column: number }>
  path?: string[]
}

export interface GraphQLResponse<T> {
  data?: T
  errors?: GraphQLErrorObj[]
}

/** Custom error thrown when the GraphQL endpoint returns errors. */
export class GraphQLError extends Error {
  errors: GraphQLErrorObj[]

  constructor(errors: GraphQLErrorObj[]) {
    const msg = errors.map((e) => e.message).join("; ")
    super(msg)
    this.name = "GraphQLError"
    this.errors = errors
  }
}
