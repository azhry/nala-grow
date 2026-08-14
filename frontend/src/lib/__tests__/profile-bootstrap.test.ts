import {
  bootstrapProfiles,
  getPostAuthDestination,
  ProfileLookupError,
} from "../profile-bootstrap"

const mockFetchBabies = jest.fn()
const mockSetBabies = jest.fn()
const mockSetActiveBaby = jest.fn()

jest.mock("../baby-service", () => ({
  fetchBabies: (...args: unknown[]) => mockFetchBabies(...args),
}))

jest.mock("../store", () => ({
  useAppStore: {
    getState: () => ({
      setBabies: mockSetBabies,
      setActiveBaby: mockSetActiveBaby,
    }),
  },
}))

const baby = {
  id: "baby-1",
  name: "Maya",
  dob: "2024-01-10",
  sex: "female" as const,
}

describe("profile bootstrap", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("seeds the full profile list and first active profile", async () => {
    mockFetchBabies.mockResolvedValue([baby])

    await expect(bootstrapProfiles()).resolves.toEqual([baby])

    expect(mockFetchBabies).toHaveBeenCalledTimes(1)
    expect(mockSetBabies).toHaveBeenCalledWith([baby])
    expect(mockSetActiveBaby).toHaveBeenCalledWith(baby)
  })

  it("clears stale active profile state when the successful lookup is empty", async () => {
    mockFetchBabies.mockResolvedValue([])

    await expect(bootstrapProfiles()).resolves.toEqual([])

    expect(mockSetBabies).toHaveBeenCalledWith([])
    expect(mockSetActiveBaby).toHaveBeenCalledWith(null)
  })

  it("does not convert a failed lookup into an empty result", async () => {
    mockFetchBabies.mockRejectedValue(new Error("network unavailable"))

    await expect(bootstrapProfiles()).rejects.toThrow("network unavailable")
    expect(mockSetBabies).not.toHaveBeenCalled()
    expect(mockSetActiveBaby).not.toHaveBeenCalled()
  })

  it("routes zero-profile users to onboarding before considering a redirect", async () => {
    mockFetchBabies.mockResolvedValue([])

    await expect(getPostAuthDestination("/feeding?from=login")).resolves.toBe(
      "/profile/create",
    )
  })

  it("retains safe protected destinations for users with profiles", async () => {
    mockFetchBabies.mockResolvedValue([baby])

    await expect(
      getPostAuthDestination("/profile/manage?from=login"),
    ).resolves.toBe("/profile/manage?from=login")
  })

  it("falls back to dashboard for an unsafe destination when profiles exist", async () => {
    mockFetchBabies.mockResolvedValue([baby])

    await expect(getPostAuthDestination("https://evil.test")).resolves.toBe(
      "/dashboard",
    )
  })

  it("exposes lookup failures as a recoverable profile error", async () => {
    mockFetchBabies.mockRejectedValue(new Error("network unavailable"))

    await expect(getPostAuthDestination(null)).rejects.toBeInstanceOf(
      ProfileLookupError,
    )
  })
})
