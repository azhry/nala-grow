import { NextRequest, NextResponse } from "next/server"
import { AUTH_TOKEN_KEY } from "./lib/auth-constants"

export function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_KEY)?.value
  const path = request.nextUrl.pathname

  const isAuthPage =
    path === "/login" ||
    path === "/signup" ||
    path === "/reset-password"

  const isProtected =
    path === "/" ||
    path.startsWith("/dashboard") ||
    path.startsWith("/feeding") ||
    path.startsWith("/sleep") ||
    path.startsWith("/milestones") ||
    path.startsWith("/profile") ||
    path.startsWith("/export") ||
    path.startsWith("/settings")

  if (!token && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (token && isAuthPage) {
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
  ],
}
