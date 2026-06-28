import { render } from "@testing-library/react"
import { ProgressBar } from "../progress-bar"

describe("ProgressBar", () => {
  it("renders with 50% width for value 50 out of 100", () => {
    const { container } = render(<ProgressBar value={50} />)
    const bar = container.querySelector(".h-full")
    expect(bar).toHaveStyle("width: 50%")
  })

  it("renders with 0% width for value 0", () => {
    const { container } = render(<ProgressBar value={0} />)
    const bar = container.querySelector(".h-full")
    expect(bar).toHaveStyle("width: 0%")
  })

  it("renders with 100% width for value 100", () => {
    const { container } = render(<ProgressBar value={100} />)
    const bar = container.querySelector(".h-full")
    expect(bar).toHaveStyle("width: 100%")
  })

  it("clamps value above max to 100%", () => {
    const { container } = render(<ProgressBar value={150} />)
    const bar = container.querySelector(".h-full")
    expect(bar).toHaveStyle("width: 100%")
  })

  it("clamps value below 0 to 0%", () => {
    const { container } = render(<ProgressBar value={-10} />)
    const bar = container.querySelector(".h-full")
    expect(bar).toHaveStyle("width: 0%")
  })

  it("uses custom max prop", () => {
    const { container } = render(<ProgressBar value={3} max={10} />)
    const bar = container.querySelector(".h-full")
    expect(bar).toHaveStyle("width: 30%")
  })

  it("renders with gradient background", () => {
    const { container } = render(<ProgressBar value={50} />)
    const bar = container.querySelector(".h-full")
    expect(bar).toHaveClass("bg-gradient-to-r")
    expect(bar).toHaveClass("from-primary")
    expect(bar).toHaveClass("to-primary-container")
  })

  it("renders track with rounded-full", () => {
    const { container } = render(<ProgressBar value={50} />)
    const track = container.firstChild
    expect(track).toHaveClass("rounded-full")
  })

  it("has h-2 height", () => {
    const { container } = render(<ProgressBar value={50} />)
    expect(container.firstChild).toHaveClass("h-2")
  })

  it("merges custom className for track", () => {
    const { container } = render(<ProgressBar value={50} className="my-track" />)
    expect(container.firstChild).toHaveClass("my-track")
  })

  it("merges custom barClassName", () => {
    const { container } = render(<ProgressBar value={50} barClassName="my-bar" />)
    const bar = container.querySelector(".h-full")
    expect(bar).toHaveClass("my-bar")
  })

  it("has transition-all duration-500", () => {
    const { container } = render(<ProgressBar value={50} />)
    const bar = container.querySelector(".h-full")
    expect(bar).toHaveClass("transition-all")
    expect(bar).toHaveClass("duration-500")
  })
})
