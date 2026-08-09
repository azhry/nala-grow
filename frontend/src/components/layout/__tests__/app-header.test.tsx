import { fireEvent, render, screen } from "@testing-library/react"
import { AppHeader } from "@/components/layout/app-header"
import { navigateToLogin, signOut } from "@/lib/auth"

const mockSignOut = jest.mocked(signOut)
const mockNavigateToLogin = jest.mocked(navigateToLogin)

jest.mock("@/lib/auth", () => ({
  signOut: jest.fn(),
  navigateToLogin: jest.fn(),
}))

jest.mock("@/lib/store", () => ({
  useAppStore: (selector: (state: { activeBaby: { name: string } | null }) => unknown) => selector({ activeBaby: { name: "Maya" } }),
}))

describe("AppHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSignOut.mockImplementation(() => undefined)
    mockNavigateToLogin.mockImplementation(() => undefined)
  })

  it("provides working home, profile, and notification controls without a no-op search field", () => {
    render(<AppHeader />)
    expect(screen.getByLabelText("NalaGrow home")).toHaveAttribute("href", "/dashboard")
    expect(screen.getByLabelText("Manage Maya's profile")).toHaveAttribute("href", "/profile")
    expect(screen.queryByPlaceholderText("Search records...")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Notifications" }))
    expect(screen.getByText("No new notifications.")).toBeVisible()
  })

  it("clears auth before starting the single full login navigation", () => {
    render(<AppHeader />)

    const callOrder: string[] = []
    mockSignOut.mockImplementation(() => callOrder.push("signOut"))
    mockNavigateToLogin.mockImplementation(() => callOrder.push("navigateToLogin"))

    fireEvent.click(screen.getByRole("button", { name: /Logout/ }))

    expect(callOrder).toEqual(["signOut", "navigateToLogin"])
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(mockNavigateToLogin).toHaveBeenCalledTimes(1)
  })
})
