import { fireEvent, render, screen } from "@testing-library/react"
import { AppHeader } from "@/components/layout/app-header"

jest.mock("@/lib/store", () => ({
  useAppStore: (selector: (state: { activeBaby: { name: string } | null }) => unknown) => selector({ activeBaby: { name: "Maya" } }),
}))

describe("AppHeader", () => {
  it("provides working home, profile, and notification controls without a no-op search field", () => {
    render(<AppHeader />)
    expect(screen.getByLabelText("NalaGrow home")).toHaveAttribute("href", "/dashboard")
    expect(screen.getByLabelText("Manage Maya's profile")).toHaveAttribute("href", "/profile")
    expect(screen.queryByPlaceholderText("Search records...")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Notifications" }))
    expect(screen.getByText("No new notifications.")).toBeVisible()
  })
})
