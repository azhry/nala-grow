import { render, screen, act } from "@testing-library/react"
import { SuccessOverlay } from "../success-overlay"

jest.useFakeTimers()

describe("SuccessOverlay", () => {
  beforeEach(() => {
    jest.clearAllTimers()
  })

  it("does not render when open=false", () => {
    const { container } = render(<SuccessOverlay open={false} title="Success" />)
    expect(container.firstChild).toBeNull()
  })

  it("renders title when open=true", () => {
    render(<SuccessOverlay open title="Profile Created!" />)
    expect(screen.getByText("Profile Created!")).toBeInTheDocument()
  })

  it("renders message when provided", () => {
    render(<SuccessOverlay open title="Done" message="Your changes were saved" />)
    expect(screen.getByText("Your changes were saved")).toBeInTheDocument()
  })

  it("starts progress at 0", () => {
    const { container } = render(<SuccessOverlay open title="Loading" />)
    const bar = container.querySelector(".h-full")
    expect(bar).toHaveStyle("width: 0%")
  })

  it("increments progress over time", () => {
    const { container } = render(<SuccessOverlay open title="Loading" />)
    act(() => {
      jest.advanceTimersByTime(750)
    })
    const bar = container.querySelector(".h-full")
    expect(bar).toHaveStyle("width: 100%")
  })

  it("resets progress when re-opened", () => {
    const { rerender, container } = render(<SuccessOverlay open={false} title="Done" />)
    expect(container.firstChild).toBeNull()
    rerender(<SuccessOverlay open title="Done" />)
    const bar = container.querySelector(".h-full")
    expect(bar).toHaveStyle("width: 0%")
  })

  it("shows close button only after progress completes", () => {
    render(<SuccessOverlay open title="Done" onClose={() => {}} />)
    expect(screen.queryByText("Continue")).not.toBeInTheDocument()
    act(() => {
      jest.advanceTimersByTime(1500)
    })
    expect(screen.getByText("Continue")).toBeInTheDocument()
  })

  it("renders backdrop blur", () => {
    const { container } = render(<SuccessOverlay open title="Done" />)
    expect(container.firstChild).toHaveClass("backdrop-blur-sm")
  })

  it("renders check icon", () => {
    render(<SuccessOverlay open title="Done" />)
    expect(screen.getByText("check_circle")).toBeInTheDocument()
  })

  it("renders with fixed position", () => {
    const { container } = render(<SuccessOverlay open title="Done" />)
    expect(container.firstChild).toHaveClass("fixed")
    expect(container.firstChild).toHaveClass("inset-0")
  })
})
