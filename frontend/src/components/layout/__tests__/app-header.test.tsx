import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { AppHeader } from "@/components/layout/app-header"
import { signOut } from "@/lib/auth"

const mockReplace = jest.fn()
const mockSignOut = jest.mocked(signOut)

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

jest.mock("@/lib/auth", () => ({
  signOut: jest.fn(),
}))

jest.mock("@/lib/store", () => ({
  useAppStore: (selector: (state: { activeBaby: { name: string } | null }) => unknown) => selector({ activeBaby: { name: "Maya" } }),
}))

describe("AppHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSignOut.mockResolvedValue(undefined)
  })

  it("provides working home, profile, and notification controls without a no-op search field", () => {
    render(<AppHeader />)
    expect(screen.getByLabelText("NalaGrow home")).toHaveAttribute("href", "/dashboard")
    expect(screen.getByLabelText("Manage Maya's profile")).toHaveAttribute("href", "/profile")
    expect(screen.queryByPlaceholderText("Search records...")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Notifications" }))
    expect(screen.getByText("No new notifications.")).toBeVisible()
  })

  it("clears the session without competing with the app-wide auth redirect", async () => {
    render(<AppHeader />)

    fireEvent.click(screen.getByRole("button", { name: /Logout/ }))

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1))
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
