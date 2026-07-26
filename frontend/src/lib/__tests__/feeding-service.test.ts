import type { FeedingSession } from "@/lib/graphql-types"

// Mock graphql-client
jest.mock("@/lib/graphql-client", () => ({
  getFeedingSessions: jest.fn(),
  createFeedingSession: jest.fn(),
  deleteFeedingSession: jest.fn(),
}))

// Mock store
jest.mock("@/lib/store", () => ({
  useAppStore: {
    getState: jest.fn(),
  },
}))

import {
  getFeedingSessions as gqlGetFeedingSessions,
  createFeedingSession as gqlCreateFeedingSession,
  deleteFeedingSession as gqlDeleteFeedingSession,
} from "@/lib/graphql-client"
import { useAppStore } from "@/lib/store"
import {
  fetchFeedSessions,
  createFeedSession,
  deleteFeedSession,
} from "@/lib/feeding-service"

const mockGetFeedingSessions = gqlGetFeedingSessions as jest.MockedFunction<
  typeof gqlGetFeedingSessions
>
const mockCreateFeedingSession = gqlCreateFeedingSession as jest.MockedFunction<
  typeof gqlCreateFeedingSession
>
const mockDeleteFeedingSession = gqlDeleteFeedingSession as jest.MockedFunction<
  typeof gqlDeleteFeedingSession
>
const mockGetState = useAppStore.getState as jest.MockedFunction<typeof useAppStore.getState>

const mockStore = {
  setFeedSessions: jest.fn(),
  addFeedSession: jest.fn(),
  deleteFeedSession: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetState.mockReturnValue(mockStore as unknown as ReturnType<typeof useAppStore.getState>)
})

function makeGqlSession(overrides: Partial<FeedingSession> = {}): FeedingSession {
  return {
    id: "gql-1",
    babyId: "baby-1",
    feedType: "breast",
    startedAt: "2026-07-20T10:00:00Z",
    endedAt: "2026-07-20T10:15:00Z",
    leftDurationSec: 300,
    rightDurationSec: 180,
    amountMl: 0,
    milkType: "",
    foodName: "",
    reaction: "",
    notes: "",
    createdAt: "2026-07-20T10:00:00Z",
    ...overrides,
  }
}

describe("feeding-service", () => {
  describe("toStoreFeedSession mapping", () => {
    it("maps GraphQL FeedingSession camelCase fields to store snake_case fields", async () => {
      const gqlSession = makeGqlSession({
        id: "gql-42",
        babyId: "baby-99",
        feedType: "bottle",
        startedAt: "2026-07-20T10:00:00Z",
        endedAt: "2026-07-20T10:05:00Z",
        leftDurationSec: 0,
        rightDurationSec: 0,
        amountMl: 150,
        milkType: "formula",
        foodName: "",
        reaction: "",
        notes: "took well",
      })
      mockGetFeedingSessions.mockResolvedValue([gqlSession])

      const result = await fetchFeedSessions("baby-99")

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: "gql-42",
        baby_id: "baby-99",
        feed_type: "bottle",
        started_at: "2026-07-20T10:00:00Z",
        ended_at: "2026-07-20T10:05:00Z",
        left_duration_sec: undefined,
        right_duration_sec: undefined,
        amount_ml: 150,
        milk_type: "formula",
        food_name: undefined,
        reaction: undefined,
        notes: "took well",
      })
    })

    it("maps solids session with food_name and reaction", async () => {
      const gqlSession = makeGqlSession({
        feedType: "solids",
        foodName: "Banana",
        reaction: "loved",
        leftDurationSec: 0,
        rightDurationSec: 0,
        amountMl: 0,
        milkType: "",
      })
      mockGetFeedingSessions.mockResolvedValue([gqlSession])

      const result = await fetchFeedSessions("baby-1")

      expect(result[0]).toEqual(
        expect.objectContaining({
          feed_type: "solids",
          food_name: "Banana",
          reaction: "loved",
        }),
      )
    })
  })

  describe("fetchFeedSessions", () => {
    it("calls gqlGetFeedingSessions and stores results", async () => {
      const gqlSessions = [
        makeGqlSession({ id: "gql-1" }),
        makeGqlSession({ id: "gql-2", feedType: "bottle", amountMl: 120, milkType: "breast_milk" }),
      ]
      mockGetFeedingSessions.mockResolvedValue(gqlSessions)

      const result = await fetchFeedSessions("baby-1")

      expect(mockGetFeedingSessions).toHaveBeenCalledWith("baby-1")
      expect(result).toHaveLength(2)
      expect(mockStore.setFeedSessions).toHaveBeenCalledWith(result)
    })

    it("returns empty array when no sessions exist", async () => {
      mockGetFeedingSessions.mockResolvedValue([])

      const result = await fetchFeedSessions("baby-1")

      expect(result).toEqual([])
      expect(mockStore.setFeedSessions).toHaveBeenCalledWith([])
    })
  })

  describe("createFeedSession", () => {
    it("calls gqlCreateFeedingSession and adds to store", async () => {
      const gqlResult = makeGqlSession({
        id: "gql-new",
        feedType: "bottle",
        amountMl: 150,
        milkType: "formula",
      })
      mockCreateFeedingSession.mockResolvedValue(gqlResult)

      const storeInput = {
        baby_id: "baby-1",
        feed_type: "bottle" as const,
        started_at: "2026-07-20T12:00:00Z",
        ended_at: "2026-07-20T12:05:00Z",
        amount_ml: 150,
        milk_type: "formula" as const,
        temperature: "warm" as const,
      }

      const result = await createFeedSession(storeInput)

      expect(mockCreateFeedingSession).toHaveBeenCalledWith({
        babyId: "baby-1",
        feedType: "bottle",
        startedAt: "2026-07-20T12:00:00Z",
        endedAt: "2026-07-20T12:05:00Z",
        leftDurationSec: undefined,
        rightDurationSec: undefined,
        amountMl: 150,
        milkType: "formula",
        foodName: undefined,
        reaction: undefined,
        notes: undefined,
      })
      expect(result.id).toBe("gql-new")
      expect(result.feed_type).toBe("bottle")
      expect(result.amount_ml).toBe(150)
      expect(mockStore.addFeedSession).toHaveBeenCalledWith(result)
    })
  })

  describe("deleteFeedSession", () => {
    it("calls gqlDeleteFeedingSession and removes from store", async () => {
      mockDeleteFeedingSession.mockResolvedValue({} as unknown as Parameters<typeof deleteFeedSession>[0])

      await deleteFeedSession("session-to-delete")

      expect(mockDeleteFeedingSession).toHaveBeenCalledWith("session-to-delete")
      expect(mockStore.deleteFeedSession).toHaveBeenCalledWith("session-to-delete")
    })
  })
})
