import { render, screen, fireEvent, act } from "@testing-library/react"
import { Timer } from "../timer"

jest.useFakeTimers()

describe("Timer", () => {
  beforeEach(() => {
    jest.clearAllTimers()
  })

  it("renders initial time as 00:00:00", () => {
    render(<Timer />)
    expect(screen.getByText("00:00:00")).toBeInTheDocument()
  })

  it("renders with initial seconds", () => {
    render(<Timer initialSeconds={3661} />)
    expect(screen.getByText("01:01:01")).toBeInTheDocument()
  })

  it("shows pause button when running", () => {
    render(<Timer running />)
    expect(screen.getByText("Pause")).toBeInTheDocument()
  })

  it("shows stop button when not running", () => {
    render(<Timer running={false} />)
    expect(screen.getByText("Stop")).toBeInTheDocument()
  })

  it("increments time when running", () => {
    render(<Timer running />)
    act(() => {
      jest.advanceTimersByTime(3000)
    })
    expect(screen.getByText("00:00:03")).toBeInTheDocument()
  })

  it("stops incrementing when not running", () => {
    const { rerender } = render(<Timer running />)
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    rerender(<Timer running={false} />)
    act(() => {
      jest.advanceTimersByTime(3000)
    })
    expect(screen.getByText("00:00:02")).toBeInTheDocument()
  })

  it("calls onTick every second", () => {
    const onTick = jest.fn()
    render(<Timer running onTick={onTick} />)
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    expect(onTick).toHaveBeenCalledTimes(2)
    expect(onTick).toHaveBeenLastCalledWith(2)
  })

  it("calls onPause with current seconds", () => {
    const onPause = jest.fn()
    render(<Timer running onPause={onPause} />)
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    fireEvent.click(screen.getByText("Pause"))
    expect(onPause).toHaveBeenCalledWith(5)
  })

  it("calls onStop with current seconds", () => {
    const onStop = jest.fn()
    render(<Timer initialSeconds={10} onStop={onStop} />)
    fireEvent.click(screen.getByText("Stop"))
    expect(onStop).toHaveBeenCalledWith(10)
  })

  it("renders default variant with background class", () => {
    const { container } = render(<Timer variant="default" />)
    expect(container.firstChild).toHaveClass("bg-surface-container-low")
  })

  it("renders active variant with gradient class", () => {
    const { container } = render(<Timer variant="active" />)
    expect(container.firstChild).toHaveClass("bg-gradient-to-br")
  })

  it("renders minimal variant without background class", () => {
    const { container } = render(<Timer variant="minimal" />)
    expect(container.firstChild).not.toHaveClass("bg-surface-container-low")
    expect(container.firstChild).not.toHaveClass("bg-gradient-to-br")
  })

  it("displays time in tabular-nums", () => {
    const { container } = render(<Timer />)
    const timeDisplay = container.querySelector(".tabular-nums")
    expect(timeDisplay).toBeInTheDocument()
  })

  it("formats time correctly at various durations", () => {
    const { unmount } = render(<Timer initialSeconds={0} />)
    expect(screen.getByText("00:00:00")).toBeInTheDocument()
    unmount()
    render(<Timer initialSeconds={59} />)
    expect(screen.getByText("00:00:59")).toBeInTheDocument()
    unmount()
    render(<Timer initialSeconds={60} />)
    expect(screen.getByText("00:01:00")).toBeInTheDocument()
    unmount()
    render(<Timer initialSeconds={3600} />)
    expect(screen.getByText("01:00:00")).toBeInTheDocument()
    unmount()
    render(<Timer initialSeconds={86399} />)
    expect(screen.getByText("23:59:59")).toBeInTheDocument()
  })
})
