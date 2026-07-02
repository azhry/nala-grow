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

const mockAuth = {
  getSession: jest.fn(),
  exchangeCodeForSession: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  signInWithOAuth: jest.fn(),
  signInWithPassword: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn(),
  updateUser: jest.fn(),
}

const mockSetUser = jest.fn()
const mockSetActiveBaby = jest.fn()
let mockUser: { id: string; email: string } | null = null

jest.mock("@supabase/ssr", () => ({
  createBrowserClient: jest.fn(() => ({
    auth: mockAuth,
  })),
}))

jest.mock("../store", () => ({
  useAppStore: {
    getState: () => ({
      user: mockUser,
      setUser: mockSetUser,
      setActiveBaby: mockSetActiveBaby,
    }),
  },
}))

const sessionUser = { id: "user-1", email: "test@test.com" }
const session = { access_token: "supabase-token", user: sessionUser }

describe("auth service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUser = null
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"
    Object.defineProperty(document, "cookie", {
      configurable: true,
      writable: true,
      value: "",
    })
  })

  describe("signInWithEmail", () => {
    it("uses Supabase email/password auth and persists the session user", async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session, user: sessionUser },
        error: null,
      })

      const result = await signInWithEmail("test@test.com", "password123")

      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@test.com",
        password: "password123",
      })
      expect(mockSetUser).toHaveBeenCalledWith(sessionUser)
      expect(result).toEqual({ user: sessionUser, token: "supabase-token" })
    })
  })

  describe("signUpWithEmail", () => {
    it("uses Supabase signup with a dashboard redirect", async () => {
      mockAuth.signUp.mockResolvedValue({
        data: { session, user: sessionUser },
        error: null,
      })

      await signUpWithEmail("new@test.com", "password123")

      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: "new@test.com",
        password: "password123",
        options: { emailRedirectTo: "http://localhost/dashboard" },
      })
      expect(mockSetUser).toHaveBeenCalledWith(sessionUser)
    })
  })

  describe("signInWithGoogle", () => {
    it("starts Supabase Google OAuth with a dashboard redirect", async () => {
      mockAuth.signInWithOAuth.mockResolvedValue({ data: {}, error: null })

      await signInWithGoogle()

      expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: { redirectTo: "http://localhost/dashboard" },
      })
    })
  })

  describe("resetPassword", () => {
    it("uses Supabase password reset email with reset redirect", async () => {
      mockAuth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      })

      await resetPassword("test@test.com")

      expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        "test@test.com",
        { redirectTo: "http://localhost/reset-password" },
      )
    })
  })

  describe("updatePassword", () => {
    it("exchanges a recovery code before updating the password", async () => {
      mockAuth.exchangeCodeForSession.mockResolvedValue({
        data: { session },
        error: null,
      })
      mockAuth.updateUser.mockResolvedValue({ data: {}, error: null })

      await updatePassword("recovery-code", "newpassword123")

      expect(mockAuth.exchangeCodeForSession).toHaveBeenCalledWith(
        "recovery-code",
      )
      expect(mockAuth.updateUser).toHaveBeenCalledWith({
        password: "newpassword123",
      })
    })
  })

  describe("signOut", () => {
    it("signs out through Supabase and clears local app state", async () => {
      mockAuth.signOut.mockResolvedValue({ error: null })

      await signOut()

      expect(mockAuth.signOut).toHaveBeenCalled()
      expect(mockSetUser).toHaveBeenCalledWith(null)
      expect(mockSetActiveBaby).toHaveBeenCalledWith(null)
    })
  })

  describe("getSessionToken", () => {
    it("returns null when no Supabase auth cookie exists", () => {
      expect(getSessionToken()).toBeNull()
    })

    it("returns the Supabase auth cookie payload when present", () => {
      document.cookie =
        "sb-project-ref-auth-token=%7B%22access_token%22%3A%22abc%22%7D"
      expect(getSessionToken()).toBe('{"access_token":"abc"}')
    })
  })

  describe("isAuthenticated", () => {
    it("returns false when there is no Supabase cookie or user", () => {
      expect(isAuthenticated()).toBe(false)
    })

    it("returns true when the store has a Supabase user", () => {
      mockUser = sessionUser
      expect(isAuthenticated()).toBe(true)
    })
  })
})
