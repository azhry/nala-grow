import { render, screen, waitFor } from "@testing-library/react"
import CasdoorCallbackPage from "../page"

const mockReplace = jest.fn()
const mockConsumeState = jest.fn()
const mockSignInWithCasdoor = jest.fn()
const mockGetPostAuthDestination = jest.fn()
const mockIsProfileLookupError = jest.fn()
let mockSearchParams = new URLSearchParams()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
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
  consumeCasdoorOAuthState: (...args: unknown[]) => mockConsumeState(...args),
  getCasdoorRedirectUri: () => "https://app.example/auth/callback",
  signInWithCasdoor: (...args: unknown[]) => mockSignInWithCasdoor(...args),
}))

jest.mock("@/lib/profile-bootstrap", () => ({
  getPostAuthDestination: (...args: unknown[]) => mockGetPostAuthDestination(...args),
  isProfileLookupError: (...args: unknown[]) => mockIsProfileLookupError(...args),
}))

describe("Casdoor callback page", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams = new URLSearchParams()
    mockSignInWithCasdoor.mockResolvedValue({ token: "token" })
    mockGetPostAuthDestination.mockResolvedValue("/dashboard")
    mockIsProfileLookupError.mockReturnValue(false)
  })

  it("shows a retryable error when the callback is incomplete", async () => {
    render(<CasdoorCallbackPage />)

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "could not be completed",
    )
    expect(screen.getByRole("link", { name: /back to login/i })).toHaveAttribute(
      "href",
      "/login",
    )
    expect(mockSignInWithCasdoor).not.toHaveBeenCalled()
  })

  it("validates state, exchanges the code, and uses the safe destination", async () => {
    mockSearchParams = new URLSearchParams("code=single-use-code&state=oauth-state")
    mockConsumeState.mockReturnValue("/profile/manage")

    render(<CasdoorCallbackPage />)

    await waitFor(() => {
      expect(mockSignInWithCasdoor).toHaveBeenCalledWith(
        "single-use-code",
        "https://app.example/auth/callback",
      )
    })
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/dashboard"))
    expect(mockConsumeState).toHaveBeenCalledWith("oauth-state")
    expect(mockGetPostAuthDestination).toHaveBeenCalledWith("/profile/manage")
  })

  it("rejects a replayed or unknown state without exchanging the code", async () => {
    mockSearchParams = new URLSearchParams("code=single-use-code&state=bad-state")
    mockConsumeState.mockReturnValue(null)

    render(<CasdoorCallbackPage />)

    expect(await screen.findByRole("alert")).toHaveTextContent("expired")
    expect(mockSignInWithCasdoor).not.toHaveBeenCalled()
  })

  it("shows a recoverable timeout without exposing callback values", async () => {
    mockSearchParams = new URLSearchParams(
      "code=private-oauth-code&state=private-oauth-state",
    )
    mockConsumeState.mockReturnValue("/dashboard")
    const { ApiError } = await import("@/lib/auth")
    mockSignInWithCasdoor.mockRejectedValue(
      new ApiError(504, "The request timed out. Please try again.", ""),
    )

    render(<CasdoorCallbackPage />)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("The request timed out. Please try again.")
    expect(alert).not.toHaveTextContent(/private-oauth-code|private-oauth-state/)
    expect(screen.getByRole("link", { name: /back to login/i })).toHaveAttribute(
      "href",
      "/login",
    )
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("shows a recoverable error when post-auth profile loading times out", async () => {
    mockSearchParams = new URLSearchParams("code=unit-test&state=unit-test")
    mockConsumeState.mockReturnValue("/dashboard")
    mockIsProfileLookupError.mockReturnValue(true)
    mockGetPostAuthDestination.mockRejectedValue(
      new Error("We couldn’t check your baby profiles. Please try again."),
    )

    render(<CasdoorCallbackPage />)

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn’t check your baby profiles. Please try again.",
    )
    expect(screen.getByRole("link", { name: /back to login/i })).toHaveAttribute(
      "href",
      "/login",
    )
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
