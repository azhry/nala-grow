import { render } from "@testing-library/react"
import { Spinner } from "../spinner"

describe("Spinner", () => {
  it("renders with sm size", () => {
    const { container } = render(<Spinner size="sm" />)
    expect(container.firstChild).toHaveClass("w-4")
    expect(container.firstChild).toHaveClass("h-4")
    expect(container.firstChild).toHaveClass("border-2")
  })

  it("renders with md size (default)", () => {
    const { container } = render(<Spinner />)
    expect(container.firstChild).toHaveClass("w-6")
    expect(container.firstChild).toHaveClass("h-6")
    expect(container.firstChild).toHaveClass("border-2")
  })

  it("renders with lg size", () => {
    const { container } = render(<Spinner size="lg" />)
    expect(container.firstChild).toHaveClass("w-8")
    expect(container.firstChild).toHaveClass("h-8")
  })

  it("has animate-spin class", () => {
    const { container } = render(<Spinner />)
    expect(container.firstChild).toHaveClass("animate-spin")
  })

  it("has border-current and border-t-transparent", () => {
    const { container } = render(<Spinner />)
    expect(container.firstChild).toHaveClass("border-current")
    expect(container.firstChild).toHaveClass("border-t-transparent")
  })

  it("has rounded-full", () => {
    const { container } = render(<Spinner />)
    expect(container.firstChild).toHaveClass("rounded-full")
  })

  it("merges custom className", () => {
    const { container } = render(<Spinner className="my-spinner" />)
    expect(container.firstChild).toHaveClass("my-spinner")
  })
})
