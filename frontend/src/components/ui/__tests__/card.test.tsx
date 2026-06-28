import { render, screen } from "@testing-library/react"
import { Card } from "../card"

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Hello</Card>)
    expect(screen.getByText("Hello")).toBeInTheDocument()
  })

  it("renders elevated variant with shadow class", () => {
    const { container } = render(<Card variant="elevated">Elevated</Card>)
    expect(container.firstChild).toHaveClass("shadow-[0_8px_20px_rgba(126,182,173,0.15)]")
  })

  it("renders outlined variant", () => {
    const { container } = render(<Card variant="outlined">Outlined</Card>)
    expect(container.firstChild).toHaveClass("border")
    expect(container.firstChild).toHaveClass("border-outline-variant")
  })

  it("renders filled variant", () => {
    const { container } = render(<Card variant="filled">Filled</Card>)
    expect(container.firstChild).toHaveClass("bg-surface-container")
  })

  it("has rounded-2xl by default", () => {
    const { container } = render(<Card>Rounded</Card>)
    expect(container.firstChild).toHaveClass("rounded-[24px]")
  })

  it("renders with no padding", () => {
    const { container } = render(<Card padding="none">No Pad</Card>)
    expect(container.firstChild).not.toHaveClass("p-4")
    expect(container.firstChild).not.toHaveClass("p-5")
    expect(container.firstChild).not.toHaveClass("p-6")
  })

  it("renders with sm padding", () => {
    const { container } = render(<Card padding="sm">SM</Card>)
    expect(container.firstChild).toHaveClass("p-4")
  })

  it("renders with md padding", () => {
    const { container } = render(<Card padding="md">MD</Card>)
    expect(container.firstChild).toHaveClass("p-5")
  })

  it("renders with lg padding (default)", () => {
    const { container } = render(<Card>LG</Card>)
    expect(container.firstChild).toHaveClass("p-6")
  })

  it("merges custom className", () => {
    const { container } = render(<Card className="my-card">Custom</Card>)
    expect(container.firstChild).toHaveClass("my-card")
  })

  it("renders complex children", () => {
    render(
      <Card>
        <h3>Title</h3>
        <p>Content</p>
      </Card>,
    )
    expect(screen.getByText("Title")).toBeInTheDocument()
    expect(screen.getByText("Content")).toBeInTheDocument()
  })
})
