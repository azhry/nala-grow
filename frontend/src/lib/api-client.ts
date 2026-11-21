/** @deprecated Use graphql-client.ts instead. This file will be removed in FE-016. */
import { getPublicRuntimeConfig } from "./public-runtime-config"

export class ApiError extends Error {
  status: number
  traceId: string

  constructor(status: number, message: string, traceId: string) {
    super(message)
    this.status = status
    this.traceId = traceId
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiBase = getPublicRuntimeConfig().NEXT_PUBLIC_API_URL || "/api/v1"
  const res = await fetch(`${apiBase}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(
      res.status,
      body.message || "Request failed",
      res.headers.get("x-trace-id") || ""
    )
  }

  return res.json()
}
