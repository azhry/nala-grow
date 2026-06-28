import { render, screen, fireEvent } from "@testing-library/react"
import { FAB } from "../fab"

describe("FAB", () => {
  it("renders with default icon", () => {
    render(<FAB />)
    expect(screen.getByText("add")).toBeInTheDocument()
  })

  it("renders custom icon", () => {
    render(<FAB icon="edit" />)
    expect(screen.getByText("edit")).toBeInTheDocument()
  })

  it("renders primary variant", () => {
    const { container } = render(<FAB variant="primary" />)
    expect(container.firstChild).toHaveClass("bg-primary")
    expect(container.firstChild).toHaveClass("text-on-primary")
  })

  it("renders secondary variant", () => {
    const { container } = render(<FAB variant="secondary" />)
    expect(container.firstChild).toHaveClass("bg-surface-container-lowest")
    expect(container.firstChild).toHaveClass("border")
  })

  it("has fixed positioning by default", () => {
    const { container } = render(<FAB />)
    expect(container.firstChild).toHaveClass("fixed")
  })

  it("removes fixed positioning when fixed=false", () => {
    const { container } = render(<FAB fixed={false} />)
    expect(container.firstChild).toHaveClass("inline-flex")
    expect(container.firstChild).not.toHaveClass("fixed")
  })

  it("is rounded-full", () => {
    const { container } = render(<FAB />)
    expect(container.firstChild).toHaveClass("rounded-full")
  })

  it("has w-14 h-14", () => {
    const { container } = render(<FAB />)
    expect(container.firstChild).toHaveClass("w-14")
    expect(container.firstChild).toHaveClass("h-14")
  })

  it("calls onClick when clicked", () => {
    const handleClick = jest.fn()
    render(<FAB onClick={handleClick} />)
    fireEvent.click(screen.getByRole("button"))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("merges custom className", () => {
    const { container } = render(<FAB className="my-fab" />)
    expect(container.firstChild).toHaveClass("my-fab")
  })

  it("has shadow-lg class", () => {
    const { container } = render(<FAB />)
    expect(container.firstChild).toHaveClass("shadow-lg")
  })

  it("has active scale effect", () => {
    const { container } = render(<FAB />)
    expect(container.firstChild).toHaveClass("active:scale-90")
  })
})
