import { render, screen, fireEvent } from "@testing-library/react"
import { SolidsForm } from "../solids-form"

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

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders the food name input", () => {
    render(<SolidsForm {...baseProps} />)
    expect(screen.getByPlaceholderText("e.g. Sweet Potato")).toBeInTheDocument()
  })

  it("renders all four reaction options", () => {
    render(<SolidsForm {...baseProps} />)
    expect(screen.getByText("Loved it")).toBeInTheDocument()
    expect(screen.getByText("Interested")).toBeInTheDocument()
    expect(screen.getByText("Disliked")).toBeInTheDocument()
    const reactionButtons = screen.getAllByText("Reaction")
    expect(reactionButtons.length).toBeGreaterThanOrEqual(1)
  })

  it("calls onFoodNameChange when typing", () => {
    render(<SolidsForm {...baseProps} />)
    fireEvent.change(screen.getByPlaceholderText("e.g. Sweet Potato"), {
      target: { value: "Banana" },
    })
    expect(baseProps.onFoodNameChange).toHaveBeenCalledWith("Banana")
  })

  it("calls onReactionChange when selecting a reaction", () => {
    render(<SolidsForm {...baseProps} />)
    fireEvent.click(screen.getByText("Loved it"))
    expect(baseProps.onReactionChange).toHaveBeenCalledWith("loved")
  })

  it("calls onQuantityChange and clamps negatives", () => {
    render(<SolidsForm {...baseProps} />)
    const quantity = screen.getByPlaceholderText("0") as HTMLInputElement
    fireEvent.change(quantity, { target: { value: "-2" } })
    expect(baseProps.onQuantityChange).toHaveBeenCalledWith(0)
  })

  it("calls onQuantityUnitChange when changing unit", () => {
    render(<SolidsForm {...baseProps} />)
    const select = screen.getByDisplayValue("tbsp") as HTMLSelectElement
    fireEvent.change(select, { target: { value: "oz" } })
    expect(baseProps.onQuantityUnitChange).toHaveBeenCalledWith("oz")
  })

  it("calls onNotesChange when typing in notes", () => {
    render(<SolidsForm {...baseProps} />)
    const textarea = screen.getByPlaceholderText("Any new flavors?")
    fireEvent.change(textarea, { target: { value: "new food" } })
    expect(baseProps.onNotesChange).toHaveBeenCalledWith("new food")
  })
})
