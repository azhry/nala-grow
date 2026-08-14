import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { AuthGuard } from "@/components/layout/auth-guard"
import { getCurrentSession, navigateToLogin } from "@/lib/auth"
import { bootstrapProfiles } from "@/lib/profile-bootstrap"

const mockNavigateToLogin = jest.mocked(navigateToLogin)
const mockGetCurrentSession = jest.mocked(getCurrentSession)
const mockBootstrapProfiles = jest.mocked(bootstrapProfiles)
const mockRouter = { replace: jest.fn() }
let mockPathname = "/dashboard"
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

jest.mock("@/lib/profile-bootstrap", () => ({
  bootstrapProfiles: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => mockRouter,
}))

describe("layout AuthGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    storeState = { user: null, token: null, _hasHydrated: false }
    mockPathname = "/dashboard"
    mockBootstrapProfiles.mockResolvedValue([
      { id: "baby-1", name: "Maya", dob: "2024-01-10", sex: "female" },
    ])
    mockNavigateToLogin.mockImplementation(() => undefined)
    mockGetCurrentSession.mockReset()
    mockGetCurrentSession.mockImplementation(async () => {
      const sessionUser = storeState.user ?? {
        id: "user-1",
        email: "user@example.com",
      }
      const sessionToken = storeState.token ?? "token"
      storeState = {
        ...storeState,
        user: sessionUser,
        token: sessionToken,
      }
      return { user: sessionUser, token: sessionToken }
    })
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
    expect(mockBootstrapProfiles).toHaveBeenCalledTimes(1)
  })

  it("redirects an authenticated zero-profile user to onboarding", async () => {
    mockBootstrapProfiles.mockResolvedValue([])
    storeState = {
      user: { id: "user-1", email: "user@example.com" },
      token: "token",
      _hasHydrated: true,
    }

    render(
      <AuthGuard>
        <div>Dashboard</div>
      </AuthGuard>,
    )

    expect(await screen.findByRole("status")).toHaveTextContent(
      "first baby profile",
    )
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/profile/create"))
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument()
  })

  it("keeps the profile lookup loading state visible until it resolves", async () => {
    let resolveProfiles: ((profiles: never[]) => void) | undefined
    mockBootstrapProfiles.mockImplementation(
      () => new Promise((resolve) => { resolveProfiles = resolve }),
    )
    storeState = {
      user: { id: "user-1", email: "user@example.com" },
      token: "token",
      _hasHydrated: true,
    }

    render(
      <AuthGuard>
        <div>Dashboard</div>
      </AuthGuard>,
    )

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Checking for your baby profiles",
    )
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument()

    act(() => resolveProfiles?.([]))
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/profile/create"))
  })

  it("keeps the create route accessible for an authenticated zero-profile user", async () => {
    mockPathname = "/profile/create"
    mockBootstrapProfiles.mockResolvedValue([])
    storeState = {
      user: { id: "user-1", email: "user@example.com" },
      token: "token",
      _hasHydrated: true,
    }

    render(
      <AuthGuard>
        <div>Create profile</div>
      </AuthGuard>,
    )

    expect(await screen.findByText("Create profile")).toBeInTheDocument()
    expect(mockBootstrapProfiles).not.toHaveBeenCalled()
  })

  it("shows a recoverable error when the profile lookup fails", async () => {
    mockBootstrapProfiles.mockRejectedValue(new Error("network unavailable"))
    storeState = {
      user: { id: "user-1", email: "user@example.com" },
      token: "token",
      _hasHydrated: true,
    }

    render(
      <AuthGuard>
        <div>Dashboard</div>
      </AuthGuard>,
    )

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your account is still signed in",
    )
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()

    mockBootstrapProfiles.mockResolvedValue([
      { id: "baby-1", name: "Maya", dob: "2024-01-10", sex: "female" },
    ])
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))

    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument())
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

  it("does not bootstrap persisted users when session validation fails", async () => {
    mockGetCurrentSession.mockResolvedValue(null)
    storeState = {
      user: { id: "stale-user", email: "stale@example.com" },
      token: "stale-token",
      _hasHydrated: true,
    }

    render(
      <AuthGuard>
        <div>Dashboard</div>
      </AuthGuard>,
    )

    await waitFor(() => expect(mockNavigateToLogin).toHaveBeenCalledTimes(1))
    expect(mockGetCurrentSession).toHaveBeenCalledTimes(1)
    expect(mockBootstrapProfiles).not.toHaveBeenCalled()
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument()
  })
})
