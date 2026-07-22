import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ButtonHTMLAttributes } from "react"
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

  it("links every quick action to an implemented feature route", () => {
    render(<DashboardPage />)
    expect(screen.getByRole("link", { name: "Log Feed" })).toHaveAttribute("href", "/feeding")
    expect(screen.getByRole("link", { name: "Log Sleep" })).toHaveAttribute("href", "/sleep")
    expect(screen.getByRole("link", { name: "Log Growth" })).toHaveAttribute("href", "/growth")
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

  it("opens and closes mobile quick logging actions with valid destinations", async () => {
    const user = userEvent.setup()
    render(<DashboardPage />)
    const fab = screen.getByRole("button", { name: "Open quick logging actions" })
    expect(fab).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("navigation", { name: "Quick logging actions" })).not.toBeInTheDocument()

    await user.click(fab)

    const menu = screen.getByRole("navigation", { name: "Quick logging actions" })
    expect(menu).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Close quick logging actions" })).toHaveAttribute("aria-expanded", "true")
    expect(within(menu).getByRole("link", { name: "Log Feed" })).toHaveAttribute("href", "/feeding")
    expect(within(menu).getByRole("link", { name: "Log Sleep" })).toHaveAttribute("href", "/sleep")
    expect(within(menu).getByRole("link", { name: "Log Growth" })).toHaveAttribute("href", "/growth")

    await user.click(screen.getByRole("button", { name: "Close quick logging actions" }))

    expect(screen.queryByRole("navigation", { name: "Quick logging actions" })).not.toBeInTheDocument()
  })

  it("renders greeting with default name when no active baby", () => {
    storeState.activeBaby = null
    render(<DashboardPage />)
    expect(screen.getByText("Good", { exact: false })).toBeInTheDocument()
  })
})
