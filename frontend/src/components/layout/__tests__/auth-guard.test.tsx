import { act, render, waitFor } from "@testing-library/react"
import { AuthGuard } from "@/components/layout/auth-guard"

const mockReplace = jest.fn()
let storeState: { user: { id: string; email: string } | null } = {
  user: { id: "user-1", email: "user@example.com" },
}

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

jest.mock("@/lib/store", () => ({
  useAppStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}))

describe("layout AuthGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    storeState = { user: { id: "user-1", email: "user@example.com" } }
  })

  it("owns the redirect when the session is cleared", async () => {
    const view = render(
      <AuthGuard>
        <div>Dashboard</div>
      </AuthGuard>,
    )

    expect(view.getByText("Dashboard")).toBeInTheDocument()

    act(() => {
      storeState = { user: null }
      view.rerender(
        <AuthGuard>
          <div>Dashboard</div>
        </AuthGuard>,
      )
    })

    expect(view.queryByText("Dashboard")).not.toBeInTheDocument()
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login"))
  })
})
