/* eslint-disable @typescript-eslint/no-explicit-any */
import { fetchBabies, createBaby, updateBaby, deleteBaby } from "../baby-service"

const mockApiFetch = jest.fn()

jest.mock("../api-client", () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
  ApiError: class ApiError extends Error {
    status: number
    traceId: string
    constructor(status: number, message: string, traceId: string) {
      super(message)
      this.status = status
      this.traceId = traceId
    }
  },
}))

describe("baby service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("fetchBabies", () => {
    it("calls GET /babies", async () => {
      mockApiFetch.mockResolvedValue([])
      await fetchBabies()
      expect(mockApiFetch).toHaveBeenCalledWith("/babies")
    })
  })

  describe("createBaby", () => {
    it("calls POST /babies with data", async () => {
      const babyData = { name: "Lily", dob: "2024-06-12", sex: "female" as const }
      mockApiFetch.mockResolvedValue({ id: "1", ...babyData })
      await createBaby(babyData)
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/babies",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(babyData),
        }),
      )
    })
  })

  describe("updateBaby", () => {
    it("calls PATCH /babies/:id with data", async () => {
      const updates = { name: "Lily Updated" }
      mockApiFetch.mockResolvedValue({ id: "1", name: "Lily Updated", dob: "2024-06-12", sex: "female" })
      await updateBaby("1", updates)
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/babies/1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify(updates),
        }),
      )
    })
  })

  describe("deleteBaby", () => {
    it("calls DELETE /babies/:id", async () => {
      mockApiFetch.mockResolvedValue({})
      await deleteBaby("1")
      expect(mockApiFetch).toHaveBeenCalledWith("/babies/1", {
        method: "DELETE",
      })
    })
  })
})
