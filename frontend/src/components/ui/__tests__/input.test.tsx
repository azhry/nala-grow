import { render, screen, fireEvent } from "@testing-library/react"
import { Input } from "../input"

describe("Input", () => {
  it("renders input element", () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument()
  })

  it("renders label when provided with font-label-md text-label-md", () => {
    render(<Input label="Baby Name" />)
    const label = screen.getByText("Baby Name")
    expect(label).toBeInTheDocument()
    expect(label.tagName).toBe("LABEL")
    expect(label).toHaveClass("font-label-md")
    expect(label).toHaveClass("text-label-md")
  })

  it("does not render label when not provided", () => {
    const { container } = render(<Input placeholder="No label" />)
    expect(container.querySelector("label")).not.toBeInTheDocument()
  })

  it("renders error message", () => {
    render(<Input error="This field is required" />)
    expect(screen.getByText("This field is required")).toBeInTheDocument()
  })

  it("applies error styling", () => {
    const { container } = render(<Input error="Error" />)
    const input = container.querySelector("input")
    expect(input).toHaveClass("ring-2")
    expect(input).toHaveClass("ring-error")
  })

  it("renders icon button when icon prop provided", () => {
    render(<Input icon="search" />)
    expect(screen.getByText("search")).toBeInTheDocument()
  })

  it("calls iconAction when icon clicked", () => {
    const handleIcon = jest.fn()
    render(<Input icon="search" iconAction={handleIcon} />)
    fireEvent.click(screen.getByText("search").closest("button")!)
    expect(handleIcon).toHaveBeenCalledTimes(1)
  })

  it("calls onFocus and onBlur callbacks", () => {
    const handleFocus = jest.fn()
    const handleBlur = jest.fn()
    render(<Input onFocus={handleFocus} onBlur={handleBlur} />)
    const input = screen.getByRole("textbox")
    fireEvent.focus(input)
    expect(handleFocus).toHaveBeenCalledTimes(1)
    fireEvent.blur(input)
    expect(handleBlur).toHaveBeenCalledTimes(1)
  })

  it("forwards value and onChange", () => {
    const handleChange = jest.fn()
    render(<Input value="test" onChange={handleChange} />)
    const input = screen.getByRole("textbox")
    expect(input).toHaveValue("test")
    fireEvent.change(input, { target: { value: "new" } })
    expect(handleChange).toHaveBeenCalled()
  })

  it("renders with background class", () => {
    const { container } = render(<Input />)
    const input = container.querySelector("input")!
    expect(input).toHaveClass("bg-surface-container-low")
  })

  it("has rounded-xl class", () => {
    const { container } = render(<Input />)
    const input = container.querySelector("input")!
    expect(input).toHaveClass("rounded-xl")
  })

  it("has focus ring classes", () => {
    const { container } = render(<Input />)
    const input = container.querySelector("input")!
    expect(input).toHaveClass("focus:ring-2")
    expect(input).toHaveClass("focus:ring-primary-container")
  })

  it("has h-14 class", () => {
    const { container } = render(<Input />)
    const input = container.querySelector("input")!
    expect(input).toHaveClass("h-14")
  })

  it("merges custom className", () => {
    const { container } = render(<Input className="custom-input" />)
    const input = container.querySelector("input")!
    expect(input).toHaveClass("custom-input")
  })

  it("forwards additional input props", () => {
    render(<Input type="email" data-testid="email-input" />)
    expect(screen.getByTestId("email-input")).toHaveAttribute("type", "email")
  })
})
