import { fetchFeedSessions, createFeedSession, deleteFeedSession } from "../feeding-service"
import type { FeedSession } from "@/lib/store"

jest.mock("@/lib/graphql-client", () => ({
  getFeedingSessions: jest.fn(),
  createFeedingSession: jest.fn(),
  deleteFeedingSession: jest.fn(),
}))

jest.mock("@/lib/store", () => {
  const setFeedSessions = jest.fn()
  const addFeedSession = jest.fn()
  const deleteFeedSession = jest.fn()
  return {
    __setFeedSessions: setFeedSessions,
    __addFeedSession: addFeedSession,
    __deleteFeedSession: deleteFeedSession,
    useAppStore: {
      getState: () => ({
        setFeedSessions,
        addFeedSession,
        deleteFeedSession,
      }),
    },
  }
})

import * as gql from "@/lib/graphql-client"
import { useAppStore } from "@/lib/store"

describe("feeding-service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("maps a GraphQL session into a store FeedSession on fetch", async () => {
    ;(gql.getFeedingSessions as jest.Mock).mockResolvedValue([
      {
        id: "g1",
        babyId: "b1",
        feedType: "bottle",
        startedAt: "2024-01-01T10:00:00.000Z",
        endedAt: "2024-01-01T10:15:00.000Z",
        amountMl: 150,
        milkType: "formula",
        notes: "ok",
      },
    ])

    const result = await fetchFeedSessions("b1")

    expect(gql.getFeedingSessions).toHaveBeenCalledWith("b1")
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: "g1",
      baby_id: "b1",
      feed_type: "bottle",
      amount_ml: 150,
      milk_type: "formula",
      notes: "ok",
    })
    expect(useAppStore.getState().setFeedSessions).toHaveBeenCalledWith(result)
  })

  it("creates a feed session and adds it to the store", async () => {
    ;(gql.createFeedingSession as jest.Mock).mockResolvedValue({
      id: "c1",
      babyId: "b1",
      feedType: "breast",
      startedAt: "2024-01-01T10:00:00.000Z",
      leftDurationSec: 120,
      rightDurationSec: 0,
    })

    const result = await createFeedSession({
      baby_id: "b1",
      feed_type: "breast",
      left_duration_sec: 120,
    })

    expect(gql.createFeedingSession).toHaveBeenCalledWith(
      expect.objectContaining({ babyId: "b1", feedType: "breast", leftDurationSec: 120 }),
    )
    expect(useAppStore.getState().addFeedSession).toHaveBeenCalledWith(
      expect.objectContaining({ id: "c1", feed_type: "breast" }),
    )
    expect(result.id).toBe("c1")
  })

  it("creates a solids session with food name and reaction", async () => {
    ;(gql.createFeedingSession as jest.Mock).mockResolvedValue({
      id: "c2",
      babyId: "b1",
      feedType: "solids",
      startedAt: "2024-01-01T10:00:00.000Z",
      foodName: "Banana",
      reaction: "loved",
    })

    await createFeedSession({
      baby_id: "b1",
      feed_type: "solids",
      food_name: "Banana",
      reaction: "loved",
    })

    expect(gql.createFeedingSession).toHaveBeenCalledWith(
      expect.objectContaining({ foodName: "Banana", reaction: "loved" }),
    )
  })

  it("deletes a feed session via GraphQL and the store", async () => {
    ;(gql.deleteFeedingSession as jest.Mock).mockResolvedValue(undefined)

    await deleteFeedSession("d1")

    expect(gql.deleteFeedingSession).toHaveBeenCalledWith("d1")
    expect(useAppStore.getState().deleteFeedSession).toHaveBeenCalledWith("d1")
  })
})

export type { FeedSession }
