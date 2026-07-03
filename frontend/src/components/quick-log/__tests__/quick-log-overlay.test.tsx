import { render, screen, fireEvent } from "@testing-library/react"
import { QuickLogOverlay } from "../quick-log-overlay"

const mockPush = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

describe("QuickLogOverlay", () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it("renders nothing when closed", () => {
    const { container } = render(<QuickLogOverlay open={false} onClose={() => {}} />)
    expect(container.innerHTML).toBe("")
  })

  it("renders quick log actions when open", () => {
    render(<QuickLogOverlay open={true} onClose={() => {}} />)
    expect(screen.getByText("Breastfeed")).toBeInTheDocument()
    expect(screen.getByText("Bottle Feed")).toBeInTheDocument()
    expect(screen.getByText("Solids")).toBeInTheDocument()
    expect(screen.getByText("Sleep")).toBeInTheDocument()
    expect(screen.getByText("Growth")).toBeInTheDocument()
    expect(screen.getByText("Diaper")).toBeInTheDocument()
  })

  it("renders cancel link", () => {
    render(<QuickLogOverlay open={true} onClose={() => {}} />)
    expect(screen.getByText("Cancel and return to dashboard")).toBeInTheDocument()
  })

  it("renders New Milestone button", () => {
    render(<QuickLogOverlay open={true} onClose={() => {}} />)
    expect(screen.getByText("New Milestone")).toBeInTheDocument()
    expect(screen.getByText("Capture a special moment")).toBeInTheDocument()
  })

  it("calls onClose then navigates on action select", () => {
    const onClose = jest.fn()
    render(<QuickLogOverlay open={true} onClose={onClose} />)
    fireEvent.click(screen.getByText("Sleep"))
    expect(onClose).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith("/sleep/log")
  })

  it("calls onClose when cancel clicked", () => {
    const onClose = jest.fn()
    render(<QuickLogOverlay open={true} onClose={onClose} />)
    fireEvent.click(screen.getByText("Cancel and return to dashboard"))
    expect(onClose).toHaveBeenCalled()
  })
})
