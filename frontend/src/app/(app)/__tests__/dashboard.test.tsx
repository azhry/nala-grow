import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ButtonHTMLAttributes, ReactNode } from "react"
import DashboardPage from "../dashboard/page"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock("@/components/ui", () => ({
  FAB: ({
    icon,
    onClick,
    ...props
  }: {
    icon: string
    onClick?: () => void
  } & ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button data-testid="fab" onClick={onClick} {...props}>
      <span>{icon}</span>
    </button>
  ),
}))

jest.mock("@/components/providers/quick-log-provider", () => {
  const openLog = jest.fn()
  return {
    useQuickLog: () => ({ open: false, openLog, closeLog: jest.fn() }),
    QuickLogProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  }
})

let storeState: Record<string, unknown>

jest.mock("@/lib/store", () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector(storeState),
}))

describe("DashboardPage", () => {
  beforeEach(() => {
    storeState = {
      activeBaby: { id: "1", name: "Maya", dob: "2024-01-10", sex: "female" },
    }
  })

  it("renders greeting with baby name", () => {
    render(<DashboardPage />)
    expect(screen.getAllByText(/Maya/i).length).toBeGreaterThanOrEqual(1)
  })

  it("opens quick log for every quick action", async () => {
    const user = userEvent.setup()
    render(<DashboardPage />)

    const buttons = screen.getAllByRole("button", { name: /Log (Feed|Sleep|Growth)/ })
    for (const button of buttons) {
      await user.click(button)
    }

    expect(buttons).toHaveLength(3)
  })

  it("renders bento summary cards", () => {
    render(<DashboardPage />)
    expect(screen.getByText("Last Feed")).toBeInTheDocument()
    expect(screen.getByText("Sleep")).toBeInTheDocument()
    expect(screen.getByText("Growth")).toBeInTheDocument()
  })

  it("renders recent activities section", () => {
    render(<DashboardPage />)
    expect(screen.getAllByText("Breastfeed").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("Nap")).toBeInTheDocument()
    expect(screen.getByText("Diaper Change")).toBeInTheDocument()
  })

  it("expands and collapses the full activity list", async () => {
    const user = userEvent.setup()
    render(<DashboardPage />)

    expect(screen.queryByText("6:30 AM")).not.toBeInTheDocument()
    const toggle = screen.getByRole("button", { name: "View All" })
    expect(toggle).toHaveAttribute("aria-expanded", "false")

    await user.click(toggle)

    expect(screen.getByText("6:30 AM")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Show Less" })).toHaveAttribute("aria-expanded", "true")

    await user.click(screen.getByRole("button", { name: "Show Less" }))

    expect(screen.queryByText("6:30 AM")).not.toBeInTheDocument()
  })

  it("renders daily insight card", () => {
    render(<DashboardPage />)
    expect(screen.getByText("Daily Insight")).toBeInTheDocument()
    expect(screen.getByText(/Consistency is key for nap transitions/i)).toBeInTheDocument()
  })

  it("renders the mobile FAB for quick logging", () => {
    render(<DashboardPage />)
    expect(screen.getByRole("button", { name: "Open quick logging actions" })).toBeInTheDocument()
  })

  it("renders greeting with default name when no active baby", () => {
    storeState.activeBaby = null
    render(<DashboardPage />)
    expect(screen.getByText("Good", { exact: false })).toBeInTheDocument()
  })
})
