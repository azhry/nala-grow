import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ButtonHTMLAttributes, ReactNode } from "react"
import DashboardPage from "../dashboard/page"
import { getFeedingSessions, getMeasurements, getSleepSessions } from "@/lib/graphql-client"

jest.mock("@/components/ui", () => ({ FAB: ({ icon, onClick, ...props }: { icon: string; onClick?: () => void } & ButtonHTMLAttributes<HTMLButtonElement>) => <button data-testid="fab" onClick={onClick} {...props}><span>{icon}</span></button> }))
jest.mock("@/components/providers/quick-log-provider", () => ({ useQuickLog: () => ({ openLog: jest.fn() }), QuickLogProvider: ({ children }: { children: ReactNode }) => <>{children}</> }))
jest.mock("@/lib/graphql-client", () => ({ getFeedingSessions: jest.fn(), getSleepSessions: jest.fn(), getMeasurements: jest.fn() }))

let storeState: Record<string, unknown>
jest.mock("@/lib/store", () => ({ useAppStore: (selector: (state: Record<string, unknown>) => unknown) => selector(storeState) }))

const fetchFeeds = getFeedingSessions as jest.MockedFunction<typeof getFeedingSessions>
const fetchSleeps = getSleepSessions as jest.MockedFunction<typeof getSleepSessions>
const fetchMeasurements = getMeasurements as jest.MockedFunction<typeof getMeasurements>
const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

describe("DashboardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    storeState = { activeBaby: { id: "baby-1", name: "Maya", dob: "2024-01-10", sex: "female" } }
    fetchFeeds.mockResolvedValue([])
    fetchSleeps.mockResolvedValue([])
    fetchMeasurements.mockResolvedValue([])
  })

  it("loads all dashboard queries for the active baby and maps their results", async () => {
    fetchFeeds.mockResolvedValue([{ id: "feed-1", babyId: "baby-1", feedType: "breast", startedAt: `${today}T10:00:00`, endedAt: "", leftDurationSec: 900, rightDurationSec: 0, amountMl: 0, milkType: "", foodName: "", reaction: "", notes: "", createdAt: `${today}T10:15:00` }])
    fetchSleeps.mockResolvedValue([{ id: "sleep-1", babyId: "baby-1", startedAt: `${today}T08:00:00`, endedAt: `${today}T09:00:00`, location: "crib", notes: "", createdAt: `${today}T09:00:00` }])
    fetchMeasurements.mockResolvedValue([{ id: "measurement-1", babyId: "baby-1", date: today, weight: 6.4, height: 63.5, headCircumference: 41.2, createdAt: `${today}T10:00:00` }])

    render(<DashboardPage />)

    expect(screen.getByRole("status")).toHaveTextContent("Loading dashboard records")
    await waitFor(() => expect(fetchFeeds).toHaveBeenCalledWith("baby-1"))
    expect(fetchSleeps).toHaveBeenCalledWith("baby-1")
    expect(fetchMeasurements).toHaveBeenCalledWith("baby-1")
    expect(await screen.findByText("Breastfeed")).toBeInTheDocument()
    expect(screen.getByText("6.4 kg")).toBeInTheDocument()
    expect(screen.getAllByText(/1.0h/).length).toBeGreaterThan(0)
    expect(screen.queryByText("Diaper Change")).not.toBeInTheDocument()
  })

  it("reloads the dashboard when the active baby changes", async () => {
    render(<DashboardPage />)
    await waitFor(() => expect(fetchFeeds).toHaveBeenCalledWith("baby-1"))
    storeState.activeBaby = { id: "baby-2", name: "Ira", dob: "2024-02-10", sex: "female" }
    render(<DashboardPage />)
    await waitFor(() => expect(fetchFeeds).toHaveBeenCalledWith("baby-2"))
    expect(fetchSleeps).toHaveBeenCalledWith("baby-2")
    expect(fetchMeasurements).toHaveBeenCalledWith("baby-2")
  })

  it("shows a retryable request-failure state", async () => {
    const user = userEvent.setup()
    fetchFeeds.mockRejectedValueOnce(new Error("offline"))
    render(<DashboardPage />)
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load dashboard records")
    await user.click(screen.getByRole("button", { name: "Retry" }))
    await waitFor(() => expect(fetchFeeds).toHaveBeenCalledTimes(2))
  })

  it("shows truthful empty summaries after all queries return no records", async () => {
    render(<DashboardPage />)
    expect(await screen.findByText(/No events logged today yet/i)).toBeInTheDocument()
    expect(screen.getByText("No feeds yet")).toBeInTheDocument()
    expect(screen.getByText(/No activity logged for Maya today/i)).toBeInTheDocument()
  })

  it("opens each quick-action summary and closes it again", async () => {
    const user = userEvent.setup()
    render(<DashboardPage />)
    await screen.findByText(/No events logged today yet/i)
    for (const [label, heading] of [["Log Feed", "Feed Summary"], ["Log Sleep", "Sleep Summary"], ["Log Growth", "Growth Summary"]]) {
      await user.click(screen.getByRole("button", { name: label }))
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: "Close" }))
    }
  })

  it("renders a neutral profile prompt without fetching when no baby is active", () => {
    storeState.activeBaby = null
    render(<DashboardPage />)
    expect(screen.getByText(/Choose a baby profile/i)).toBeInTheDocument()
    expect(fetchFeeds).not.toHaveBeenCalled()
  })
})
