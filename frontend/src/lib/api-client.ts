const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1"

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
  const res = await fetch(`${API_BASE}${path}`, {
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
