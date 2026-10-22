/** @jest-environment node */

import { NextRequest } from "next/server"
import { AUTH_SESSION_EXPIRY_KEY, AUTH_TOKEN_KEY } from "./lib/auth-constants"
import { middleware } from "./middleware"

function request(path: string, token?: string, expiresAt?: string) {
  const cookies = [
    token ? `${AUTH_TOKEN_KEY}=${token}` : "",
    expiresAt ? `${AUTH_SESSION_EXPIRY_KEY}=${expiresAt}` : "",
  ]
    .filter(Boolean)
    .join("; ")
  return new NextRequest(`http://localhost${path}`, {
    headers: cookies ? { cookie: cookies } : undefined,
  })
}

describe("auth middleware", () => {
  it("redirects authenticated users before rendering the login page", () => {
    const response = middleware(request("/login", "test-token"))

    expect(response.status).toBe(307)
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe(
      "/dashboard",
    )
  })

  it("redirects unauthenticated users away from protected routes", () => {
    const response = middleware(request("/dashboard"))

    expect(response.status).toBe(307)
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe(
      "/login",
    )
    expect(new URL(response.headers.get("location") ?? "").searchParams.get("redirect")).toBe(
      "/dashboard",
    )
  })

  it("treats an expired access-token cookie as unauthenticated", () => {
    const response = middleware(request("/dashboard", "expired-token", "1"))

    expect(response.status).toBe(307)
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe(
      "/login",
    )
  })

  it("lets the Casdoor callback reach the callback page", () => {
    const response = middleware(request("/auth/callback"))

    expect(response.status).toBe(200)
  })
})
