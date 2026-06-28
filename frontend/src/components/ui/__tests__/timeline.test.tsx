import { render, screen } from "@testing-library/react"
import { Timeline } from "../timeline"

const sampleEntries = [
  {
    id: "1",
    title: "Morning Bottle",
    timestamp: "Today, 7:30 AM",
    duration: "180ml",
    color: "accent" as const,
    icon: "restaurant" as const,
    tags: [{ label: "Breast Milk", color: "primary" as const }],
  },
  {
    id: "2",
    title: "Midday Nap",
    timestamp: "Today, 10:15 AM",
    duration: "1h 20m",
    color: "primary" as const,
    icon: "bedtime" as const,
    active: true,
  },
  {
    id: "3",
    title: "Solids: Avocado",
    timestamp: "Today, 12:00 PM",
    duration: "45g",
    color: "tertiary" as const,
    icon: "nutrition" as const,
    tags: [{ label: "Loved it", color: "tertiary" as const }],
  },
]

describe("Timeline", () => {
  it("renders all entry titles", () => {
    render(<Timeline entries={sampleEntries} />)
    expect(screen.getByText("Morning Bottle")).toBeInTheDocument()
    expect(screen.getByText("Midday Nap")).toBeInTheDocument()
    expect(screen.getByText("Solids: Avocado")).toBeInTheDocument()
  })

  it("renders timestamps", () => {
    render(<Timeline entries={sampleEntries} />)
    expect(screen.getByText("Today, 7:30 AM")).toBeInTheDocument()
    expect(screen.getByText("Today, 10:15 AM")).toBeInTheDocument()
  })

  it("renders durations", () => {
    render(<Timeline entries={sampleEntries} />)
    expect(screen.getByText("180ml")).toBeInTheDocument()
    expect(screen.getByText("1h 20m")).toBeInTheDocument()
  })

  it("renders entry icons", () => {
    render(<Timeline entries={sampleEntries} />)
    expect(screen.getByText("restaurant")).toBeInTheDocument()
    expect(screen.getByText("bedtime")).toBeInTheDocument()
  })

  it("renders tags", () => {
    render(<Timeline entries={sampleEntries} />)
    expect(screen.getByText("Breast Milk")).toBeInTheDocument()
    expect(screen.getByText("Loved it")).toBeInTheDocument()
  })

  it("renders card containers with rounded-2xl", () => {
    const { container } = render(<Timeline entries={sampleEntries} />)
    const cards = container.querySelectorAll(".rounded-2xl")
    expect(cards).toHaveLength(3)
  })

  it("highlights active entry", () => {
    const { container } = render(<Timeline entries={sampleEntries} />)
    const activeDot = container.querySelector(".animate-pulse")
    expect(activeDot).toBeInTheDocument()
  })

  it("renders connecting lines between entries", () => {
    const { container } = render(<Timeline entries={sampleEntries} />)
    const lines = container.querySelectorAll(".absolute")
    expect(lines.length).toBeGreaterThanOrEqual(1)
  })

  it("renders nothing for empty entries", () => {
    const { container } = render(<Timeline entries={[]} />)
    const cards = container.querySelectorAll(".rounded-2xl")
    expect(cards.length).toBe(0)
  })

  it("renders custom className", () => {
    const { container } = render(<Timeline entries={sampleEntries} className="my-timeline" />)
    expect(container.firstChild).toHaveClass("my-timeline")
  })

  it("renders active pulse badge on active entry", () => {
    render(<Timeline entries={sampleEntries} />)
    const pulse = document.querySelector(".animate-pulse")
    expect(pulse).toBeInTheDocument()
  })

  it("renders color-coded w-6 h-6 dots with icons inside", () => {
    const { container } = render(<Timeline entries={sampleEntries} />)
    const dots = container.querySelectorAll(".w-6.h-6.rounded-full")
    expect(dots).toHaveLength(3)
  })

  it("renders ring-4 ring-white on dots", () => {
    const { container } = render(<Timeline entries={sampleEntries} />)
    const rings = container.querySelectorAll(".ring-4")
    expect(rings).toHaveLength(3)
  })
})
