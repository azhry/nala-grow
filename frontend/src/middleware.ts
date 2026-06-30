import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const SESSION_COOKIE = "nalagrow-session"

const PROTECTED_PATHS = [
  "/dashboard",
  "/feeding",
  "/sleep",
  "/milestones",
  "/profile",
]

const AUTH_PATHS = ["/login", "/signup", "/reset-password"]

function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

function isAuthPath(pathname: string) {
  return AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value)

  if (isProtectedPath(pathname) && !hasSession) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthPath(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/feeding/:path*",
    "/sleep/:path*",
    "/milestones/:path*",
    "/profile/:path*",
    "/login",
    "/signup",
    "/reset-password",
  ],
}
