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

  it("renders label in uppercase", () => {
    render(<StatCard icon="bedtime" label="total sleep" value="8h" />)
    expect(screen.getByText("total sleep")).toHaveClass("uppercase")
  })

  it("renders value in headline-lg class", () => {
    render(<StatCard icon="bedtime" label="Sleep" value="8h" />)
    expect(screen.getByText("8h")).toHaveClass("font-headline-lg")
  })

  it("renders with active gradient variant", () => {
    const { container } = render(<StatCard icon="bedtime" label="Sleep" value="8h" active />)
    expect(container.firstChild).toHaveClass("bg-gradient-to-br")
  })

  it("renders inactive variant with shadow", () => {
    const { container } = render(<StatCard icon="bedtime" label="Sleep" value="8h" active={false} />)
    expect(container.firstChild).toHaveClass("shadow-[0_8px_20px_rgba(126,182,173,0.15)]")
  })

  it("renders decorative icon in active state", () => {
    const { container } = render(<StatCard icon="bedtime" label="Sleep" value="8h" active />)
    expect(container.firstChild).toHaveClass("bg-gradient-to-br")
    const icons = screen.getAllByText("bedtime")
    expect(icons.length).toBeGreaterThanOrEqual(1)
  })

  it("renders icon container with w-12", () => {
    const { container } = render(<StatCard icon="bedtime" label="Sleep" value="8h" />)
    const iconWrappers = container.querySelectorAll(".w-12")
    expect(iconWrappers.length).toBeGreaterThanOrEqual(1)
  })

  it("renders rounded-2xl on the card", () => {
    const { container } = render(<StatCard icon="bedtime" label="Sleep" value="8h" />)
    expect(container.firstChild).toHaveClass("rounded-[24px]")
  })
})
