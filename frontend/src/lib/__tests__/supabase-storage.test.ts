import { uploadBabyPhoto } from "../supabase-storage"

const mockUpload = jest.fn()
const mockGetPublicUrl = jest.fn()
const mockFrom = jest.fn(() => ({
  getPublicUrl: mockGetPublicUrl,
  upload: mockUpload,
}))

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: mockFrom,
    },
  })),
}))

describe("supabase storage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"
    mockUpload.mockResolvedValue({ data: {}, error: null })
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://storage.test/baby-photo.jpg" },
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("uploads baby photos to the baby-photos bucket and returns the public URL", async () => {
    jest.spyOn(Date, "now").mockReturnValue(12345)
    const file = new File(["photo"], "Maya Rose.png", { type: "image/png" })

    await expect(uploadBabyPhoto(file)).resolves.toBe(
      "https://storage.test/baby-photo.jpg",
    )

    expect(mockFrom).toHaveBeenCalledWith("baby-photos")
    expect(mockUpload).toHaveBeenCalledWith(
      "baby-profiles/maya-rose-12345.png",
      file,
      expect.objectContaining({
        contentType: "image/png",
        upsert: false,
      }),
    )
  })
})
