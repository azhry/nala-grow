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

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

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
    const { rerender } = render(<DashboardPage />)
    await waitFor(() => expect(fetchFeeds).toHaveBeenCalledWith("baby-1"))
    storeState.activeBaby = { id: "baby-2", name: "Ira", dob: "2024-02-10", sex: "female" }
    rerender(<DashboardPage />)
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

  it("recovers from one failed dashboard query without retaining the error after retry", async () => {
    const user = userEvent.setup()
    fetchSleeps.mockRejectedValueOnce(new Error("service unavailable"))
    fetchFeeds.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "feed-retry", babyId: "baby-1", feedType: "bottle", startedAt: `${today}T10:00:00`, endedAt: "", leftDurationSec: 0, rightDurationSec: 0, amountMl: 120, milkType: "breast_milk", foodName: "", reaction: "", notes: "", createdAt: `${today}T10:00:00` }])

    render(<DashboardPage />)

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load dashboard records")
    await user.click(screen.getByRole("button", { name: "Retry" }))

    expect(await screen.findByText("120 ml bottle")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(fetchFeeds).toHaveBeenCalledTimes(2)
    expect(fetchSleeps).toHaveBeenCalledTimes(2)
    expect(fetchMeasurements).toHaveBeenCalledTimes(2)
  })

  it("ignores a late response for a previously selected baby", async () => {
    const firstFeeds = deferred<Awaited<ReturnType<typeof getFeedingSessions>>>()
    const firstSleeps = deferred<Awaited<ReturnType<typeof getSleepSessions>>>()
    const firstMeasurements = deferred<Awaited<ReturnType<typeof getMeasurements>>>()
    fetchFeeds.mockImplementationOnce(() => firstFeeds.promise).mockResolvedValueOnce([{ id: "feed-new", babyId: "baby-2", feedType: "bottle", startedAt: `${today}T10:00:00`, endedAt: "", leftDurationSec: 0, rightDurationSec: 0, amountMl: 90, milkType: "formula", foodName: "", reaction: "", notes: "", createdAt: `${today}T10:00:00` }])
    fetchSleeps.mockImplementationOnce(() => firstSleeps.promise).mockResolvedValueOnce([])
    fetchMeasurements.mockImplementationOnce(() => firstMeasurements.promise).mockResolvedValueOnce([])

    const { rerender } = render(<DashboardPage />)
    await waitFor(() => expect(fetchFeeds).toHaveBeenCalledWith("baby-1"))
    storeState.activeBaby = { id: "baby-2", name: "Ira", dob: "2024-02-10", sex: "female" }
    rerender(<DashboardPage />)

    expect(await screen.findByText("90 ml bottle")).toBeInTheDocument()
    firstFeeds.resolve([{ id: "feed-stale", babyId: "baby-1", feedType: "bottle", startedAt: `${today}T10:30:00`, endedAt: "", leftDurationSec: 0, rightDurationSec: 0, amountMl: 240, milkType: "formula", foodName: "", reaction: "", notes: "", createdAt: `${today}T10:30:00` }])
    firstSleeps.resolve([])
    firstMeasurements.resolve([])

    await waitFor(() => expect(screen.queryByText("240 ml bottle")).not.toBeInTheDocument())
    expect(screen.getByText("90 ml bottle")).toBeInTheDocument()
  })

  it("does not render records returned for a different baby", async () => {
    fetchFeeds.mockResolvedValue([{ id: "foreign-feed", babyId: "baby-2", feedType: "bottle", startedAt: `${today}T10:00:00`, endedAt: "", leftDurationSec: 0, rightDurationSec: 0, amountMl: 500, milkType: "formula", foodName: "", reaction: "", notes: "", createdAt: `${today}T10:00:00` }])
    fetchSleeps.mockResolvedValue([{ id: "foreign-sleep", babyId: "baby-2", startedAt: `${today}T08:00:00`, endedAt: `${today}T09:00:00`, location: "crib", notes: "", createdAt: `${today}T09:00:00` }])
    fetchMeasurements.mockResolvedValue([{ id: "foreign-growth", babyId: "baby-2", date: today, weight: 9.9, height: 70, headCircumference: 44, createdAt: `${today}T10:00:00` }])

    render(<DashboardPage />)

    expect(await screen.findByText(/No events logged today yet/i)).toBeInTheDocument()
    expect(screen.getByText("No feeds yet")).toBeInTheDocument()
    expect(screen.queryByText("500 ml bottle")).not.toBeInTheDocument()
    expect(screen.queryByText("9.9 kg")).not.toBeInTheDocument()
  })

  it("treats zero-valued GraphQL measurements as absent optional values", async () => {
    fetchMeasurements.mockResolvedValue([{ id: "measurement-zero", babyId: "baby-1", date: today, weight: 0, height: 0, headCircumference: 0, createdAt: `${today}T10:00:00` }])

    render(<DashboardPage />)

    expect(await screen.findByText("Growth recorded")).toBeInTheDocument()
    expect(screen.getByText("Measurement logged")).toBeInTheDocument()
    expect(screen.queryByText("0.0 kg")).not.toBeInTheDocument()
    expect(screen.queryByText("0.0 cm")).not.toBeInTheDocument()
  })

  it("treats a malformed query payload as a retryable request failure", async () => {
    const user = userEvent.setup()
    fetchFeeds.mockResolvedValueOnce(undefined as never)
    render(<DashboardPage />)

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load dashboard records")
    await user.click(screen.getByRole("button", { name: "Retry" }))
    expect(await screen.findByText("No feeds yet")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
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

  it("renders coherent demo records without fetching when no baby is active", () => {
    storeState.activeBaby = null
    render(<DashboardPage />)
    expect(screen.getByText(/Lily!/i)).toBeInTheDocument()
    expect(screen.getByText(/You’ve logged \d+ events? today/i)).toBeInTheDocument()
    expect(fetchFeeds).not.toHaveBeenCalled()
  })
})
