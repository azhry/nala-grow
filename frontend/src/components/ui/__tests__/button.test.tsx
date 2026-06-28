import { render, screen, fireEvent } from "@testing-library/react"
import { Button } from "../button"

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument()
  })

  it("renders primary variant with correct classes", () => {
    const { container } = render(<Button variant="primary">Primary</Button>)
    expect(container.firstChild).toHaveClass("bg-primary")
    expect(container.firstChild).toHaveClass("text-on-primary")
  })

  it("renders secondary variant", () => {
    const { container } = render(<Button variant="secondary">Secondary</Button>)
    expect(container.firstChild).toHaveClass("bg-surface-container-highest")
  })

  it("renders outline variant", () => {
    const { container } = render(<Button variant="outline">Outline</Button>)
    expect(container.firstChild).toHaveClass("border-2")
    expect(container.firstChild).toHaveClass("border-primary")
  })

  it("renders ghost variant", () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>)
    expect(container.firstChild).toHaveClass("bg-transparent")
  })

  it("renders danger variant", () => {
    const { container } = render(<Button variant="danger">Danger</Button>)
    expect(container.firstChild).toHaveClass("bg-error")
  })

  it("renders sm size", () => {
    const { container } = render(<Button size="sm">Small</Button>)
    expect(container.firstChild).toHaveClass("py-2")
    expect(container.firstChild).toHaveClass("rounded-full")
  })

  it("renders md size", () => {
    const { container } = render(<Button size="md">Medium</Button>)
    expect(container.firstChild).toHaveClass("py-3")
    expect(container.firstChild).toHaveClass("rounded-full")
  })

  it("renders lg size", () => {
    const { container } = render(<Button size="lg">Large</Button>)
    expect(container.firstChild).toHaveClass("py-3")
    expect(container.firstChild).toHaveClass("font-headline-sm")
  })

  it("renders xl size with icon", () => {
    const { container } = render(<Button size="xl" icon="arrow_forward">XL</Button>)
    expect(container.firstChild).toHaveClass("py-4")
    expect(container.firstChild).toHaveClass("rounded-full")
    expect(screen.getByText("arrow_forward")).toBeInTheDocument()
  })

  it("shows loading spinner and disables button", () => {
    const { container } = render(<Button loading>Loading</Button>)
    const spinner = container.querySelector(".animate-spin")
    expect(spinner).toBeInTheDocument()
    const button = screen.getByRole("button")
    expect(button).toBeDisabled()
  })

  it("disables button", () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("applies full width class", () => {
    const { container } = render(<Button fullWidth>Full</Button>)
    expect(container.firstChild).toHaveClass("w-full")
  })

  it("calls onClick when clicked", () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    fireEvent.click(screen.getByRole("button"))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("does not call onClick when disabled", () => {
    const handleClick = jest.fn()
    render(<Button disabled onClick={handleClick}>Click</Button>)
    fireEvent.click(screen.getByRole("button"))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it("merges custom className", () => {
    const { container } = render(<Button className="custom-class">Custom</Button>)
    expect(container.firstChild).toHaveClass("custom-class")
  })

  it("renders icon prop", () => {
    render(<Button icon="add">With Icon</Button>)
    expect(screen.getByText("add")).toBeInTheDocument()
  })

  it("has active scale effect class", () => {
    const { container } = render(<Button>Press</Button>)
    expect(container.firstChild).toHaveClass("active:scale-95")
  })

  it("renders form size with h-14 and rounded-xl", () => {
    const { container } = render(<Button size="form">Form CTA</Button>)
    expect(container.firstChild).toHaveClass("h-14")
    expect(container.firstChild).toHaveClass("rounded-xl")
    expect(container.firstChild).toHaveClass("font-headline-sm")
    expect(container.firstChild).toHaveClass("text-headline-sm")
  })
})
