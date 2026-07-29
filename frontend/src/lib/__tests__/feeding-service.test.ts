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
    temperature: undefined,
    foodName: "",
    quantity: undefined,
    quantityUnit: undefined,
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
        temperature: undefined,
        food_name: undefined,
        quantity: undefined,
        quantity_unit: undefined,
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

    it("preserves temperature, solids quantity and unit, and the selected start time from GraphQL", async () => {
      const selectedTime = "2026-07-21T08:30:00Z"
      const gqlSession: FeedingSession & {
        temperature: "warm"
        quantity: number
        quantityUnit: string
      } = {
        ...makeGqlSession({
          feedType: "solids",
          startedAt: selectedTime,
          foodName: "Oatmeal",
        }),
        temperature: "warm",
        quantity: 1.5,
        quantityUnit: "tbsp",
      }
      mockGetFeedingSessions.mockResolvedValue([gqlSession])

      const [result] = await fetchFeedSessions("baby-1")

      expect(result).toEqual(
        expect.objectContaining({
          started_at: selectedTime,
          temperature: "warm",
          quantity: 1.5,
          quantity_unit: "tbsp",
        }),
      )
    })

    it("keeps legacy records without the new optional fields readable", async () => {
      const legacy = makeGqlSession({
        id: "legacy-feed",
        feedType: "bottle",
        startedAt: "2026-07-20T07:00:00Z",
      })
      mockGetFeedingSessions.mockResolvedValue([legacy])

      const [result] = await fetchFeedSessions("baby-1")

      expect(result).toEqual(
        expect.objectContaining({
          id: "legacy-feed",
          feed_type: "bottle",
          started_at: "2026-07-20T07:00:00Z",
        }),
      )
      expect(result.temperature).toBeUndefined()
      expect(result.quantity).toBeUndefined()
      expect(result.quantity_unit).toBeUndefined()
    })

    it("normalizes nullable GraphQL fields to undefined without losing a zero quantity", async () => {
      mockGetFeedingSessions.mockResolvedValue([
        makeGqlSession({ temperature: null, quantity: null, quantityUnit: null }),
        makeGqlSession({ id: "zero-quantity", quantity: 0 }),
      ])

      const [legacy, zeroQuantity] = await fetchFeedSessions("baby-1")

      expect(legacy.temperature).toBeUndefined()
      expect(legacy.quantity).toBeUndefined()
      expect(legacy.quantity_unit).toBeUndefined()
      expect(zeroQuantity.quantity).toBe(0)
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

    it("propagates a reload failure without replacing existing store data", async () => {
      const failure = new Error("network unavailable")
      mockGetFeedingSessions.mockRejectedValue(failure)

      await expect(fetchFeedSessions("baby-1")).rejects.toThrow("network unavailable")

      expect(mockStore.setFeedSessions).not.toHaveBeenCalled()
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
        temperature: "warm",
        foodName: undefined,
        quantity: undefined,
        quantityUnit: undefined,
        reaction: undefined,
        notes: undefined,
      })
      expect(result.id).toBe("gql-new")
      expect(result.feed_type).toBe("bottle")
      expect(result.amount_ml).toBe(150)
      expect(mockStore.addFeedSession).toHaveBeenCalledWith(result)
    })

    it("forwards bottle temperature and solids quantity, unit, and selected time to the GraphQL client", async () => {
      const selectedTime = "2026-07-22T14:45:00Z"
      mockCreateFeedingSession.mockResolvedValue(
        makeGqlSession({
          id: "gql-solids",
          feedType: "solids",
          startedAt: selectedTime,
        }),
      )

      await createFeedSession({
        baby_id: "baby-1",
        feed_type: "solids",
        started_at: selectedTime,
        temperature: "warm",
        food_name: "Avocado",
        quantity: 2,
        quantity_unit: "oz",
      })

      expect(mockCreateFeedingSession).toHaveBeenCalledWith(
        expect.objectContaining({
          babyId: "baby-1",
          feedType: "solids",
          startedAt: selectedTime,
          temperature: "warm",
          foodName: "Avocado",
          quantity: 2,
          quantityUnit: "oz",
        }),
      )
    })

    it.each(["cold", "room", "warm"] as const)(
      "forwards the %s bottle temperature without coercing it",
      async (temperature) => {
        mockCreateFeedingSession.mockResolvedValue(
          makeGqlSession({ id: `gql-${temperature}`, feedType: "bottle" }),
        )

        await createFeedSession({
          baby_id: "baby-1",
          feed_type: "bottle",
          started_at: "2026-07-22T08:00:00Z",
          amount_ml: 0,
          milk_type: "water",
          temperature,
        })

        expect(mockCreateFeedingSession).toHaveBeenLastCalledWith(
          expect.objectContaining({
            feedType: "bottle",
            amountMl: 0,
            milkType: "water",
            temperature,
          }),
        )
      },
    )

    it.each([
      ["tbsp", 0],
      ["oz", 0.5],
      ["g", 125],
    ] as const)(
      "forwards %s solids quantity %p and its selected time exactly",
      async (quantityUnit, quantity) => {
        const selectedTime = "2026-07-22T14:45:00Z"
        mockCreateFeedingSession.mockResolvedValue(
          makeGqlSession({ id: `gql-${quantityUnit}`, feedType: "solids", startedAt: selectedTime }),
        )

        await createFeedSession({
          baby_id: "baby-1",
          feed_type: "solids",
          started_at: selectedTime,
          food_name: "Avocado",
          quantity,
          quantity_unit: quantityUnit,
        })

        expect(mockCreateFeedingSession).toHaveBeenLastCalledWith(
          expect.objectContaining({
            feedType: "solids",
            startedAt: selectedTime,
            quantity,
            quantityUnit,
          }),
        )
      },
    )

    it("propagates a failed create without adding a local-only record", async () => {
      const failure = new Error("GraphQL unavailable")
      mockCreateFeedingSession.mockRejectedValue(failure)

      await expect(
        createFeedSession({
          baby_id: "baby-1",
          feed_type: "bottle",
          started_at: "2026-07-22T08:00:00Z",
          temperature: "room",
        }),
      ).rejects.toThrow("GraphQL unavailable")

      expect(mockStore.addFeedSession).not.toHaveBeenCalled()
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
