import { render, screen, fireEvent } from "@testing-library/react"
import { SegmentedControl } from "../segmented-control"

const options = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
]

describe("SegmentedControl", () => {
  it("renders all options", () => {
    render(<SegmentedControl options={options} value="day" onChange={() => {}} />)
    expect(screen.getByText("Day")).toBeInTheDocument()
    expect(screen.getByText("Week")).toBeInTheDocument()
    expect(screen.getByText("Month")).toBeInTheDocument()
  })

  it("renders all options as buttons", () => {
    render(<SegmentedControl options={options} value="day" onChange={() => {}} />)
    const buttons = screen.getAllByRole("button")
    expect(buttons).toHaveLength(3)
  })

  it("marks selected option active", () => {
    render(<SegmentedControl options={options} value="week" onChange={() => {}} />)
    const weekButton = screen.getByText("Week")
    expect(weekButton).toHaveClass("bg-white")
    expect(weekButton).toHaveClass("shadow-sm")
  })

  it("does not mark non-selected options active", () => {
    render(<SegmentedControl options={options} value="day" onChange={() => {}} />)
    const weekButton = screen.getByText("Week")
    expect(weekButton).not.toHaveClass("bg-white")
  })

  it("calls onChange with correct value when clicked", () => {
    const handleChange = jest.fn()
    render(<SegmentedControl options={options} value="day" onChange={handleChange} />)
    fireEvent.click(screen.getByText("Week"))
    expect(handleChange).toHaveBeenCalledWith("week")
  })

  it("calls onChange with month value", () => {
    const handleChange = jest.fn()
    render(<SegmentedControl options={options} value="day" onChange={handleChange} />)
    fireEvent.click(screen.getByText("Month"))
    expect(handleChange).toHaveBeenCalledWith("month")
  })

  it("renders with single option", () => {
    const single = [{ value: "only", label: "Only" }]
    render(<SegmentedControl options={single} value="only" onChange={() => {}} />)
    expect(screen.getByText("Only")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(
      <SegmentedControl options={options} value="day" onChange={() => {}} className="my-control" />,
    )
    expect(container.firstChild).toHaveClass("my-control")
  })

  it("has rounded-xl container", () => {
    const { container } = render(
      <SegmentedControl options={options} value="day" onChange={() => {}} />,
    )
    expect(container.firstChild).toHaveClass("rounded-xl")
  })
})
