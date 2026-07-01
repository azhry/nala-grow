/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import LoginPage from "../login/page"
import ResetPasswordPage from "../reset-password/page"

const mockPush = jest.fn()
const mockSignInWithEmail = jest.fn()
const mockResetPassword = jest.fn()
const mockUpdatePassword = jest.fn()
let mockSearchParams = new URLSearchParams()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}))

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

describe("auth pages", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams = new URLSearchParams()
    mockSignInWithEmail.mockResolvedValue({
      token: "token",
      user: { id: "user-1", email: "test@test.com" },
    })
    mockResetPassword.mockResolvedValue(undefined)
    mockUpdatePassword.mockResolvedValue(undefined)
  })

  it("falls back to dashboard for unsafe login redirect params", async () => {
    mockSearchParams = new URLSearchParams("redirect=https://evil.test")

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "test@test.com" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /login/i }))

    await waitFor(() => expect(mockSignInWithEmail).toHaveBeenCalled())
    expect(mockPush).toHaveBeenCalledWith("/dashboard")
  })

  it("allows internal protected login redirect params", async () => {
    mockSearchParams = new URLSearchParams("redirect=/profile/manage")

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "test@test.com" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /login/i }))

    await waitFor(() => expect(mockSignInWithEmail).toHaveBeenCalled())
    expect(mockPush).toHaveBeenCalledWith("/profile/manage")
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
