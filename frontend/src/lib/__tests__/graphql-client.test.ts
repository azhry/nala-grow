import { execute } from "../graphql-client"

const GRAPHQL_REQUEST_TIMEOUT_MS = 15_000

describe("GraphQL request deadline", () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.useRealTimers()
  })

  it("aborts a stalled request and returns a safe timeout error", async () => {
    jest.useFakeTimers()
    let requestSignal: AbortSignal | null | undefined
    global.fetch = jest.fn(
      (_input: RequestInfo | URL, init?: RequestInit) => {
        requestSignal = init?.signal
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          )
        })
      },
    ) as unknown as typeof fetch

    const request = execute("query { babies { id } }")
    const timeoutAssertion = expect(request).rejects.toThrow(
      "The request timed out. Please try again.",
    )
    await Promise.resolve()
    await jest.advanceTimersByTimeAsync(GRAPHQL_REQUEST_TIMEOUT_MS)
    await timeoutAssertion

    expect(requestSignal?.aborted).toBe(true)
  })

  it("enforces the deadline when fetch ignores abort", async () => {
    jest.useFakeTimers()
    let requestSignal: AbortSignal | null | undefined
    global.fetch = jest.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      requestSignal = init?.signal
      return new Promise<Response>(() => undefined)
    }) as unknown as typeof fetch

    const request = execute("query { babies { id } }")
    const timeoutAssertion = expect(request).rejects.toThrow(
      "The request timed out. Please try again.",
    )
    await Promise.resolve()
    await jest.advanceTimersByTimeAsync(GRAPHQL_REQUEST_TIMEOUT_MS)
    await timeoutAssertion

    expect(requestSignal?.aborted).toBe(true)
  })

  it("keeps the deadline active while parsing the response body", async () => {
    jest.useFakeTimers()
    let requestSignal: AbortSignal | null | undefined
    const response = {
      status: 200,
      json: jest.fn(
        () =>
          new Promise<never>((_resolve, reject) => {
            requestSignal?.addEventListener(
              "abort",
              () => reject(new DOMException("Aborted", "AbortError")),
              { once: true },
            )
          }),
      ),
    } as unknown as Response

    global.fetch = jest.fn(
      (_input: RequestInfo | URL, init?: RequestInit) => {
        requestSignal = init?.signal
        return Promise.resolve(response)
      },
    ) as unknown as typeof fetch

    const request = execute("query { babies { id } }")
    const timeoutAssertion = expect(request).rejects.toThrow(
      "The request timed out. Please try again.",
    )
    await Promise.resolve()
    await jest.advanceTimersByTimeAsync(GRAPHQL_REQUEST_TIMEOUT_MS)
    await timeoutAssertion

    expect(response.json).toHaveBeenCalledTimes(1)
    expect(requestSignal?.aborted).toBe(true)
  })
})
