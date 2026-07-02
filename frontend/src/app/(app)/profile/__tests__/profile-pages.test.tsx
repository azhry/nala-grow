/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import CreateBabyProfilePage from "../create/page"
import EditBabyProfilePage from "../edit/page"
import ManageProfilesPage from "../manage/page"

const mockPush = jest.fn()
const mockBack = jest.fn()
const mockCreateBaby = jest.fn()
const mockUpdateBaby = jest.fn()
const mockDeleteBaby = jest.fn()
const mockUploadBabyPhoto = jest.fn()
const mockSetActiveBaby = jest.fn()
const mockSetBabies = jest.fn()

let storeState: Record<string, any>

jest.mock("next/navigation", () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useSearchParams: () => new URLSearchParams("id=baby-1"),
}))

jest.mock("@/components/ui", () => ({
  PhotoUpload: ({ onChange }: { onChange: (file: File) => void }) => (
    <input
      aria-label="Profile photo"
      type="file"
      onChange={(event) => {
        const file = event.currentTarget.files?.[0]
        if (file) onChange(file)
      }}
    />
  ),
  Spinner: () => <span>Loading</span>,
  SuccessOverlay: ({
    open,
    title,
  }: {
    open: boolean
    title: string
  }) => (open ? <div>{title}</div> : null),
}))

jest.mock("@/lib/baby-service", () => ({
  createBaby: (...args: any[]) => mockCreateBaby(...args),
  deleteBaby: (...args: any[]) => mockDeleteBaby(...args),
  updateBaby: (...args: any[]) => mockUpdateBaby(...args),
}))

jest.mock("@/lib/supabase-storage", () => ({
  uploadBabyPhoto: (...args: any[]) => mockUploadBabyPhoto(...args),
}))

jest.mock("@/lib/store", () => ({
  useAppStore: (selector: (state: Record<string, any>) => unknown) =>
    selector(storeState),
}))

const babyOne = {
  id: "baby-1",
  name: "Maya",
  dob: "2024-01-10",
  sex: "female" as const,
  photo_url: "https://storage.test/maya.jpg",
}

const babyTwo = {
  id: "baby-2",
  name: "Sam",
  dob: "2023-10-02",
  sex: "male" as const,
}

describe("profile pages", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    storeState = {
      activeBaby: babyOne,
      babies: [babyOne, babyTwo],
      setActiveBaby: mockSetActiveBaby,
      setBabies: mockSetBabies,
    }
    mockUploadBabyPhoto.mockResolvedValue("https://storage.test/new-photo.jpg")
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: jest.fn(() => "blob:preview"),
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("creates a baby profile with a Supabase Storage photo URL", async () => {
    storeState.babies = []
    storeState.activeBaby = null
    mockCreateBaby.mockResolvedValue({
      id: "baby-new",
      name: "Luna",
      dob: "2024-06-12",
      sex: "female",
      photo_url: "https://storage.test/new-photo.jpg",
    })

    render(<CreateBabyProfilePage />)

    fireEvent.change(screen.getByLabelText("Profile photo"), {
      target: {
        files: [new File(["photo"], "luna.png", { type: "image/png" })],
      },
    })
    fireEvent.change(screen.getByLabelText("Baby's Name"), {
      target: { value: "Luna" },
    })
    fireEvent.change(screen.getByLabelText("Date of Birth"), {
      target: { value: "2024-06-12" },
    })
    fireEvent.click(screen.getByText("Female"))
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }))

    await waitFor(() => expect(mockUploadBabyPhoto).toHaveBeenCalled())
    expect(mockCreateBaby).toHaveBeenCalledWith({
      name: "Luna",
      dob: "2024-06-12",
      sex: "female",
      photo_url: "https://storage.test/new-photo.jpg",
    })
    expect(mockSetActiveBaby).toHaveBeenCalledWith(
      expect.objectContaining({ id: "baby-new" }),
    )

    act(() => {
      jest.advanceTimersByTime(1800)
    })
    expect(mockPush).toHaveBeenCalledWith("/profile/manage")
  })

  it("edits a baby profile with a Supabase Storage photo URL", async () => {
    mockUpdateBaby.mockResolvedValue({
      ...babyOne,
      name: "Maya Rose",
      photo_url: "https://storage.test/new-photo.jpg",
    })

    render(<EditBabyProfilePage />)

    fireEvent.change(screen.getByLabelText("Profile photo"), {
      target: {
        files: [new File(["photo"], "maya.png", { type: "image/png" })],
      },
    })
    fireEvent.change(screen.getByLabelText("Baby's Name"), {
      target: { value: "Maya Rose" },
    })
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => expect(mockUploadBabyPhoto).toHaveBeenCalled())
    expect(mockUpdateBaby).toHaveBeenCalledWith(
      "baby-1",
      expect.objectContaining({
        name: "Maya Rose",
        photo_url: "https://storage.test/new-photo.jpg",
      }),
    )
  })

  it("switches active baby without navigating to a missing dashboard route", () => {
    render(<ManageProfilesPage />)

    fireEvent.click(screen.getByRole("button", { name: /switch to sam/i }))
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(mockSetActiveBaby).toHaveBeenCalledWith(babyTwo)
    expect(mockPush).toHaveBeenCalledWith("/profile/manage")
    expect(mockPush).not.toHaveBeenCalledWith("/dashboard")
  })

  it("deletes a baby profile after confirmation", async () => {
    mockDeleteBaby.mockResolvedValue(undefined)

    render(<ManageProfilesPage />)

    const editButtons = screen.getAllByText("edit")
    fireEvent.click(editButtons[1])
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => expect(mockDeleteBaby).toHaveBeenCalledWith("baby-2"))
    expect(mockSetBabies).toHaveBeenCalledWith([babyOne])
  })
})
