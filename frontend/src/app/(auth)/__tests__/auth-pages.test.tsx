/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import LoginPage from "../login/page"
import SignupPage from "../signup/page"
import ResetPasswordPage from "../reset-password/page"

type MockAuthState = {
  user: { id: string; email: string } | null
  _hasHydrated: boolean
}

let mockAuthState: MockAuthState
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
}
const mockUseAppStore = jest.fn()

// ─── window.location mock (used by login page redirect) ─────────────────────

// ─── window.location mock (used by login page redirect) ─────────────────────
// JSDOM's window.location.href setter is non-configurable and doesn't actually
// navigate (throws "Not implemented" for non-hash URLs).  We use this mock for
// the *getter* side — LoginForm reads window.location.search at render time to
// compute redirectTo.  The setter assertion is skipped because JSDOM cannot
// intercept it.

let mockLocationHref: string | null = null
const origHrefDescriptor = Object.getOwnPropertyDescriptor(
  window.location,
  "href",
)
const origSearchDescriptor = Object.getOwnPropertyDescriptor(
  window.location,
  "search",
)
const origPathnameDescriptor = Object.getOwnPropertyDescriptor(
  window.location,
  "pathname",
)

beforeAll(() => {
  // Suppress JSDOM "Not implemented: navigation" console.error noise from
  // window.location.href = redirectTo inside handleSubmit.
  jest.spyOn(console, "error").mockImplementation(() => {})
  // href — non-configurable in JSDOM, but defineProperty still replaces
  // the accessor pair without throwing if we keep configurable:false.
  // Run in try-catch so tests fail gracefully if a future JSDOM tightens this.
  try {
    Object.defineProperty(window.location, "href", {
      get() {
        return mockLocationHref ?? origHrefDescriptor?.get?.call(window.location) ?? ""
      },
      set(v: string) {
        mockLocationHref = v
      },
      configurable: false,
    })
  } catch {
    // JSDOM does not allow redefinition — skip setter intercept
  }

  try {
    Object.defineProperty(window.location, "search", {
      get() {
        if (mockLocationHref?.includes("?")) {
          return "?" + mockLocationHref.split("?")[1]
        }
        return origSearchDescriptor?.get?.call(window.location) ?? ""
      },
      configurable: false,
    })
  } catch {
    // skip
  }

  try {
    Object.defineProperty(window.location, "pathname", {
      get() {
        if (mockLocationHref) {
          try {
            return new URL(mockLocationHref).pathname
          } catch {
            return mockLocationHref
          }
        }
        return origPathnameDescriptor?.get?.call(window.location) ?? "/"
      },
      configurable: false,
    })
  } catch {
    // skip
  }
})

afterAll(() => {
  jest.restoreAllMocks()

  // Restore original descriptors
  if (origHrefDescriptor) {
    try {
      Object.defineProperty(window.location, "href", origHrefDescriptor)
    } catch { /* ignore */ }
  }
  if (origSearchDescriptor) {
    try {
      Object.defineProperty(window.location, "search", origSearchDescriptor)
    } catch { /* ignore */ }
  }
  if (origPathnameDescriptor) {
    try {
      Object.defineProperty(window.location, "pathname", origPathnameDescriptor)
    } catch { /* ignore */ }
  }
})

// ─── Reset-page mocks (needs next/navigation) ───────────────────────────────

let mockSearchParams = new URLSearchParams()

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}))

jest.mock("@/lib/store", () => ({
  useAppStore: (selector: (state: MockAuthState) => unknown) =>
    mockUseAppStore(selector),
}))

// ─── Auth lib mocks ─────────────────────────────────────────────────────────

const mockSignInWithEmail = jest.fn()
const mockSignUpWithEmail = jest.fn()
const mockSignInWithGoogle = jest.fn()
const mockResetPassword = jest.fn()
const mockUpdatePassword = jest.fn()

jest.mock("@/lib/auth", () => ({
  ApiError: class ApiError extends Error {
    status: number
    traceId: string
    constructor(status: number, message: string, traceId: string) {
      super(message)
      this.status = status
      this.traceId = traceId
    }
  },
  resetPassword: (...args: any[]) => mockResetPassword(...args),
  signInWithEmail: (...args: any[]) => mockSignInWithEmail(...args),
  signUpWithEmail: (...args: any[]) => mockSignUpWithEmail(...args),
  signInWithGoogle: (...args: any[]) => mockSignInWithGoogle(...args),
  updatePassword: (...args: any[]) => mockUpdatePassword(...args),
}))

const mockGetPostAuthDestination = jest.fn()

jest.mock("@/lib/profile-bootstrap", () => ({
  getPostAuthDestination: (...args: any[]) => mockGetPostAuthDestination(...args),
  getSafeRedirect: (redirect: string | null) =>
    redirect?.startsWith("/profile") ? redirect : "/dashboard",
  ProfileLookupError: Error,
  isProfileLookupError: (error: unknown) =>
    error instanceof Error && error.name === "ProfileLookupError",
}))

function mockProfileLookupError() {
  const error = new Error("We couldn’t check your baby profiles. Please try again.")
  error.name = "ProfileLookupError"
  return error
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("auth pages", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthState = { user: null, _hasHydrated: true }
    mockUseAppStore.mockImplementation((selector: (state: MockAuthState) => unknown) =>
      selector(mockAuthState),
    )
    mockLocationHref = "http://localhost/login"
    mockSignInWithEmail.mockResolvedValue({
      token: "token",
      user: { id: "user-1", email: "test@test.com" },
    })
    mockSignUpWithEmail.mockResolvedValue({
      token: "token",
      user: { id: "user-1", email: "test@test.com" },
    })
    mockSignInWithGoogle.mockResolvedValue({
      token: "token",
      user: { id: "user-1", email: "test@test.com" },
    })
    mockGetPostAuthDestination.mockResolvedValue("/dashboard")
    mockResetPassword.mockResolvedValue(undefined)
    mockUpdatePassword.mockResolvedValue(undefined)
  })

  it.each([
    ["login", () => <LoginPage />],
    ["signup", () => <SignupPage />],
  ])("waits for hydration before redirecting from %s", (_pageName, renderPage) => {
    mockAuthState = {
      user: { id: "stale-user", email: "stale@example.com" },
      _hasHydrated: false,
    }

    const { container, rerender } = render(renderPage())

    expect(container.querySelector(".animate-spin")).toBeInTheDocument()
    expect(mockRouter.replace).not.toHaveBeenCalled()

    mockAuthState = {
      user: { id: "hydrated-user", email: "hydrated@example.com" },
      _hasHydrated: true,
    }
    rerender(renderPage())

    expect(mockRouter.replace).toHaveBeenCalledWith("/dashboard")
  })

  it("falls back to dashboard for unsafe login redirect params", async () => {
    mockLocationHref = "http://localhost/login?redirect=https://evil.test"

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "test@test.com" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^(Login|Continue)/i }))

    await waitFor(() => expect(mockSignInWithEmail).toHaveBeenCalled(), { timeout: 3000 })
    expect(screen.queryByTestId("login-error")).not.toBeInTheDocument()
  })

  it("allows internal protected login redirect params", async () => {
    mockLocationHref = "http://localhost/login?redirect=/profile/manage"
    window.history.replaceState({}, "", "/login?redirect=/profile/manage")

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "test@test.com" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^(Login|Continue)/i }))

    await waitFor(() => expect(mockSignInWithEmail).toHaveBeenCalled(), { timeout: 3000 })
    expect(screen.queryByTestId("login-error")).not.toBeInTheDocument()
    expect(mockGetPostAuthDestination).toHaveBeenCalledWith("/profile/manage")
  })

  it("routes a zero-profile login to onboarding despite a protected redirect", async () => {
    mockLocationHref = "http://localhost/login?redirect=/dashboard"
    mockGetPostAuthDestination.mockResolvedValue("/profile/create")

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "test@test.com" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^(Login|Continue)/i }))

    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/profile/create"))
  })

  it("offers a retry when the login profile lookup fails", async () => {
    mockGetPostAuthDestination.mockRejectedValue(mockProfileLookupError())

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "test@test.com" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^(Login|Continue)/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "couldn’t check your baby profiles",
    )
    expect(screen.getByRole("button", { name: "Retry profile lookup" })).toBeInTheDocument()

    mockGetPostAuthDestination.mockResolvedValue("/profile/create")
    fireEvent.click(screen.getByRole("button", { name: "Retry profile lookup" }))

    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/profile/create"))
  })

  it("uses the same profile decision for deterministic Google login", async () => {
    mockGetPostAuthDestination.mockResolvedValue("/profile/create")

    render(<LoginPage />)
    fireEvent.click(screen.getByRole("button", { name: /Continue with Google/i }))

    await waitFor(() => expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/profile/create"))
  })

  it("uses the same profile decision for deterministic Google signup", async () => {
    mockGetPostAuthDestination.mockResolvedValue("/profile/create")

    render(<SignupPage />)
    fireEvent.click(screen.getByRole("button", { name: /Continue with Google/i }))

    await waitFor(() => expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/profile/create"))
  })

  it("routes a new email signup to onboarding", async () => {
    mockGetPostAuthDestination.mockResolvedValue("/profile/create")

    render(<SignupPage />)
    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "new@test.com" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }))

    await waitFor(() => expect(mockSignUpWithEmail).toHaveBeenCalledWith("new@test.com", "password123"))
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/profile/create"))
  })

  it("shows the new password form for Supabase recovery code redirects", () => {
    mockSearchParams = new URLSearchParams("code=supabase-recovery-code")

    render(<ResetPasswordPage />)

    expect(screen.getByText("Set New Password")).toBeInTheDocument()
    expect(screen.getByLabelText("New Password")).toBeInTheDocument()
  })

  it("updates password using the Supabase recovery code", async () => {
    mockSearchParams = new URLSearchParams("code=supabase-recovery-code")

    render(<ResetPasswordPage />)

    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "newpassword123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /update password/i }))

    await waitFor(() =>
      expect(mockUpdatePassword).toHaveBeenCalledWith(
        "supabase-recovery-code",
        "newpassword123",
      ),
    )
  })

  it("does not render hash-only footer links on login", () => {
    render(<LoginPage />)

    const helpLink = screen.getByRole("link", { name: /help/i })
    const privacyLink = screen.getByRole("link", { name: /privacy/i })

    expect(helpLink).toHaveAttribute("href", "/help")
    expect(privacyLink).toHaveAttribute("href", "/privacy")
  })

  it("does not render hash-only policy links on signup", () => {
    render(<SignupPage />)

    const termsLink = screen.getByRole("link", { name: /terms of service/i })
    const privacyLink = screen.getByRole("link", { name: /privacy policy/i })
    const footerHelpLink = screen.getByRole("link", { name: /help/i })
    const footerPrivacyLink = screen.getAllByRole("link", { name: /privacy/i })[1]

    expect(termsLink).toHaveAttribute("href", "/terms")
    expect(privacyLink).toHaveAttribute("href", "/privacy")
    expect(footerHelpLink).toHaveAttribute("href", "/help")
    expect(footerPrivacyLink).toHaveAttribute("href", "/privacy")
  })
})
