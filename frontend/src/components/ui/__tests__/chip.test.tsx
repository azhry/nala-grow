import { render, screen } from "@testing-library/react"
import { Chip } from "../chip"

describe("Chip", () => {
  it("renders children text", () => {
    render(<Chip>Label</Chip>)
    expect(screen.getByText("Label")).toBeInTheDocument()
  })

  it("renders primary color", () => {
    const { container } = render(<Chip color="primary">Primary</Chip>)
    expect(container.firstChild).toHaveClass("bg-primary-container/20")
  })

  it("renders secondary color", () => {
    const { container } = render(<Chip color="secondary">Secondary</Chip>)
    expect(container.firstChild).toHaveClass("bg-secondary-container/40")
  })

  it("renders tertiary color", () => {
    const { container } = render(<Chip color="tertiary">Tertiary</Chip>)
    expect(container.firstChild).toHaveClass("bg-tertiary-container/30")
  })

  it("renders error color", () => {
    const { container } = render(<Chip color="error">Error</Chip>)
    expect(container.firstChild).toHaveClass("bg-error-container")
  })

  it("renders accent color", () => {
    const { container } = render(<Chip color="accent">Accent</Chip>)
    expect(container.firstChild).toHaveClass("bg-[#FF8A7A]/15")
  })

  it("renders neutral color (default)", () => {
    const { container } = render(<Chip>Neutral</Chip>)
    expect(container.firstChild).toHaveClass("bg-surface-container-high")
  })

  it("renders icon when provided", () => {
    render(<Chip icon="check">Verified</Chip>)
    expect(screen.getByText("check")).toBeInTheDocument()
  })

  it("does not render icon when not provided", () => {
    const { container } = render(<Chip>No Icon</Chip>)
    expect(container.querySelector(".material-symbols-outlined")).not.toBeInTheDocument()
  })

  it("has rounded-full class", () => {
    const { container } = render(<Chip>Rounded</Chip>)
    expect(container.firstChild).toHaveClass("rounded-full")
  })

  it("has font-label-md class", () => {
    const { container } = render(<Chip>Font</Chip>)
    expect(container.firstChild).toHaveClass("font-label-md")
  })

  it("merges custom className", () => {
    const { container } = render(<Chip className="custom-chip">Custom</Chip>)
    expect(container.firstChild).toHaveClass("custom-chip")
  })
})
