/** @jest-environment node */

import { NextRequest } from "next/server"
import { AUTH_TOKEN_KEY } from "./lib/auth-constants"
import { middleware } from "./middleware"

function request(path: string, token?: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: token ? { cookie: `${AUTH_TOKEN_KEY}=${token}` } : undefined,
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
  })
})
