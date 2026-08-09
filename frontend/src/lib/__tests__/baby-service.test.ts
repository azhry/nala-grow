/* eslint-disable @typescript-eslint/no-explicit-any */
import { fetchBabies, createBaby, updateBaby, deleteBaby } from "../baby-service"

const mockGetBabies = jest.fn()
const mockGqlCreateBaby = jest.fn()
const mockGqlUpdateBaby = jest.fn()
const mockGqlDeleteBaby = jest.fn()

jest.mock("../graphql-client", () => ({
  getBabies: (...args: any[]) => mockGetBabies(...args),
  createBaby: (...args: any[]) => mockGqlCreateBaby(...args),
  updateBaby: (...args: any[]) => mockGqlUpdateBaby(...args),
  deleteBaby: (...args: any[]) => mockGqlDeleteBaby(...args),
}))

describe("baby service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("fetchBabies", () => {
    it("maps GraphQL profiles into the existing store shape", async () => {
      mockGetBabies.mockResolvedValue([
        {
          id: "1",
          name: "Lily",
          dob: "2024-06-12",
          sex: "female",
          photoUrl: "http://example.com/pic.jpg",
          createdAt: "",
          userId: "",
        },
      ])

      await expect(fetchBabies()).resolves.toEqual([
        {
          id: "1",
          name: "Lily",
          dob: "2024-06-12",
          sex: "female",
          photo_url: "http://example.com/pic.jpg",
        },
      ])
      expect(mockGetBabies).toHaveBeenCalledWith()
    })
  })

  describe("createBaby", () => {
    it("calls createBaby from graphql client with mapped fields", async () => {
      const babyData = { name: "Lily", dob: "2024-06-12", sex: "female" }
      mockGqlCreateBaby.mockResolvedValue({ id: "1", name: "Lily", dob: "2024-06-12", sex: "female", photoUrl: "", createdAt: "", userId: "" })
      await createBaby(babyData)
      expect(mockGqlCreateBaby).toHaveBeenCalledWith({
        name: "Lily",
        dob: "2024-06-12",
        sex: "female",
        photoUrl: undefined,
      })
    })

    it("maps photo_url to photoUrl", async () => {
      mockGqlCreateBaby.mockResolvedValue({ id: "1", name: "Lily", dob: "2024-06-12", sex: "female", photoUrl: "http://example.com/pic.jpg", createdAt: "", userId: "" })
      await createBaby({ name: "Lily", photo_url: "http://example.com/pic.jpg" })
      expect(mockGqlCreateBaby).toHaveBeenCalledWith(
        expect.objectContaining({ photoUrl: "http://example.com/pic.jpg" })
      )
    })
  })

  describe("updateBaby", () => {
    it("calls updateBaby from graphql client with mapped fields", async () => {
      const updates = { name: "Lily Updated" }
      mockGqlUpdateBaby.mockResolvedValue({ id: "1", name: "Lily Updated", dob: "2024-06-12", sex: "female", photoUrl: "", createdAt: "", userId: "" })
      await updateBaby("1", updates)
      expect(mockGqlUpdateBaby).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({ name: "Lily Updated" })
      )
    })
  })

  describe("deleteBaby", () => {
    it("calls deleteBaby from graphql client", async () => {
      mockGqlDeleteBaby.mockResolvedValue({ id: "1", name: "Lily", dob: "2024-06-12", sex: "female", photoUrl: "", createdAt: "", userId: "" })
      await deleteBaby("1")
      expect(mockGqlDeleteBaby).toHaveBeenCalledWith("1")
    })
  })
})
