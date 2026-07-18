import { render, screen, fireEvent } from "@testing-library/react"
import { BreastTimer } from "../breast-timer"

describe("BreastTimer", () => {
  const baseProps = {
    runningSide: null as "left" | "right" | null,
    leftSeconds: 0,
    rightSeconds: 0,
    onToggleSide: jest.fn(),
    onManualDurationChange: jest.fn(),
    manualDuration: 0,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders Left and Right side labels", () => {
    render(<BreastTimer {...baseProps} />)
    expect(screen.getByText("Left Side")).toBeInTheDocument()
    expect(screen.getByText("Right Side")).toBeInTheDocument()
  })

  it("formats elapsed time as MM:SS", () => {
    const { rerender } = render(<BreastTimer {...baseProps} leftSeconds={0} rightSeconds={0} />)
    expect(screen.getAllByText("00:00")).toHaveLength(2)
    rerender(<BreastTimer {...baseProps} leftSeconds={65} rightSeconds={0} />)
    expect(screen.getByText("01:05")).toBeInTheDocument()
    rerender(<BreastTimer {...baseProps} leftSeconds={0} rightSeconds={125} />)
    expect(screen.getByText("02:05")).toBeInTheDocument()
  })

  it("shows play icon when a side is not running", () => {
    render(<BreastTimer {...baseProps} />)
    expect(screen.getAllByText("play_circle").length).toBe(2)
  })

  it("shows pause icon for the running side", () => {
    render(<BreastTimer {...baseProps} runningSide="left" />)
    expect(screen.getAllByText("pause_circle").length).toBe(1)
  })

  it("calls onToggleSide with the clicked side", () => {
    const { container } = render(<BreastTimer {...baseProps} />)
    const sideButtons = container.querySelectorAll("button")
    fireEvent.click(sideButtons[0])
    expect(baseProps.onToggleSide).toHaveBeenCalledWith("left")
  })

  it("applies timer-active class to the running side", () => {
    const { container } = render(<BreastTimer {...baseProps} runningSide="right" />)
    const sideButtons = container.querySelectorAll("button")
    expect(sideButtons[1]).toHaveClass("timer-active")
  })

  it("renders manual duration input and calls onManualDurationChange", () => {
    render(<BreastTimer {...baseProps} manualDuration={5} />)
    const input = screen.getByPlaceholderText("0") as HTMLInputElement
    expect(input.value).toBe("5")
    fireEvent.change(input, { target: { value: "12" } })
    expect(baseProps.onManualDurationChange).toHaveBeenCalledWith(12)
  })

  it("clamps negative manual duration to 0", () => {
    render(<BreastTimer {...baseProps} />)
    const input = screen.getByPlaceholderText("0") as HTMLInputElement
    fireEvent.change(input, { target: { value: "-3" } })
    expect(baseProps.onManualDurationChange).toHaveBeenCalledWith(0)
  })
})
