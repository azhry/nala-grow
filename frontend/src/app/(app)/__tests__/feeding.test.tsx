import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import FeedingPage from "../../(app)/feeding/page"
import type { FeedSession } from "@/lib/store"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

let storeState: Record<string, unknown> = {}

jest.mock("@/lib/store", () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) => selector(storeState),
}))

const fetchFeedSessionsMock = jest.fn()
const createFeedSessionMock = jest.fn()

jest.mock("@/lib/feeding-service", () => ({
  fetchFeedSessions: (...args: unknown[]) => fetchFeedSessionsMock(...args),
  createFeedSession: (...args: unknown[]) => createFeedSessionMock(...args),
}))

describe("FeedingPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    storeState = {
      activeBaby: { id: "b1", name: "Lily", dob: "2024-01-10", sex: "female" },
      feedSessions: [] as FeedSession[],
      addFeedSession: jest.fn((s: FeedSession) => {
        ;(storeState.feedSessions as FeedSession[]).push(s)
      }),
      setFeedSessions: jest.fn((s: FeedSession[]) => {
        storeState.feedSessions = s
      }),
    }
    fetchFeedSessionsMock.mockResolvedValue([])
  })

  it("renders the Feeding Log heading", () => {
    render(<FeedingPage />)
    expect(screen.getByText("Feeding Log")).toBeInTheDocument()
  })

  it("fetches feed sessions for the active baby on mount", () => {
    render(<FeedingPage />)
    expect(fetchFeedSessionsMock).toHaveBeenCalledWith("b1")
  })

  it("shows the time-since-last-feed alert when >4h since last feed", async () => {
    const over4hAgo = new Date(Date.now() - 5 * 3600 * 1000).toISOString()
    ;(storeState.feedSessions as FeedSession[]) = [
      {
        id: "old",
        baby_id: "b1",
        feed_type: "bottle",
        started_at: over4hAgo,
        amount_ml: 100,
        milk_type: "breast_milk",
      },
    ]
    render(<FeedingPage />)
    await waitFor(() => {
      expect(screen.getByText(/over 5 hours since/i)).toBeInTheDocument()
    })
  })

  it("does not show the alert when the last feed was recent", async () => {
    const recent = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    ;(storeState.feedSessions as FeedSession[]) = [
      {
        id: "recent",
        baby_id: "b1",
        feed_type: "bottle",
        started_at: recent,
        amount_ml: 100,
        milk_type: "breast_milk",
      },
    ]
    render(<FeedingPage />)
    await waitFor(() => {
      expect(screen.queryByText(/over .* hours since/i)).not.toBeInTheDocument()
    })
  })

  it("aggregates daily bottle totals from today's sessions", async () => {
    const today = new Date()
    const make = (id: string, ml: number) => ({
      id,
      baby_id: "b1",
      feed_type: "bottle" as const,
      started_at: today.toISOString(),
      amount_ml: ml,
      milk_type: "breast_milk" as const,
    })
    ;(storeState.feedSessions as FeedSession[]) = [make("a", 100), make("b", 120)]
    render(<FeedingPage />)
    await waitFor(() => {
      expect(screen.getByText("220ml")).toBeInTheDocument()
    })
  })

  it("aggregates daily breast totals from today's sessions", async () => {
    const today = new Date()
    const make = (id: string, left: number, right: number) => ({
      id,
      baby_id: "b1",
      feed_type: "breast" as const,
      started_at: today.toISOString(),
      left_duration_sec: left,
      right_duration_sec: right,
    })
    ;(storeState.feedSessions as FeedSession[]) = [make("a", 120, 60), make("b", 60, 60)]
    render(<FeedingPage />)
    await waitFor(() => {
      expect(screen.getByText("5 mins")).toBeInTheDocument()
    })
  })

  it("calls createFeedSession when saving a bottle feed", async () => {
    createFeedSessionMock.mockResolvedValue({ id: "new" })
    render(<FeedingPage />)
    fireEvent.click(screen.getByText("Bottle"))
    fireEvent.click(screen.getByText("Save Entry"))
    await waitFor(() => {
      expect(createFeedSessionMock).toHaveBeenCalledWith(
        expect.objectContaining({ feed_type: "bottle", amount_ml: 120 }),
      )
    })
  })

  it("requires a food name before saving a solids feed", async () => {
    createFeedSessionMock.mockResolvedValue({ id: "new" })
    render(<FeedingPage />)
    fireEvent.click(screen.getByText("Solids"))
    fireEvent.click(screen.getByText("Save Entry"))
    expect(createFeedSessionMock).not.toHaveBeenCalled()
  })

  it("calls createFeedSession with food name when saving a solids feed", async () => {
    createFeedSessionMock.mockResolvedValue({ id: "new" })
    render(<FeedingPage />)
    fireEvent.click(screen.getByText("Solids"))
    fireEvent.change(screen.getByPlaceholderText("e.g. Sweet Potato"), {
      target: { value: "Banana" },
    })
    fireEvent.click(screen.getByText("Save Entry"))
    await waitFor(() => {
      expect(createFeedSessionMock).toHaveBeenCalledWith(
        expect.objectContaining({ feed_type: "solids", food_name: "Banana" }),
      )
    })
  })

  it("falls back to local addFeedSession when backend save fails", async () => {
    createFeedSessionMock.mockRejectedValue(new Error("network"))
    render(<FeedingPage />)
    fireEvent.click(screen.getByText("Bottle"))
    fireEvent.click(screen.getByText("Save Entry"))
    await waitFor(() => {
      expect(storeState.addFeedSession).toHaveBeenCalledWith(
        expect.objectContaining({ feed_type: "bottle" }),
      )
    })
  })

  it("toggles the breast timer side when clicking a side button", () => {
    render(<FeedingPage />)
    const sideToggle = screen.getAllByText("play_circle")[0].closest("button") as HTMLElement
    fireEvent.click(sideToggle)
    expect(screen.getByText("pause_circle")).toBeInTheDocument()
  })
})
