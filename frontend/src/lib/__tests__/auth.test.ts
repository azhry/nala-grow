/* eslint-disable @typescript-eslint/no-explicit-any */
import * as authModule from "../auth"
const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword, updatePassword, signOut, getSessionToken, isAuthenticated } = authModule

const mockApiFetch = jest.fn()

jest.mock("../api-client", () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
  ApiError: class ApiError extends Error {
    status: number
    traceId: string
    constructor(status: number, message: string, traceId: string) {
      super(message)
      this.status = status
      this.traceId = traceId
    }
  },
}))

jest.mock("../store", () => ({
  useAppStore: {
    getState: () => ({
      user: null,
      setUser: jest.fn(),
      setActiveBaby: jest.fn(),
    }),
  },
}))

describe("auth service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "",
    })
  })

  describe("signInWithEmail", () => {
    it("calls API with correct endpoint and body", async () => {
      mockApiFetch.mockResolvedValue({
        user: { id: "1", email: "test@test.com" },
        token: "abc123",
      })
      await signInWithEmail("test@test.com", "password123")
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/auth/login",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "test@test.com", password: "password123" }),
        }),
      )
    })

    it("sets session cookie on success", async () => {
      mockApiFetch.mockResolvedValue({
        user: { id: "1", email: "test@test.com" },
        token: "abc123",
      })
      await signInWithEmail("test@test.com", "password123")
      expect(document.cookie).toContain("nalagrow-session=abc123")
    })
  })

  describe("signUpWithEmail", () => {
    it("calls API with correct endpoint and body", async () => {
      mockApiFetch.mockResolvedValue({
        user: { id: "2", email: "new@test.com" },
        token: "def456",
      })
      await signUpWithEmail("new@test.com", "password123")
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/auth/signup",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "new@test.com", password: "password123" }),
        }),
      )
    })
  })

  describe("signInWithGoogle", () => {
    it("does not throw when called", () => {
      expect(() => signInWithGoogle()).not.toThrow()
    })
  })

  describe("resetPassword", () => {
    it("calls API with correct endpoint and body", async () => {
      mockApiFetch.mockResolvedValue({})
      await resetPassword("test@test.com")
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/auth/reset-password",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "test@test.com" }),
        }),
      )
    })
  })

  describe("updatePassword", () => {
    it("calls API with correct endpoint and body", async () => {
      mockApiFetch.mockResolvedValue({})
      await updatePassword("reset-token", "newpassword123")
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/auth/update-password",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ token: "reset-token", password: "newpassword123" }),
        }),
      )
    })
  })

  describe("signOut", () => {
    it("clears session cookie", () => {
      document.cookie = "nalagrow-session=abc123; path=/; max-age=86400"
      signOut()
      expect(document.cookie).not.toContain("nalagrow-session=abc123")
    })
  })

  describe("getSessionToken", () => {
    it("returns null when no cookie", () => {
      expect(getSessionToken()).toBeNull()
    })

    it("returns token when cookie exists", () => {
      document.cookie = "nalagrow-session=mytoken; path=/"
      expect(getSessionToken()).toBe("mytoken")
    })
  })

  describe("isAuthenticated", () => {
    it("returns false when no session cookie", () => {
      expect(isAuthenticated()).toBe(false)
    })

    it("returns true when session cookie exists", () => {
      document.cookie = "nalagrow-session=mytoken; path=/"
      expect(isAuthenticated()).toBe(true)
    })
  })
})
