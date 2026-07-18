import { render, screen } from "@testing-library/react"
import { FeedingTimeline } from "../feeding-timeline"
import type { FeedSession } from "@/lib/store"

function makeSession(overrides: Partial<FeedSession>): FeedSession {
  return {
    id: "s1",
    baby_id: "b1",
    feed_type: "bottle",
    started_at: new Date().toISOString(),
    ...overrides,
  }
}

describe("FeedingTimeline", () => {
  it("renders empty state when there are no sessions", () => {
    render(<FeedingTimeline sessions={[]} />)
    expect(screen.getByText("No feeds recorded yet today.")).toBeInTheDocument()
  })

  it("renders the heading", () => {
    render(<FeedingTimeline sessions={[makeSession({ id: "h" })]} />)
    expect(screen.getByText("Timeline (Last 24h)")).toBeInTheDocument()
  })

  it("renders a bottle feed with amount and milk type", () => {
    const sessions = [
      makeSession({ id: "b", feed_type: "bottle", amount_ml: 120, milk_type: "formula" }),
    ]
    render(<FeedingTimeline sessions={sessions} />)
    expect(screen.getByText("Bottle Feed")).toBeInTheDocument()
    expect(screen.getByText("120ml Formula")).toBeInTheDocument()
  })

  it("renders a breastfeed with total duration", () => {
    const sessions = [
      makeSession({
        id: "br",
        feed_type: "breast",
        left_duration_sec: 120,
        right_duration_sec: 60,
      }),
    ]
    render(<FeedingTimeline sessions={sessions} />)
    expect(screen.getByText("Breastfeed")).toBeInTheDocument()
    expect(screen.getByText("3m total")).toBeInTheDocument()
    expect(screen.getByText("Left (2m)")).toBeInTheDocument()
    expect(screen.getByText("Right (1m)")).toBeInTheDocument()
  })

  it("renders a solids feed with food name, quantity and reaction", () => {
    const sessions = [
      makeSession({
        id: "so",
        feed_type: "solids",
        food_name: "Banana",
        quantity: 2,
        quantity_unit: "tbsp",
        reaction: "loved",
      }),
    ]
    render(<FeedingTimeline sessions={sessions} />)
    expect(screen.getByText("Solids")).toBeInTheDocument()
    expect(screen.getByText("Banana • 2tbsp")).toBeInTheDocument()
    expect(screen.getByText("Loved it!")).toBeInTheDocument()
  })

  it("renders a reaction warning tag for adverse reactions", () => {
    const sessions = [
      makeSession({ id: "rx", feed_type: "solids", food_name: "Egg", reaction: "reaction" }),
    ]
    render(<FeedingTimeline sessions={sessions} />)
    expect(screen.getByText("Reaction")).toBeInTheDocument()
  })

  it("renders one entry per session", () => {
    const sessions = [
      makeSession({ id: "a", feed_type: "bottle", amount_ml: 100, milk_type: "breast_milk" }),
      makeSession({ id: "b", feed_type: "solids", food_name: "Rice" }),
    ]
    const { container } = render(<FeedingTimeline sessions={sessions} />)
    const cards = container.querySelectorAll(".bg-surface-container-low.rounded-2xl")
    expect(cards.length).toBe(2)
  })
})
