/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getSessionToken,
  getCurrentSession,
  isAuthenticated,
  refreshAuthSession,
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
  updatePassword,
} from "../auth"
import type { AuthResponse } from "../graphql-types"
import { AUTH_TOKEN_KEY } from "../auth-constants"
import { AUTH_SESSION_KEY } from "../auth-constants"

// ─── GraphQL client mocks ────────────────────────────────────────────────────

const mockLogin = jest.fn()
const mockSignup = jest.fn()
const mockLoginWithGoogle = jest.fn()
const mockRefreshSession = jest.fn()
const mockRequestPasswordReset = jest.fn()
const mockResetPassword = jest.fn()
const mockGetMe = jest.fn()
const mockSetAuthToken = jest.fn()
const mockClearAuthToken = jest.fn()

jest.mock("../graphql-client", () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  signup: (...args: unknown[]) => mockSignup(...args),
  loginWithGoogle: (...args: unknown[]) => mockLoginWithGoogle(...args),
  loginWithCasdoor: jest.fn(),
  refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
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
const mockResetState = jest.fn()
let mockUserValue: { id: string; email: string } | null = null

jest.mock("../store", () => ({
  useAppStore: {
    getState: () => ({
      user: mockUserValue,
      setUser: mockSetUser,
      setToken: mockSetToken,
      setActiveBaby: mockSetActiveBaby,
      setBabies: mockSetBabies,
      resetState: mockResetState,
    }),
  },
}))

// ─── Test data ───────────────────────────────────────────────────────────────

const sessionUser = {
  id: "user-1",
  email: "test@test.com",
  displayName: "Test Parent",
  photoUrl: "",
  createdAt: "2026-01-01T00:00:00Z",
  subject: "casdoor-user-1",
  organization: "nala-grow",
  roles: ["Parent"],
  permissions: [],
}
const authResponse: AuthResponse = {
  token: "gql-token-123",
  refreshToken: "refresh-token-123",
  expiresIn: 60,
  user: sessionUser,
}

describe("auth service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUserValue = null
    localStorage.clear()
    document.cookie = `${AUTH_TOKEN_KEY}=; max-age=0`
    document.cookie = `${AUTH_SESSION_KEY}=; max-age=0`
  })

  describe("signInWithEmail", () => {
    it("calls GraphQL login and persists the session", async () => {
      mockLogin.mockResolvedValue(authResponse)

      const result = await signInWithEmail("test@test.com", "password123")

      expect(mockLogin).toHaveBeenCalledWith("test@test.com", "password123")
      expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe("gql-token-123")
      expect(mockSetAuthToken).toHaveBeenCalledWith("gql-token-123")
      expect(mockSetToken).toHaveBeenCalledWith("gql-token-123")
      expect(mockSetUser).toHaveBeenCalledWith(sessionUser)
      expect(result).toEqual(expect.objectContaining({ user: sessionUser, token: "gql-token-123" }))
      expect(result.expiresAt).toBeGreaterThan(Date.now())
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
      expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe("gql-token-123")
      expect(mockSetToken).toHaveBeenCalledWith("gql-token-123")
      expect(mockSetUser).toHaveBeenCalledWith(sessionUser)
      expect(result).toEqual(expect.objectContaining({ user: sessionUser, token: "gql-token-123" }))
    })
  })

  describe("signInWithGoogle", () => {
    it("fails safely when Casdoor is not configured", async () => {
      delete process.env.NEXT_PUBLIC_CASDOOR_ISSUER
      delete process.env.NEXT_PUBLIC_CASDOOR_CLIENT_ID

      await expect(signInWithGoogle()).rejects.toThrow(/not configured/i)
    })
  })

  describe("refreshAuthSession", () => {
    it("persists the refreshed access token without exposing the refresh token in the cookie", async () => {
      localStorage.setItem(
        AUTH_SESSION_KEY,
        JSON.stringify({
          token: "expired-token",
          refreshToken: "refresh-token",
          expiresAt: Date.now() - 1,
        }),
      )
      mockRefreshSession.mockResolvedValue({
        ...authResponse,
        token: "refreshed-token",
      })

      const result = await refreshAuthSession()

      expect(mockRefreshSession).toHaveBeenCalledWith("refresh-token")
      expect(result?.token).toBe("refreshed-token")
      expect(localStorage.getItem(AUTH_SESSION_KEY)).toContain("refresh-token-123")
      expect(document.cookie).not.toContain("refresh-token")
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
      localStorage.setItem(AUTH_TOKEN_KEY, "some-token")

      await signOut()

      expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull()
      expect(mockClearAuthToken).toHaveBeenCalled()
      expect(mockResetState).toHaveBeenCalled()
    })
  })

  describe("getSessionToken", () => {
    it("returns null when no token exists", () => {
      expect(getSessionToken()).toBeNull()
    })

    it("returns the token from localStorage when present", () => {
      localStorage.setItem(AUTH_TOKEN_KEY, "my-jwt-token")
      expect(getSessionToken()).toBe("my-jwt-token")
    })

    it("restores the token from the browser auth cookie", () => {
      document.cookie = `${AUTH_TOKEN_KEY}=cookie-token`

      expect(getSessionToken()).toBe("cookie-token")
      expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe("cookie-token")
      expect(mockSetAuthToken).toHaveBeenCalledWith("cookie-token")
      expect(mockSetToken).toHaveBeenCalledWith("cookie-token")
    })
  })

  describe("getCurrentSession", () => {
    it("validates and persists a session recovered from the browser cookie", async () => {
      document.cookie = `${AUTH_TOKEN_KEY}=cookie-token`
      mockGetMe.mockResolvedValue({ ...sessionUser })

      await expect(getCurrentSession()).resolves.toEqual({
        user: sessionUser,
        token: "cookie-token",
      })
      expect(mockGetMe).toHaveBeenCalled()
      expect(mockSetUser).toHaveBeenCalledWith(sessionUser)
    })

    it("clears an invalid browser cookie before returning no session", async () => {
      document.cookie = `${AUTH_TOKEN_KEY}=expired-token`
      mockGetMe.mockRejectedValue(new Error("expired"))

      await expect(getCurrentSession()).resolves.toBeNull()
      expect(document.cookie).not.toContain(`${AUTH_TOKEN_KEY}=`)
      expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull()
      expect(mockResetState).toHaveBeenCalled()
    })
  })

  describe("isAuthenticated", () => {
    it("returns false when there is no token in localStorage", () => {
      expect(isAuthenticated()).toBe(false)
    })

    it("returns true when a token exists in localStorage", () => {
      localStorage.setItem(AUTH_TOKEN_KEY, "some-token")
      expect(isAuthenticated()).toBe(true)
    })
  })
})
