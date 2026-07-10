/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getSessionToken,
  isAuthenticated,
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
  updatePassword,
} from "../auth"
import type { AuthResponse } from "../graphql-types"

// ─── GraphQL client mocks ────────────────────────────────────────────────────

const mockLogin = jest.fn()
const mockSignup = jest.fn()
const mockLoginWithGoogle = jest.fn()
const mockRequestPasswordReset = jest.fn()
const mockResetPassword = jest.fn()
const mockGetMe = jest.fn()
const mockSetAuthToken = jest.fn()
const mockClearAuthToken = jest.fn()

jest.mock("../graphql-client", () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  signup: (...args: unknown[]) => mockSignup(...args),
  loginWithGoogle: (...args: unknown[]) => mockLoginWithGoogle(...args),
  requestPasswordReset: (...args: unknown[]) => mockRequestPasswordReset(...args),
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
  getMe: (...args: unknown[]) => mockGetMe(...args),
  setAuthToken: (...args: unknown[]) => mockSetAuthToken(...args),
  clearAuthToken: (...args: unknown[]) => mockClearAuthToken(...args),
}))

// ─── Store mock ──────────────────────────────────────────────────────────────

const mockSetUser = jest.fn()
const mockSetToken = jest.fn()
const mockSetActiveBaby = jest.fn()
const mockSetBabies = jest.fn()
let mockUserValue: { id: string; email: string } | null = null

jest.mock("../store", () => ({
  useAppStore: {
    getState: () => ({
      user: mockUserValue,
      setUser: mockSetUser,
      setToken: mockSetToken,
      setActiveBaby: mockSetActiveBaby,
      setBabies: mockSetBabies,
    }),
  },
}))

// ─── Test data ───────────────────────────────────────────────────────────────

const sessionUser = { id: "user-1", email: "test@test.com" }
const authResponse: AuthResponse = {
  token: "gql-token-123",
  user: { ...sessionUser, displayName: "", photoUrl: "", createdAt: "" },
}

const TOKEN_KEY = "nalagrow-token"

describe("auth service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUserValue = null
    localStorage.clear()
  })

  describe("signInWithEmail", () => {
    it("calls GraphQL login and persists the session", async () => {
      mockLogin.mockResolvedValue(authResponse)

      const result = await signInWithEmail("test@test.com", "password123")

      expect(mockLogin).toHaveBeenCalledWith("test@test.com", "password123")
      expect(localStorage.getItem(TOKEN_KEY)).toBe("gql-token-123")
      expect(mockSetAuthToken).toHaveBeenCalledWith("gql-token-123")
      expect(mockSetToken).toHaveBeenCalledWith("gql-token-123")
      expect(mockSetUser).toHaveBeenCalledWith(sessionUser)
      expect(result).toEqual({ user: sessionUser, token: "gql-token-123" })
    })

    it("wraps GraphQLError into ApiError", async () => {
      const { GraphQLError } = await import("../graphql-types")
      mockLogin.mockRejectedValue(
        new GraphQLError([{ message: "Invalid credentials" }]),
      )

      await expect(
        signInWithEmail("bad@test.com", "wrong"),
      ).rejects.toThrow(/Invalid credentials/)
    })
  })

  describe("signUpWithEmail", () => {
    it("calls GraphQL signup and persists the session", async () => {
      mockSignup.mockResolvedValue(authResponse)

      const result = await signUpWithEmail("new@test.com", "password123")

      expect(mockSignup).toHaveBeenCalledWith(
        "new@test.com",
        "password123",
      )
      expect(localStorage.getItem(TOKEN_KEY)).toBe("gql-token-123")
      expect(mockSetToken).toHaveBeenCalledWith("gql-token-123")
      expect(mockSetUser).toHaveBeenCalledWith(sessionUser)
      expect(result).toEqual({ user: sessionUser, token: "gql-token-123" })
    })
  })

  describe("signInWithGoogle", () => {
    it("warns when GOOGLE_CLIENT_ID is not configured", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation()

      delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      await signInWithGoogle()

      expect(warnSpy).toHaveBeenCalledWith(
        "Google sign-in is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID.",
      )
      warnSpy.mockRestore()
    })
  })

  describe("resetPassword", () => {
    it("calls GraphQL requestPasswordReset", async () => {
      mockRequestPasswordReset.mockResolvedValue(true)

      await resetPassword("test@test.com")

      expect(mockRequestPasswordReset).toHaveBeenCalledWith("test@test.com")
    })

    it("wraps GraphQLError into ApiError", async () => {
      const { GraphQLError } = await import("../graphql-types")
      mockRequestPasswordReset.mockRejectedValue(
        new GraphQLError([{ message: "Email not found" }]),
      )

      await expect(resetPassword("unknown@test.com")).rejects.toThrow(
        /Email not found/,
      )
    })
  })

  describe("updatePassword", () => {
    it("calls GraphQL resetPassword with recovery code and new password", async () => {
      mockResetPassword.mockResolvedValue(true)

      await updatePassword("recovery-code", "newpassword123")

      expect(mockResetPassword).toHaveBeenCalledWith(
        "recovery-code",
        "newpassword123",
      )
    })
  })

  describe("signOut", () => {
    it("clears token from localStorage and resets store state", async () => {
      localStorage.setItem(TOKEN_KEY, "some-token")

      await signOut()

      expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
      expect(mockClearAuthToken).toHaveBeenCalled()
      expect(mockSetToken).toHaveBeenCalledWith(null)
      expect(mockSetUser).toHaveBeenCalledWith(null)
      expect(mockSetActiveBaby).toHaveBeenCalledWith(null)
      expect(mockSetBabies).toHaveBeenCalledWith([])
    })
  })

  describe("getSessionToken", () => {
    it("returns null when no token exists", () => {
      expect(getSessionToken()).toBeNull()
    })

    it("returns the token from localStorage when present", () => {
      localStorage.setItem(TOKEN_KEY, "my-jwt-token")
      expect(getSessionToken()).toBe("my-jwt-token")
    })
  })

  describe("isAuthenticated", () => {
    it("returns false when there is no token in localStorage", () => {
      expect(isAuthenticated()).toBe(false)
    })

    it("returns true when a token exists in localStorage", () => {
      localStorage.setItem(TOKEN_KEY, "some-token")
      expect(isAuthenticated()).toBe(true)
    })
  })
})
