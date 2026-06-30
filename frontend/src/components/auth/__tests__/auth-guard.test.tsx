/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, prefer-const */
import { render, screen } from "@testing-library/react"
import { AuthGuard } from "../auth-guard"

const mockReplace = jest.fn()
const mockGetSessionToken = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

jest.mock("@/lib/auth", () => ({
  getSessionToken: () => mockGetSessionToken(),
}))

jest.mock("@/lib/store", () => {
  let state: Record<string, unknown> = { user: null, _hasHydrated: false }
  return {
    useAppStore: (selector: (s: Record<string, unknown>) => unknown) =>
      selector ? selector(state) : state,
    __setMockState: (newState: Record<string, unknown>) =>
      Object.assign(state, newState),
  }
})

const storeModule = require("@/lib/store") as Record<string, unknown>

describe("AuthGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(storeModule.__setMockState as (s: Record<string, unknown>) => void)({
      user: null,
      _hasHydrated: false,
    })
    mockGetSessionToken.mockReturnValue(null)
  })

  it("shows spinner when store has not hydrated", () => {
    const { container } = render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    )
    expect(container.querySelector(".animate-spin")).toBeInTheDocument()
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
  })

  it("renders children when authenticated", () => {
    ;(storeModule.__setMockState as (s: Record<string, unknown>) => void)({
      user: { id: "1", email: "test@test.com" },
      _hasHydrated: true,
    })
    mockGetSessionToken.mockReturnValue("session-token")
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    )
    expect(screen.getByText("Protected Content")).toBeInTheDocument()
  })

  it("shows spinner when hydrated but no token and no user", () => {
    ;(storeModule.__setMockState as (s: Record<string, unknown>) => void)({
      user: null,
      _hasHydrated: true,
    })
    mockGetSessionToken.mockReturnValue(null)
    const { container } = render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    )
    expect(container.querySelector(".animate-spin")).toBeInTheDocument()
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
  })

  it("calls router.replace when not authenticated after hydration", () => {
    ;(storeModule.__setMockState as (s: Record<string, unknown>) => void)({
      user: null,
      _hasHydrated: true,
    })
    mockGetSessionToken.mockReturnValue(null)
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    )
    expect(mockReplace).toHaveBeenCalledWith("/login")
  })

  it("does not redirect when authenticated", () => {
    ;(storeModule.__setMockState as (s: Record<string, unknown>) => void)({
      user: { id: "1", email: "test@test.com" },
      _hasHydrated: true,
    })
    mockGetSessionToken.mockReturnValue("session-token")
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    )
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
