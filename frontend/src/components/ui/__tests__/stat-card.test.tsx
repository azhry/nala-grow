import { render, screen } from "@testing-library/react"
import { StatCard } from "../stat-card"

describe("StatCard", () => {
  it("renders label", () => {
    render(<StatCard icon="bedtime" label="Total Sleep" value="14.5h" />)
    expect(screen.getByText("Total Sleep")).toBeInTheDocument()
  })

  it("renders value", () => {
    render(<StatCard icon="bedtime" label="Total Sleep" value="14.5h" />)
    expect(screen.getByText("14.5h")).toBeInTheDocument()
  })

  it("renders icon", () => {
    render(<StatCard icon="bedtime" label="Sleep" value="8h" />)
    expect(screen.getByText("bedtime")).toBeInTheDocument()
  })

  it("renders primary color", () => {
    const { container } = render(<StatCard icon="bedtime" label="Sleep" value="8h" color="primary" />)
    expect(container.firstChild).toBeTruthy()
    expect(screen.getByText("Sleep")).toBeInTheDocument()
  })

  it("renders tertiary color", () => {
    render(<StatCard icon="timer" label="Stretch" value="4h" color="tertiary" />)
    expect(screen.getByText("Stretch")).toBeInTheDocument()
  })

  it("renders accent color", () => {
    render(<StatCard icon="favorite" label="Feeds" value="8" color="accent" />)
    expect(screen.getByText("Feeds")).toBeInTheDocument()
  })

  it("renders label in uppercase with label token classes", () => {
    render(<StatCard icon="bedtime" label="total sleep" value="8h" />)
    expect(screen.getByText("total sleep")).toHaveClass("uppercase")
    expect(screen.getByText("total sleep")).toHaveClass("font-label-md")
    expect(screen.getByText("total sleep")).toHaveClass("text-label-md")
  })

  it("renders value in headline-md class", () => {
    render(<StatCard icon="bedtime" label="Sleep" value="8h" />)
    expect(screen.getByText("8h")).toHaveClass("font-headline-md")
  })

  it("renders active variant with bg-primary", () => {
    const { container } = render(<StatCard icon="bedtime" label="Sleep" value="8h" active />)
    expect(container.firstChild).toHaveClass("bg-primary")
  })

  it("renders active label with label token classes", () => {
    const { container } = render(<StatCard icon="bedtime" label="Sleep" value="8h" active />)
    const label = container.querySelector(".uppercase")
    expect(label).toHaveClass("font-label-md")
    expect(label).toHaveClass("text-label-md")
  })

  it("renders active value with text-headline-md class", () => {
    render(<StatCard icon="bedtime" label="Sleep" value="8h" active />)
    expect(screen.getByText("8h")).toHaveClass("text-headline-md")
  })

  it("renders inactive variant with shadow and border", () => {
    const { container } = render(<StatCard icon="bedtime" label="Sleep" value="8h" active={false} />)
    expect(container.firstChild).toHaveClass("shadow-soft")
    expect(container.firstChild).toHaveClass("border-primary/5")
  })

  it("renders decorative icon in active state", () => {
    render(<StatCard icon="bedtime" label="Sleep" value="8h" active />)
    const icons = screen.getAllByText("bedtime")
    expect(icons.length).toBeGreaterThanOrEqual(1)
  })

  it("renders compact icon container with w-11", () => {
    const { container } = render(<StatCard icon="bedtime" label="Sleep" value="8h" />)
    const iconWrappers = container.querySelectorAll(".w-11")
    expect(iconWrappers.length).toBeGreaterThanOrEqual(1)
  })

  it("renders rounded-xl on the card", () => {
    const { container } = render(<StatCard icon="bedtime" label="Sleep" value="8h" />)
    expect(container.firstChild).toHaveClass("rounded-xl")
  })
})
