import { render, screen } from "@testing-library/react"
import { Avatar } from "../avatar"

describe("Avatar", () => {
  it("renders with default person icon when no src or fallback", () => {
    render(<Avatar />)
    expect(screen.getByText("person")).toBeInTheDocument()
  })

  it("renders fallback initials", () => {
    render(<Avatar fallback="N" />)
    expect(screen.getByText("N")).toBeInTheDocument()
  })

  it("renders image when src provided", () => {
    render(<Avatar src="/photo.jpg" alt="Baby" />)
    const img = screen.getByAltText("Baby")
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute("src", "/photo.jpg")
  })

  it("renders sm size", () => {
    const { container } = render(<Avatar size="sm" />)
    expect(container.firstChild).toHaveClass("w-8")
    expect(container.firstChild).toHaveClass("h-8")
  })

  it("renders md size (default)", () => {
    const { container } = render(<Avatar />)
    expect(container.firstChild).toHaveClass("w-10")
    expect(container.firstChild).toHaveClass("h-10")
  })

  it("renders lg size", () => {
    const { container } = render(<Avatar size="lg" />)
    expect(container.firstChild).toHaveClass("w-12")
    expect(container.firstChild).toHaveClass("h-12")
  })

  it("renders xl size", () => {
    const { container } = render(<Avatar size="xl" />)
    expect(container.firstChild).toHaveClass("w-16")
    expect(container.firstChild).toHaveClass("h-16")
  })

  it("renders xxl size", () => {
    const { container } = render(<Avatar size="xxl" />)
    expect(container.firstChild).toHaveClass("w-32")
    expect(container.firstChild).toHaveClass("h-32")
  })

  it("has rounded-full class", () => {
    const { container } = render(<Avatar />)
    expect(container.firstChild).toHaveClass("rounded-full")
  })

  it("has border styling", () => {
    const { container } = render(<Avatar />)
    expect(container.firstChild).toHaveClass("border-2")
    expect(container.firstChild).toHaveClass("border-primary-container")
  })

  it("prefers fallback over default icon", () => {
    render(<Avatar fallback="A" />)
    expect(screen.getByText("A")).toBeInTheDocument()
    expect(screen.queryByText("person")).not.toBeInTheDocument()
  })

  it("prefers image over fallback", () => {
    render(<Avatar src="/photo.jpg" fallback="N" alt="Photo" />)
    expect(screen.getByAltText("Photo")).toBeInTheDocument()
    expect(screen.queryByText("N")).not.toBeInTheDocument()
  })

  it("merges custom className", () => {
    const { container } = render(<Avatar className="custom-avatar" />)
    expect(container.firstChild).toHaveClass("custom-avatar")
  })
})
