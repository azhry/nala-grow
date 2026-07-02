import { render, screen } from "@testing-library/react"
import DashboardPage from "../dashboard/page"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock("@/components/ui", () => ({
  FAB: ({
    icon,
    onClick,
  }: {
    icon: string
    onClick?: () => void
  }) => (
    <button data-testid="fab" onClick={onClick}>
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

  it("renders quick action links", () => {
    render(<DashboardPage />)
    expect(screen.getByText("Log Feed")).toBeInTheDocument()
    expect(screen.getByText("Log Sleep")).toBeInTheDocument()
    expect(screen.getByText("Log Growth")).toBeInTheDocument()
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

  it("renders daily insight card", () => {
    render(<DashboardPage />)
    expect(screen.getByText("Daily Insight")).toBeInTheDocument()
    expect(screen.getByText(/Consistency is key for nap transitions/i)).toBeInTheDocument()
  })

  it("renders FAB", () => {
    render(<DashboardPage />)
    expect(screen.getByTestId("fab")).toBeInTheDocument()
  })

  it("renders greeting with default name when no active baby", () => {
    storeState.activeBaby = null
    render(<DashboardPage />)
    expect(screen.getByText("Good", { exact: false })).toBeInTheDocument()
  })
})
