import { render, screen } from "@testing-library/react"
import { TimelineWidget } from "../timeline-widget"
import type { TimelineEntry } from "@/components/ui"

const mockEntries: TimelineEntry[] = [
  { id: "1", title: "Breastfeed", timestamp: "10:30 AM", duration: "15 mins", color: "primary", icon: "restaurant" },
  { id: "2", title: "Nap", timestamp: "8:15 AM", duration: "1h 15m", color: "tertiary", icon: "bedtime" },
]

describe("TimelineWidget", () => {
  it("renders title", () => {
    render(<TimelineWidget entries={mockEntries} />)
    expect(screen.getByText("Recent Activities")).toBeInTheDocument()
  })

  it("renders custom title", () => {
    render(<TimelineWidget entries={mockEntries} title="Today's Timeline" />)
    expect(screen.getByText("Today's Timeline")).toBeInTheDocument()
  })

  it("renders timeline entries", () => {
    render(<TimelineWidget entries={mockEntries} />)
    expect(screen.getByText("Breastfeed")).toBeInTheDocument()
    expect(screen.getByText("Nap")).toBeInTheDocument()
  })

  it("renders View All button when onViewAll provided", () => {
    render(<TimelineWidget entries={mockEntries} onViewAll={() => {}} />)
    expect(screen.getByText("View All")).toBeInTheDocument()
  })

  it("does not render View All button when onViewAll not provided", () => {
    render(<TimelineWidget entries={mockEntries} />)
    expect(screen.queryByText("View All")).not.toBeInTheDocument()
  })
})
