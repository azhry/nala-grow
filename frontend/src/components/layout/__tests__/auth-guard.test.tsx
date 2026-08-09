import { act, render, waitFor } from "@testing-library/react"
import { AuthGuard } from "@/components/layout/auth-guard"
import { getCurrentSession, navigateToLogin } from "@/lib/auth"

const mockNavigateToLogin = jest.mocked(navigateToLogin)
const mockGetCurrentSession = jest.mocked(getCurrentSession)
let storeState: {
  user: { id: string; email: string } | null
  token: string | null
  _hasHydrated: boolean
} = {
  user: null,
  token: null,
  _hasHydrated: false,
}

jest.mock("@/lib/store", () => ({
  useAppStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}))

jest.mock("@/lib/auth", () => ({
  navigateToLogin: jest.fn(),
  getCurrentSession: jest.fn(),
}))

describe("layout AuthGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    storeState = { user: null, token: null, _hasHydrated: false }
    mockNavigateToLogin.mockImplementation(() => undefined)
    mockGetCurrentSession.mockReset()
  })

  it("waits for Zustand hydration before bootstrapping auth", async () => {
    const view = render(
      <AuthGuard>
        <div>Dashboard</div>
      </AuthGuard>,
    )

    expect(view.queryByText("Dashboard")).not.toBeInTheDocument()
    expect(mockGetCurrentSession).not.toHaveBeenCalled()
    expect(mockNavigateToLogin).not.toHaveBeenCalled()

    mockGetCurrentSession.mockImplementation(() => new Promise(() => undefined))
    act(() => {
      storeState = { ...storeState, _hasHydrated: true }
      view.rerender(
        <AuthGuard>
          <div>Dashboard</div>
        </AuthGuard>,
      )
    })

    await waitFor(() => expect(mockGetCurrentSession).toHaveBeenCalledTimes(1))
    expect(mockNavigateToLogin).not.toHaveBeenCalled()
  })

  it("restores a valid cookie session before rendering protected content", async () => {
    mockGetCurrentSession.mockImplementation(async () => {
      storeState = {
        user: { id: "user-1", email: "user@example.com" },
        token: "cookie-token",
        _hasHydrated: true,
      }
      return {
        user: { id: "user-1", email: "user@example.com" },
        token: "cookie-token",
      }
    })
    storeState = { ...storeState, _hasHydrated: true }

    const view = render(
      <AuthGuard>
        <div>Dashboard</div>
      </AuthGuard>,
    )

    await waitFor(() => expect(view.getByText("Dashboard")).toBeInTheDocument())
    expect(mockNavigateToLogin).not.toHaveBeenCalled()
  })

  it("navigates only after an invalid session has finished validation", async () => {
    mockGetCurrentSession.mockResolvedValue(null)
    storeState = { ...storeState, _hasHydrated: true }

    render(
      <AuthGuard>
        <div>Dashboard</div>
      </AuthGuard>,
    )

    expect(mockNavigateToLogin).not.toHaveBeenCalled()
    await waitFor(() => expect(mockNavigateToLogin).toHaveBeenCalledTimes(1))
  })
})
