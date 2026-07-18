import { render, screen, fireEvent } from "@testing-library/react"
import { BottleForm } from "../bottle-form"

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

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders the amount in ml", () => {
    render(<BottleForm {...baseProps} amountMl={150} />)
    expect(screen.getByText("150")).toBeInTheDocument()
  })

  it("renders all three milk types", () => {
    render(<BottleForm {...baseProps} />)
    expect(screen.getByText("Breast Milk")).toBeInTheDocument()
    expect(screen.getByText("Formula")).toBeInTheDocument()
    expect(screen.getByText("Water")).toBeInTheDocument()
  })

  it("renders the three temperatures", () => {
    render(<BottleForm {...baseProps} />)
    expect(screen.getByText("Cold")).toBeInTheDocument()
    expect(screen.getByText("Room")).toBeInTheDocument()
    expect(screen.getByText("Warm")).toBeInTheDocument()
  })

  it("decreases amount by 10ml via -10ml button", () => {
    render(<BottleForm {...baseProps} amountMl={120} />)
    fireEvent.click(screen.getByText("-10ml"))
    expect(baseProps.onAmountChange).toHaveBeenCalledWith(110)
  })

  it("increases amount by 10ml via +10ml button", () => {
    render(<BottleForm {...baseProps} amountMl={120} />)
    fireEvent.click(screen.getByText("+10ml"))
    expect(baseProps.onAmountChange).toHaveBeenCalledWith(130)
  })

  it("does not decrease below 0ml", () => {
    render(<BottleForm {...baseProps} amountMl={5} />)
    fireEvent.click(screen.getByText("-10ml"))
    expect(baseProps.onAmountChange).toHaveBeenCalledWith(0)
  })

  it("does not increase above 300ml", () => {
    render(<BottleForm {...baseProps} amountMl={295} />)
    fireEvent.click(screen.getByText("+10ml"))
    expect(baseProps.onAmountChange).toHaveBeenCalledWith(300)
  })

  it("updates amount from the range slider", () => {
    render(<BottleForm {...baseProps} />)
    const slider = screen.getByRole("slider") as HTMLInputElement
    fireEvent.change(slider, { target: { value: "200" } })
    expect(baseProps.onAmountChange).toHaveBeenCalledWith(200)
  })

  it("calls onMilkTypeChange when selecting formula", () => {
    render(<BottleForm {...baseProps} />)
    fireEvent.click(screen.getByText("Formula"))
    expect(baseProps.onMilkTypeChange).toHaveBeenCalledWith("formula")
  })

  it("calls onTemperatureChange when selecting warm", () => {
    render(<BottleForm {...baseProps} />)
    fireEvent.click(screen.getByText("Warm"))
    expect(baseProps.onTemperatureChange).toHaveBeenCalledWith("warm")
  })

  it("calls onNotesChange when typing in notes", () => {
    render(<BottleForm {...baseProps} />)
    const textarea = screen.getByPlaceholderText("How did it go?")
    fireEvent.change(textarea, { target: { value: "drank well" } })
    expect(baseProps.onNotesChange).toHaveBeenCalledWith("drank well")
  })
})
