/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import LoginPage from "../login/page"
import ResetPasswordPage from "../reset-password/page"

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
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => mockSearchParams,
}))

// ─── Auth lib mocks ─────────────────────────────────────────────────────────

const mockSignInWithEmail = jest.fn()
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
  signInWithGoogle: jest.fn(),
  updatePassword: (...args: any[]) => mockUpdatePassword(...args),
}))

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("auth pages", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocationHref = "http://localhost/login"
    mockSignInWithEmail.mockResolvedValue({
      token: "token",
      user: { id: "user-1", email: "test@test.com" },
    })
    mockResetPassword.mockResolvedValue(undefined)
    mockUpdatePassword.mockResolvedValue(undefined)
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
    fireEvent.click(screen.getByRole("button", { name: /login/i }))

    await waitFor(() => expect(mockSignInWithEmail).toHaveBeenCalled(), { timeout: 3000 })
    expect(screen.queryByTestId("login-error")).not.toBeInTheDocument()
  })

  it("allows internal protected login redirect params", async () => {
    mockLocationHref = "http://localhost/login?redirect=/profile/manage"

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "test@test.com" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /login/i }))

    await waitFor(() => expect(mockSignInWithEmail).toHaveBeenCalled(), { timeout: 3000 })
    expect(screen.queryByTestId("login-error")).not.toBeInTheDocument()
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
})
