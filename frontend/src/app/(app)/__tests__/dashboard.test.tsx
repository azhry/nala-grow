import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ButtonHTMLAttributes, ReactNode } from "react"
import DashboardPage from "../dashboard/page"

jest.mock("@/components/ui", () => ({ FAB: ({ icon, onClick, ...props }: { icon: string; onClick?: () => void } & ButtonHTMLAttributes<HTMLButtonElement>) => <button data-testid="fab" onClick={onClick} {...props}><span>{icon}</span></button> }))
jest.mock("@/components/providers/quick-log-provider", () => ({ useQuickLog: () => ({ openLog: jest.fn() }), QuickLogProvider: ({ children }: { children: ReactNode }) => <>{children}</> }))

let storeState: Record<string, unknown>
jest.mock("@/lib/store", () => ({ useAppStore: (selector: (state: Record<string, unknown>) => unknown) => selector(storeState) }))

const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
const todayAt = (hour: number, minute = 0) => `${today}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`

describe("DashboardPage", () => {
  beforeEach(() => {
    storeState = { activeBaby: { id: "1", name: "Maya", dob: "2024-01-10", sex: "female" }, feedSessions: [], sleepSessions: [], measurements: [] }
  })

  it("renders truthful empty summaries and does not invent activities", () => {
    render(<DashboardPage />)
    expect(screen.getByText(/No events logged today yet/i)).toBeInTheDocument()
    expect(screen.getByText("No feeds yet")).toBeInTheDocument()
    expect(screen.getByText(/No activity logged for Maya today/i)).toBeInTheDocument()
    expect(screen.queryByText("Diaper Change")).not.toBeInTheDocument()
  })

  it("derives feed summary, activity, and status from the active baby's store data", () => {
    storeState.feedSessions = [{ id: "feed-1", baby_id: "1", feed_type: "breast", started_at: todayAt(10), left_duration_sec: 900, position: "left" }]
    storeState.sleepSessions = [{ id: "other", baby_id: "other-baby", started_at: todayAt(11), ended_at: todayAt(12) }]
    render(<DashboardPage />)
    expect(screen.getByText(/You’ve logged 1 event today/i)).toBeInTheDocument()
    expect(screen.getByText("Breastfeed")).toBeInTheDocument()
    expect(screen.getByText(/15 min/i)).toBeInTheDocument()
    expect(screen.getByText(/Total today: 1 feeds/i)).toBeInTheDocument()
  })

  it("marks an old feed as overdue instead of using a static green status", () => {
    storeState.feedSessions = [{ id: "feed-1", baby_id: "1", feed_type: "bottle", started_at: "2020-01-01T10:00:00", amount_ml: 120 }]
    render(<DashboardPage />)
    expect(screen.getAllByText("Feed overdue").length).toBeGreaterThan(0)
    expect(screen.queryByText("Green Status")).not.toBeInTheDocument()
  })

  it("shows all store-backed activities and toggles the list", async () => {
    const user = userEvent.setup()
    storeState.feedSessions = Array.from({ length: 4 }, (_, index) => ({ id: `feed-${index}`, baby_id: "1", feed_type: "bottle" as const, started_at: todayAt(12, index), amount_ml: 90 }))
    render(<DashboardPage />)
    expect(screen.getByRole("button", { name: "View All" })).toHaveAttribute("aria-expanded", "false")
    await user.click(screen.getByRole("button", { name: "View All" }))
    expect(screen.getByRole("button", { name: "Show Less" })).toHaveAttribute("aria-expanded", "true")
  })

  it("opens each quick-action summary and closes it again", async () => {
    const user = userEvent.setup()
    render(<DashboardPage />)
    for (const [label, heading] of [["Log Feed", "Feed Summary"], ["Log Sleep", "Sleep Summary"], ["Log Growth", "Growth Summary"]]) {
      await user.click(screen.getByRole("button", { name: label }))
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: "Close" }))
    }
  })

  it("exposes mobile scroll affordance and a quick-log FAB", () => {
    render(<DashboardPage />)
    expect(screen.getByText("Swipe for more actions")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Open quick logging actions" })).toBeInTheDocument()
  })

  it("renders a neutral profile prompt without an active baby", () => {
    storeState.activeBaby = null
    render(<DashboardPage />)
    expect(screen.getByText(/Choose a baby profile/i)).toBeInTheDocument()
  })
})
