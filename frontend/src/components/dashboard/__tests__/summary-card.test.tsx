import { render, screen } from "@testing-library/react"
import { SummaryCard } from "../summary-card"

describe("SummaryCard", () => {
  it("renders label and value", () => {
    render(<SummaryCard icon="restaurant" label="Last Feed" value="2.5 hours ago" />)
    expect(screen.getByText("Last Feed")).toBeInTheDocument()
    expect(screen.getByText("2.5 hours ago")).toBeInTheDocument()
  })

  it("renders icon", () => {
    const { container } = render(<SummaryCard icon="restaurant" label="Test" value="Value" />)
    const icon = container.querySelector(".material-symbols-outlined")
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveTextContent("restaurant")
  })

  it("renders badge when provided", () => {
    render(<SummaryCard icon="restaurant" label="Test" value="Value" badge="Green Status" />)
    expect(screen.getByText("Green Status")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(
      <SummaryCard icon="restaurant" label="Test" value="Value">
        <span>Child content</span>
      </SummaryCard>,
    )
    expect(screen.getByText("Child content")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(
      <SummaryCard icon="restaurant" label="Test" value="Value" className="custom-class" />,
    )
    expect(container.firstChild).toHaveClass("custom-class")
  })
})
