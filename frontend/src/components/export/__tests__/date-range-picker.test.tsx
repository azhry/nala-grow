import { render, screen } from "@testing-library/react"
import { DateRangePicker } from "@/components/export/date-range-picker"

it("stacks date inputs on narrow screens and allows both inputs to shrink", () => {
  const { container } = render(<DateRangePicker from="2026-01-01" to="2026-01-31" onFromChange={jest.fn()} onToChange={jest.fn()} />)
  expect(screen.getByLabelText("From")).toHaveClass("min-w-0")
  expect(screen.getByLabelText("To")).toHaveClass("min-w-0")
  expect(container.querySelector(".sm\\:flex-row")).toBeInTheDocument()
})
