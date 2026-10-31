import { NextRequest, NextResponse } from "next/server"
import {
  AUTH_SESSION_EXPIRY_KEY,
  AUTH_TOKEN_KEY,
  hasValidSessionCookie,
} from "./lib/auth-constants"

export function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_KEY)?.value
  const expiresAt = request.cookies.get(AUTH_SESSION_EXPIRY_KEY)?.value
  const path = request.nextUrl.pathname

  const isAuthPage =
    path === "/login" ||
    path === "/signup" ||
    path === "/reset-password" ||
    path === "/auth/callback"

  const isProtected =
    path === "/" ||
    path.startsWith("/dashboard") ||
    path.startsWith("/feeding") ||
    path.startsWith("/sleep") ||
    path.startsWith("/milestones") ||
    path.startsWith("/profile") ||
    path.startsWith("/export") ||
    path.startsWith("/settings")

  const hasValidSession = hasValidSessionCookie(token, expiresAt)

  if (!hasValidSession && isProtected) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", `${path}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  if (hasValidSession && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/feeding/:path*",
    "/sleep/:path*",
    "/milestones/:path*",
    "/profile/:path*",
    "/export/:path*",
    "/settings/:path*",
    "/login/:path*",
    "/signup/:path*",
    "/reset-password/:path*",
    "/auth/callback",
  ],
}
