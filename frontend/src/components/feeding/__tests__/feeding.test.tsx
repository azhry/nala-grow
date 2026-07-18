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

  it("renders one bar per barData entry", () => {
    const { container } = render(
      <DailySummary bottleTotalMl={0} breastTotalMins={0} barData={barData} />,
    )
    const bars = container.querySelectorAll(".rounded-t-lg")
    expect(bars.length).toBe(barData.length)
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
})
