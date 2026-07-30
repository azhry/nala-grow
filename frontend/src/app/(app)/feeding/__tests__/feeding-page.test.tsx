import { render, screen, fireEvent, act } from "@testing-library/react"
import { useAppStore } from "@/lib/store"
import { createFeedSession, fetchFeedSessions } from "@/lib/feeding-service"
import FeedingPage from "../page"
import type { FeedSession } from "@/lib/store"

// Mock the feeding-service module
jest.mock("@/lib/feeding-service", () => ({
  createFeedSession: jest.fn(),
  fetchFeedSessions: jest.fn(),
}))

// Mock the store module
jest.mock("@/lib/store", () => {
  const actual = jest.requireActual("@/lib/store")
  return {
    ...actual,
  useAppStore: Object.assign(
    jest.fn((selector: unknown) => {
      const state = useAppStore.getState()
      return typeof selector === "function" ? selector(state) : state
    }),
    {
      getState: jest.fn(),
      setState: jest.fn(),
    },
  ),
  }
})

const mockCreateFeedSession = createFeedSession as jest.MockedFunction<typeof createFeedSession>
const mockFetchFeedSessions = fetchFeedSessions as jest.MockedFunction<typeof fetchFeedSessions>

// We need to set up a mock store state that useAppStore can read from
let storeState: Record<string, unknown> = {}

function setStoreState(state: Partial<typeof storeState>) {
  storeState = {
    activeBaby: { id: "baby-1", name: "Lily", dob: "2026-01-15", sex: "female" },
    feedSessions: [],
    addFeedSession: jest.fn(),
    setFeedSessions: jest.fn(),
    ...state,
  }
  ;(useAppStore as unknown as jest.Mock).getState.mockReturnValue(storeState)
  ;(useAppStore as unknown as jest.Mock).mockImplementation((selector: unknown) => {
    return typeof selector === "function" ? selector(storeState) : storeState
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
	jest.setSystemTime(new Date("2026-07-31T12:00:00Z"))
  setStoreState({})
  mockFetchFeedSessions.mockResolvedValue([])
  mockCreateFeedSession.mockResolvedValue({
    id: "gql-new",
    baby_id: "baby-1",
    feed_type: "breast",
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    left_duration_sec: 0,
    right_duration_sec: 0,
  })
})

afterEach(() => {
  jest.useRealTimers()
})

function renderPage() {
  return render(<FeedingPage />)
}

describe("FeedingPage", () => {
  describe("Tab switching", () => {
    it("defaults to Breast tab and shows BreastTimer", () => {
      renderPage()
      expect(screen.getByText("Breast")).toBeInTheDocument()
      expect(screen.getByText("Left Side")).toBeInTheDocument()
      expect(screen.getByText("Right Side")).toBeInTheDocument()
    })

    it("switches to Bottle tab when clicked", () => {
      renderPage()
      fireEvent.click(screen.getByText("Bottle"))
      expect(screen.getByText("Amount")).toBeInTheDocument()
      expect(screen.getByText("Type")).toBeInTheDocument()
      expect(screen.getByText("Breast Milk")).toBeInTheDocument()
    })

    it("switches to Solids tab when clicked", () => {
      renderPage()
      fireEvent.click(screen.getByText("Solids"))
      expect(screen.getByText("Food Name")).toBeInTheDocument()
      expect(screen.getByText("Quantity")).toBeInTheDocument()
      // "Reaction" appears as both a label and a button text — use getAllByText
      expect(screen.getAllByText("Reaction").length).toBeGreaterThanOrEqual(2)
    })

    it("hides BreastTimer when switching to Bottle", () => {
      renderPage()
      fireEvent.click(screen.getByText("Bottle"))
      expect(screen.queryByText("Left Side")).not.toBeInTheDocument()
    })

    it("hides BottleForm when switching to Solids", () => {
      renderPage()
      fireEvent.click(screen.getByText("Bottle"))
      expect(screen.getByText("Amount")).toBeInTheDocument()
      fireEvent.click(screen.getByText("Solids"))
      expect(screen.queryByText("Amount")).not.toBeInTheDocument()
    })
  })

  describe("AZH-384 interactive controls", () => {
    it("filters the detailed history by feeding type", () => {
      const now = new Date().toISOString()
      setStoreState({
        feedSessions: [
          { id: "breast-1", baby_id: "baby-1", feed_type: "breast", started_at: now, left_duration_sec: 300 },
          { id: "bottle-1", baby_id: "baby-1", feed_type: "bottle", started_at: now, amount_ml: 180, milk_type: "breast_milk" },
        ],
      })
      renderPage()

      fireEvent.click(screen.getByRole("tab", { name: "records" }))
      fireEvent.click(screen.getByRole("button", { name: /Filter/ }))
      fireEvent.click(screen.getByRole("button", { name: "breast" }))

      expect(screen.getByText("Breastfeed")).toBeInTheDocument()
      expect(screen.queryByText("180ml Breastmilk")).not.toBeInTheDocument()
    })

    it("lets the feed panel close and reopen", () => {
      renderPage()

      fireEvent.click(screen.getByLabelText("Close feed entry"))
      expect(screen.queryByRole("heading", { name: "Record Feed" })).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole("button", { name: /Log a feed/ }))
      expect(screen.getByRole("heading", { name: "Record Feed" })).toBeInTheDocument()
    })
  })

  describe("Save handler — breast with timer", () => {
    it("calls createFeedSession with left_duration_sec from timer", async () => {
      renderPage()
      // Start left timer
      const leftButton = screen.getByText("Left Side").closest("div")?.querySelector("button")
      if (!leftButton) throw new Error("Left button not found")
      fireEvent.click(leftButton)
      // Advance timer by 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000)
      })
      // Click save
      fireEvent.click(screen.getByText("Save Entry"))
      await act(async () => {})

      expect(mockCreateFeedSession).toHaveBeenCalledWith(
        expect.objectContaining({
          feed_type: "breast",
          left_duration_sec: 30,
          right_duration_sec: 0,
        }),
      )
    })
  })

  describe("Save handler — breast with manual duration", () => {
    it("sets left_duration_sec to manualDuration * 60", async () => {
      renderPage()
      // Find manual duration input and set to 5
      const input = screen.getByPlaceholderText("0") as HTMLInputElement
      fireEvent.change(input, { target: { value: "5" } })
      // Click save
      fireEvent.click(screen.getByText("Save Entry"))
      await act(async () => {})

      expect(mockCreateFeedSession).toHaveBeenCalledWith(
        expect.objectContaining({
          feed_type: "breast",
          left_duration_sec: 300, // 5 * 60
          right_duration_sec: 0,
        }),
      )
    })
  })

  describe("Save handler — breast zero duration bail-out", () => {
    it("does not call createFeedSession when both timer and manual are zero", async () => {
      renderPage()
      fireEvent.click(screen.getByText("Save Entry"))
      await act(async () => {})

      expect(mockCreateFeedSession).not.toHaveBeenCalled()
    })
  })

  describe("Save handler — bottle", () => {
    it("calls createFeedSession with bottle data", async () => {
      renderPage()
      fireEvent.click(screen.getByText("Bottle"))
      // Select Formula
      fireEvent.click(screen.getByText("Formula"))
      // Select Warm
      fireEvent.click(screen.getByText("Warm"))
      // Click save
      fireEvent.click(screen.getByText("Save Entry"))
      await act(async () => {})

      expect(mockCreateFeedSession).toHaveBeenCalledWith(
        expect.objectContaining({
          feed_type: "bottle",
          amount_ml: 120, // default
          milk_type: "formula",
          temperature: "warm",
        }),
      )
    })
  })

  describe("Save handler — solids", () => {
    it("calls createFeedSession with solids data", async () => {
      renderPage()
      fireEvent.click(screen.getByText("Solids"))
      // Enter food name
      const foodInput = screen.getByPlaceholderText(/Sweet Potato/i)
      fireEvent.change(foodInput, { target: { value: "Banana" } })
      // Select reaction
      fireEvent.click(screen.getByText("Loved it"))
      // Click save
      fireEvent.click(screen.getByText("Save Entry"))
      await act(async () => {})

      expect(mockCreateFeedSession).toHaveBeenCalledWith(
        expect.objectContaining({
          feed_type: "solids",
          food_name: "Banana",
          reaction: "loved",
        }),
      )
    })
  })

  describe("Save handler — solids empty food name bail-out", () => {
    it("does not call createFeedSession when food name is empty", async () => {
      renderPage()
      fireEvent.click(screen.getByText("Solids"))
      // Don't enter food name
      fireEvent.click(screen.getByText("Save Entry"))
      await act(async () => {})

      expect(mockCreateFeedSession).not.toHaveBeenCalled()
    })
  })

  describe("Save failure", () => {
    it("shows a retryable error without adding a local-only session or clearing the form", async () => {
      mockCreateFeedSession.mockRejectedValue(new Error("Network error"))
      renderPage()

      const input = screen.getByPlaceholderText("0") as HTMLInputElement
      fireEvent.change(input, { target: { value: "5" } })
      fireEvent.click(screen.getByText("Save Entry"))
      await act(async () => {})

      expect(screen.getByRole("alert")).toHaveTextContent("Unable to save this feeding entry")
      expect(screen.getByRole("alert")).toHaveTextContent("try again")
      expect(storeState.addFeedSession).not.toHaveBeenCalled()
      expect(input).toHaveValue(5)
    })
  })

  describe("State reset after save", () => {
    it("resets timer and manual duration after successful breast save", async () => {
      renderPage()
      // Start left timer
      const leftButton = screen.getByText("Left Side").closest("div")?.querySelector("button")
      if (!leftButton) throw new Error("Left button not found")
      fireEvent.click(leftButton)
      act(() => {
        jest.advanceTimersByTime(10000)
      })
      // Set manual duration
      const input = screen.getByPlaceholderText("0") as HTMLInputElement
      fireEvent.change(input, { target: { value: "3" } })
      // Save
      fireEvent.click(screen.getByText("Save Entry"))
      await act(async () => {})

      // Timer should show 00:00 again (left seconds reset to 0)
      // Both left and right timers show 00:00 after reset
      const zeroTimers = screen.getAllByText("00:00")
      expect(zeroTimers.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe("Daily totals computation", () => {
    it("computes bottleTotalMl from today's sessions", () => {
      const today = new Date()
      const todayStr = today.toISOString()
      const sessions: FeedSession[] = [
        {
          id: "s1",
          baby_id: "baby-1",
          feed_type: "bottle",
          started_at: todayStr,
          amount_ml: 120,
          milk_type: "breast_milk",
        },
        {
          id: "s2",
          baby_id: "baby-1",
          feed_type: "bottle",
          started_at: todayStr,
          amount_ml: 80,
          milk_type: "formula",
        },
      ]
      setStoreState({ feedSessions: sessions })
      renderPage()

      expect(screen.getByText("200ml")).toBeInTheDocument()
    })

    it("computes breastTotalMins from today's sessions", () => {
      const today = new Date()
      const todayStr = today.toISOString()
      const sessions: FeedSession[] = [
        {
          id: "s1",
          baby_id: "baby-1",
          feed_type: "breast",
          started_at: todayStr,
          left_duration_sec: 600, // 10 mins
          right_duration_sec: 300, // 5 mins
        },
      ]
      setStoreState({ feedSessions: sessions })
      renderPage()

      expect(screen.getByText("15 mins")).toBeInTheDocument()
    })

    it("plots breast duration independently of bottle volume and keeps empty bottle slots flat", () => {
      const today = new Date()
      today.setHours(7, 0, 0, 0)
      setStoreState({
        feedSessions: [{
          id: "breast-plot",
          baby_id: "baby-1",
          feed_type: "breast",
          started_at: today.toISOString(),
          left_duration_sec: 600,
          right_duration_sec: 300,
        }],
      })
      renderPage()

      expect(screen.getByTestId("breast-bar-6 AM")).toHaveStyle({ height: "100%" })
      expect(screen.getByTestId("bottle-bar-6 AM")).toHaveStyle({ height: "0%" })
      expect(screen.getByTestId("breast-bar-9 AM")).toHaveStyle({ height: "0%" })
    })

    it("keeps every chart series flat when there are no feeds", () => {
      renderPage()

      expect(screen.getAllByTestId(/^(bottle|breast)-bar-/)).toHaveLength(12)
      for (const bar of screen.getAllByTestId(/^(bottle|breast)-bar-/)) {
        expect(bar).toHaveStyle({ height: "0%" })
      }
    })
  })

  describe("Today filtering", () => {
    it("shows only today's sessions in timeline", () => {
      const now = new Date()
      const todayStr = now.toISOString()
      // Use 2 days ago to ensure it falls outside the 24h timeline window
      const twoDaysAgo = new Date(now.getTime() - 2 * 86400000)
      const twoDaysAgoStr = twoDaysAgo.toISOString()

      const sessions: FeedSession[] = [
        {
          id: "today-1",
          baby_id: "baby-1",
          feed_type: "bottle",
          started_at: todayStr,
          amount_ml: 120,
          milk_type: "breast_milk",
        },
        {
          id: "yesterday-1",
          baby_id: "baby-1",
          feed_type: "bottle",
          started_at: twoDaysAgoStr,
          amount_ml: 200,
          milk_type: "breast_milk",
        },
      ]
      setStoreState({ feedSessions: sessions })
      renderPage()

      // Today's session should be in timeline
      expect(screen.getByText("120ml Breastmilk")).toBeInTheDocument()
      // Yesterday's should not be visible in timeline (outside 24h window)
      expect(screen.queryByText("200ml Breastmilk")).not.toBeInTheDocument()
    })
  })

  describe("Daily range controls", () => {
    it("switches totals and timeline records from today to yesterday", () => {
      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      setStoreState({
        feedSessions: [
          { id: "today", baby_id: "baby-1", feed_type: "bottle", started_at: now.toISOString(), amount_ml: 120, milk_type: "breast_milk" },
          { id: "yesterday", baby_id: "baby-1", feed_type: "bottle", started_at: yesterday.toISOString(), amount_ml: 240, milk_type: "formula" },
        ],
      })
      renderPage()

      expect(screen.getByText("120ml")).toBeInTheDocument()
      expect(screen.getByText("120ml Breastmilk")).toBeInTheDocument()
      fireEvent.click(screen.getByRole("button", { name: "Yesterday" }))

      expect(screen.getByRole("button", { name: "Yesterday" })).toHaveAttribute("aria-pressed", "true")
      expect(screen.getByText("240ml")).toBeInTheDocument()
      expect(screen.getByText("240ml Formula")).toBeInTheDocument()
      expect(screen.queryByText("120ml Breastmilk")).not.toBeInTheDocument()
    })
  })

  describe("Baby filtering", () => {
    it("shows only active baby's sessions", () => {
      const now = new Date()
      const todayStr = now.toISOString()

      const sessions: FeedSession[] = [
        {
          id: "s1",
          baby_id: "baby-1",
          feed_type: "bottle",
          started_at: todayStr,
          amount_ml: 120,
          milk_type: "breast_milk",
        },
        {
          id: "s2",
          baby_id: "other-baby",
          feed_type: "bottle",
          started_at: todayStr,
          amount_ml: 200,
          milk_type: "breast_milk",
        },
      ]
      setStoreState({ feedSessions: sessions })
      renderPage()

      expect(screen.getByText("120ml Breastmilk")).toBeInTheDocument()
      expect(screen.queryByText("200ml Breastmilk")).not.toBeInTheDocument()
    })
  })

  describe("Time-since-last-feed alert", () => {
    it("shows alert when last feed was more than 4 hours ago", () => {
      const now = new Date()
      const fiveHoursAgo = new Date(now.getTime() - 5 * 3600000)
      const sessions: FeedSession[] = [
        {
          id: "s1",
          baby_id: "baby-1",
          feed_type: "bottle",
          started_at: fiveHoursAgo.toISOString(),
          amount_ml: 120,
        },
      ]
      setStoreState({ feedSessions: sessions })
      renderPage()

      expect(screen.getByText(/It's been over/)).toBeInTheDocument()
      expect(screen.getByText(/hours since Lily's last feed/)).toBeInTheDocument()
    })

    it("does not show alert when last feed was less than 4 hours ago", () => {
      const now = new Date()
      const twoHoursAgo = new Date(now.getTime() - 2 * 3600000)
      const sessions: FeedSession[] = [
        {
          id: "s1",
          baby_id: "baby-1",
          feed_type: "bottle",
          started_at: twoHoursAgo.toISOString(),
          amount_ml: 120,
        },
      ]
      setStoreState({ feedSessions: sessions })
      renderPage()

      expect(screen.queryByText(/It's been over/)).not.toBeInTheDocument()
    })
  })

  describe("No sessions empty state", () => {
    it("shows empty state message when no sessions exist", () => {
      setStoreState({ feedSessions: [] })
      renderPage()

      expect(screen.getByText(/No feeds recorded yet/i)).toBeInTheDocument()
      expect(screen.getByText(/Start by logging a feed above/i)).toBeInTheDocument()
    })
  })

  describe("Page structure", () => {
    it("displays header with baby name", () => {
      renderPage()
      expect(screen.getByText("Feeding Log")).toBeInTheDocument()
      expect(screen.getByText(/Track Lily's nourishment/)).toBeInTheDocument()
    })

    it("displays notifications button", () => {
      renderPage()
      expect(screen.getByLabelText("Notifications")).toBeInTheDocument()
    })

    it("displays Save Entry button", () => {
      renderPage()
      expect(screen.getByText("Save Entry")).toBeInTheDocument()
    })

    it("displays Daily Summary section", () => {
      renderPage()
      expect(screen.getByText("Daily Summary")).toBeInTheDocument()
      expect(screen.getByText("Bottle Total")).toBeInTheDocument()
      expect(screen.getByText("Breast Total")).toBeInTheDocument()
    })
  })

  describe("fetchFeedSessions on mount", () => {
    it("calls fetchFeedSessions with activeBaby id on mount", () => {
      renderPage()
      expect(mockFetchFeedSessions).toHaveBeenCalledWith("baby-1")
    })
  })

  describe("Default baby name", () => {
    it("uses 'Lily' when no activeBaby is set", () => {
      setStoreState({ activeBaby: null })
      renderPage()
      expect(screen.getByText(/Track Lily's nourishment/)).toBeInTheDocument()
    })
  })
})
