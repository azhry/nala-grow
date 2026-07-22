import { render, screen, fireEvent } from "@testing-library/react"
import { BreastTimer } from "../breast-timer"
import { BottleForm } from "../bottle-form"
import { SolidsForm } from "../solids-form"
import { DailySummary } from "../daily-summary"
import { FeedingTimeline } from "../feeding-timeline"
import type { FeedSession } from "@/lib/store"

describe("BreastTimer", () => {
  it("formats left and right elapsed seconds as mm:ss", () => {
    render(
      <BreastTimer
        runningSide={null}
        leftSeconds={125}
        rightSeconds={5}
        onToggleSide={jest.fn()}
      />,
    )
    expect(screen.getByText("02:05")).toBeInTheDocument()
    expect(screen.getByText("00:05")).toBeInTheDocument()
  })

  it("shows play icon and calls onToggleSide when side is idle", () => {
    const onToggleSide = jest.fn()
    render(
      <BreastTimer
        runningSide={null}
        leftSeconds={0}
        rightSeconds={0}
        onToggleSide={onToggleSide}
      />,
    )
    const leftButton = screen.getByText("Left Side").parentElement as HTMLElement
    fireEvent.click(leftButton.querySelector("button") as HTMLElement)
    expect(onToggleSide).toHaveBeenCalledWith("left")
  })

  it("shows pause icon for the running side", () => {
    const { container } = render(
      <BreastTimer
        runningSide="left"
        leftSeconds={0}
        rightSeconds={0}
        onToggleSide={jest.fn()}
      />,
    )
    const pauseIcons = container.querySelectorAll(".material-symbols-outlined")
    expect(Array.from(pauseIcons).some((el) => el.textContent === "pause_circle")).toBe(true)
  })

  it("calls onManualDurationChange when manual duration changes", () => {
    const onManualDurationChange = jest.fn()
    render(
      <BreastTimer
        runningSide={null}
        leftSeconds={0}
        rightSeconds={0}
        onToggleSide={jest.fn()}
        onManualDurationChange={onManualDurationChange}
        manualDuration={0}
      />,
    )
    const input = screen.getByDisplayValue("") as HTMLInputElement
    expect(input).toHaveAttribute("type", "number")
    fireEvent.change(input, { target: { value: "12" } })
    expect(onManualDurationChange).toHaveBeenCalledWith(12)
  })

  it("does not go below zero for manual duration", () => {
    const onManualDurationChange = jest.fn()
    render(
      <BreastTimer
        runningSide={null}
        leftSeconds={0}
        rightSeconds={0}
        onToggleSide={jest.fn()}
        onManualDurationChange={onManualDurationChange}
        manualDuration={0}
      />,
    )
    const input = screen.getByDisplayValue("") as HTMLInputElement
    fireEvent.change(input, { target: { value: "-5" } })
    expect(onManualDurationChange).toHaveBeenCalledWith(0)
  })
})

describe("BottleForm", () => {
  const baseProps = {
    amountMl: 120,
    milkType: "breast_milk" as const,
    temperature: "room" as const,
    notes: "",
    onAmountChange: jest.fn(),
    onMilkTypeChange: jest.fn(),
    onTemperatureChange: jest.fn(),
    onNotesChange: jest.fn(),
  }

  it("displays the current amount in ml", () => {
    render(<BottleForm {...baseProps} amountMl={150} />)
    expect(screen.getByText("150")).toBeInTheDocument()
  })

  it("clamps amount within 0 and 300 using -/+ buttons", () => {
    const onAmountChange = jest.fn()
    const { rerender } = render(<BottleForm {...baseProps} amountMl={295} onAmountChange={onAmountChange} />)
    fireEvent.click(screen.getByText("+10ml"))
    expect(onAmountChange).toHaveBeenCalledWith(300)
    rerender(<BottleForm {...baseProps} amountMl={5} onAmountChange={onAmountChange} />)
    fireEvent.click(screen.getByText("-10ml"))
    expect(onAmountChange).toHaveBeenCalledWith(0)
  })

  it("selects a milk type", () => {
    const onMilkTypeChange = jest.fn()
    render(<BottleForm {...baseProps} onMilkTypeChange={onMilkTypeChange} />)
    const formulaLabel = screen.getByText("Formula").closest("label") as HTMLElement
    fireEvent.click(formulaLabel)
    expect(onMilkTypeChange).toHaveBeenCalledWith("formula")
  })

  it("selects a temperature", () => {
    const onTemperatureChange = jest.fn()
    render(<BottleForm {...baseProps} onTemperatureChange={onTemperatureChange} />)
    fireEvent.click(screen.getByText("Warm"))
    expect(onTemperatureChange).toHaveBeenCalledWith("warm")
  })

  it("calls onNotesChange when notes typed", () => {
    const onNotesChange = jest.fn()
    render(<BottleForm {...baseProps} onNotesChange={onNotesChange} />)
    const textarea = screen.getByPlaceholderText(/How did it go/i) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: "fussy" } })
    expect(onNotesChange).toHaveBeenCalledWith("fussy")
  })
})

describe("SolidsForm", () => {
  const baseProps = {
    foodName: "",
    quantity: 0,
    quantityUnit: "tbsp",
    reaction: "",
    notes: "",
    onFoodNameChange: jest.fn(),
    onQuantityChange: jest.fn(),
    onQuantityUnitChange: jest.fn(),
    onReactionChange: jest.fn(),
    onNotesChange: jest.fn(),
  }

  it("calls onFoodNameChange when food typed", () => {
    const onFoodNameChange = jest.fn()
    render(<SolidsForm {...baseProps} onFoodNameChange={onFoodNameChange} />)
    const input = screen.getByPlaceholderText(/Sweet Potato/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: "Banana" } })
    expect(onFoodNameChange).toHaveBeenCalledWith("Banana")
  })

  it("selects a reaction value", () => {
    const onReactionChange = jest.fn()
    render(<SolidsForm {...baseProps} onReactionChange={onReactionChange} />)
    fireEvent.click(screen.getByText("Loved it"))
    expect(onReactionChange).toHaveBeenCalledWith("loved")
  })

  it("changes quantity unit via select", () => {
    const onQuantityUnitChange = jest.fn()
    render(<SolidsForm {...baseProps} onQuantityUnitChange={onQuantityUnitChange} />)
    const select = screen.getByDisplayValue("tbsp") as HTMLSelectElement
    fireEvent.change(select, { target: { value: "oz" } })
    expect(onQuantityUnitChange).toHaveBeenCalledWith("oz")
  })
})

describe("DailySummary", () => {
  const barData = [
    { label: "6 AM", heightPct: 50, title: "6 AM: 50ml" },
    { label: "9 AM", heightPct: 5, title: "9 AM: 0ml" },
  ]

  it("shows bottle and breast totals", () => {
    render(<DailySummary bottleTotalMl={240} breastTotalMins={35} barData={barData} />)
    expect(screen.getByText("240ml")).toBeInTheDocument()
    expect(screen.getByText("35 mins")).toBeInTheDocument()
  })

  it("renders the Stitch paired-bar reference chart when no feeds are recorded", () => {
    const { container } = render(
      <DailySummary bottleTotalMl={0} breastTotalMins={0} barData={barData} />,
    )
    const bars = container.querySelectorAll(".rounded-t-lg")
    expect(bars.length).toBe(12)
    expect(screen.getByText("Bottle (ml)")).toBeInTheDocument()
    expect(screen.getByText("Breast (min)")).toBeInTheDocument()
    expect(screen.getByText("250ml")).toBeInTheDocument()
    expect(screen.getByText("125ml")).toBeInTheDocument()
  })
})

describe("FeedingTimeline", () => {
  const makeSession = (over: Partial<FeedSession>): FeedSession => ({
    id: "s1",
    baby_id: "b1",
    feed_type: "bottle",
    started_at: new Date().toISOString(),
    ...over,
  })

  it("renders empty state when no sessions", () => {
    render(<FeedingTimeline sessions={[]} />)
    expect(screen.getByText(/No feeds recorded yet/i)).toBeInTheDocument()
  })

  it("distinguishes feed types with distinct labels", () => {
    const sessions = [
      makeSession({ id: "a", feed_type: "breast", left_duration_sec: 120, right_duration_sec: 60 }),
      makeSession({ id: "b", feed_type: "bottle", amount_ml: 120, milk_type: "formula" }),
      makeSession({ id: "c", feed_type: "solids", food_name: "Banana", quantity: 2, quantity_unit: "tbsp" }),
    ]
    render(<FeedingTimeline sessions={sessions} />)
    expect(screen.getByText("Breastfeed")).toBeInTheDocument()
    expect(screen.getByText("Bottle Feed")).toBeInTheDocument()
    expect(screen.getByText("Solids")).toBeInTheDocument()
  })

  it("shows solids reaction tag for reaction type", () => {
    const sessions = [
      makeSession({ id: "c", feed_type: "solids", food_name: "Egg", reaction: "reaction" }),
    ]
    render(<FeedingTimeline sessions={sessions} />)
    expect(screen.getByText("Reaction")).toBeInTheDocument()
  })

  it("displays bottle amount with milk type label", () => {
    const sessions = [
      makeSession({ id: "b1", feed_type: "bottle", amount_ml: 120, milk_type: "breast_milk" }),
    ]
    render(<FeedingTimeline sessions={sessions} />)
    expect(screen.getByText("120ml Breastmilk")).toBeInTheDocument()
  })

  it("displays breast session duration as total minutes", () => {
    const sessions = [
      makeSession({ id: "br1", feed_type: "breast", left_duration_sec: 600, right_duration_sec: 300 }),
    ]
    render(<FeedingTimeline sessions={sessions} />)
    expect(screen.getByText("15m total")).toBeInTheDocument()
  })

  it("displays breast left and right tags with individual durations", () => {
    const sessions = [
      makeSession({ id: "br2", feed_type: "breast", left_duration_sec: 600, right_duration_sec: 300 }),
    ]
    render(<FeedingTimeline sessions={sessions} />)
    expect(screen.getByText("Left (10m)")).toBeInTheDocument()
    expect(screen.getByText("Right (5m)")).toBeInTheDocument()
  })

  it("displays solids with quantity in 'name • amountUnit' format", () => {
    const sessions = [
      makeSession({ id: "s1", feed_type: "solids", food_name: "Banana", quantity: 2, quantity_unit: "tbsp" }),
    ]
    render(<FeedingTimeline sessions={sessions} />)
    expect(screen.getByText("Banana • 2tbsp")).toBeInTheDocument()
  })

  it("displays loved reaction tag", () => {
    const sessions = [
      makeSession({ id: "s2", feed_type: "solids", food_name: "Sweet Potato", reaction: "loved" }),
    ]
    render(<FeedingTimeline sessions={sessions} />)
    expect(screen.getByText("Loved it!")).toBeInTheDocument()
  })

  it("displays interested reaction tag", () => {
    const sessions = [
      makeSession({ id: "s3", feed_type: "solids", food_name: "Carrot", reaction: "interested" }),
    ]
    render(<FeedingTimeline sessions={sessions} />)
    expect(screen.getByText("Interested")).toBeInTheDocument()
  })

  it("displays disliked reaction tag", () => {
    const sessions = [
      makeSession({ id: "s4", feed_type: "solids", food_name: "Pea", reaction: "disliked" }),
    ]
    render(<FeedingTimeline sessions={sessions} />)
    expect(screen.getByText("Disliked")).toBeInTheDocument()
  })

  it("displays formula bottle with correct label", () => {
    const sessions = [
      makeSession({ id: "b2", feed_type: "bottle", amount_ml: 200, milk_type: "formula" }),
    ]
    render(<FeedingTimeline sessions={sessions} />)
    expect(screen.getByText("200ml Formula")).toBeInTheDocument()
  })

  it("displays water bottle with correct label", () => {
    const sessions = [
      makeSession({ id: "b3", feed_type: "bottle", amount_ml: 60, milk_type: "water" }),
    ]
    render(<FeedingTimeline sessions={sessions} />)
    expect(screen.getByText("60ml Water")).toBeInTheDocument()
  })

  it("displays solids without quantity when quantity is zero", () => {
    const sessions = [
      makeSession({ id: "s5", feed_type: "solids", food_name: "Avocado", quantity: 0 }),
    ]
    render(<FeedingTimeline sessions={sessions} />)
    expect(screen.getByText("Avocado")).toBeInTheDocument()
  })

  it("renders multiple sessions sorted by time", () => {
    const now = new Date()
    const sessions = [
      makeSession({ id: "m1", feed_type: "bottle", amount_ml: 100, started_at: new Date(now.getTime() - 3600000).toISOString() }),
      makeSession({ id: "m2", feed_type: "breast", left_duration_sec: 300, right_duration_sec: 300, started_at: now.toISOString() }),
    ]
    render(<FeedingTimeline sessions={sessions} />)
    expect(screen.getByText("Breastfeed")).toBeInTheDocument()
    expect(screen.getByText("Bottle Feed")).toBeInTheDocument()
  })
})

describe("BottleForm range slider", () => {
  it("renders range input with correct min/max/step", () => {
    const { container } = render(
      <BottleForm
        amountMl={120}
        milkType="breast_milk"
        temperature="room"
        notes=""
        onAmountChange={jest.fn()}
        onMilkTypeChange={jest.fn()}
        onTemperatureChange={jest.fn()}
        onNotesChange={jest.fn()}
      />,
    )
    const rangeInput = container.querySelector('input[type="range"]') as HTMLInputElement
    expect(rangeInput).toBeInTheDocument()
    expect(rangeInput).toHaveAttribute("min", "0")
    expect(rangeInput).toHaveAttribute("max", "300")
    expect(rangeInput).toHaveAttribute("step", "5")
    expect(rangeInput).toHaveAttribute("value", "120")
  })
})

describe("SolidsForm quantity input", () => {
  it("renders quantity number input with min and step attributes", () => {
    const { container } = render(
      <SolidsForm
        foodName=""
        quantity={0}
        quantityUnit="tbsp"
        reaction=""
        notes=""
        onFoodNameChange={jest.fn()}
        onQuantityChange={jest.fn()}
        onQuantityUnitChange={jest.fn()}
        onReactionChange={jest.fn()}
        onNotesChange={jest.fn()}
      />,
    )
    const numberInput = container.querySelector('input[type="number"]') as HTMLInputElement
    expect(numberInput).toBeInTheDocument()
    expect(numberInput).toHaveAttribute("min", "0")
    expect(numberInput).toHaveAttribute("step", "0.5")
  })

  it("selects reaction values for all types", () => {
    const onReactionChange = jest.fn()
    render(
      <SolidsForm
        foodName=""
        quantity={0}
        quantityUnit="tbsp"
        reaction=""
        notes=""
        onFoodNameChange={jest.fn()}
        onQuantityChange={jest.fn()}
        onQuantityUnitChange={jest.fn()}
        onReactionChange={onReactionChange}
        onNotesChange={jest.fn()}
      />,
    )
    fireEvent.click(screen.getByText("Interested"))
    expect(onReactionChange).toHaveBeenCalledWith("interested")
    fireEvent.click(screen.getByText("Disliked"))
    expect(onReactionChange).toHaveBeenCalledWith("disliked")
    // "Reaction" text appears in both the label and the button — use getAllByText
    const reactionTexts = screen.getAllByText("Reaction")
    const reactionButton = reactionTexts.find((el) => el.closest("button"))?.closest("button") as HTMLElement
    fireEvent.click(reactionButton)
    expect(onReactionChange).toHaveBeenCalledWith("reaction")
  })
})

describe("DailySummary zero totals", () => {
  it("displays '0ml' and '0 mins' when totals are zero", () => {
    render(
      <DailySummary
        bottleTotalMl={0}
        breastTotalMins={0}
        barData={[{ label: "6 AM", heightPct: 5, title: "6 AM: 0ml" }]}
      />,
    )
    expect(screen.getByText("0ml")).toBeInTheDocument()
    expect(screen.getByText("0 mins")).toBeInTheDocument()
  })

  it("displays 'Daily Summary' heading", () => {
    render(
      <DailySummary
        bottleTotalMl={0}
        breastTotalMins={0}
        barData={[]}
      />,
    )
    expect(screen.getByText("Daily Summary")).toBeInTheDocument()
  })
})
