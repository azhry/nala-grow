import { render, screen } from "@testing-library/react"
import { DailySummary } from "../daily-summary"

describe("DailySummary", () => {
  const barData = [
    { label: "6 AM", heightPct: 50, title: "6 AM: 100ml" },
    { label: "9 AM", heightPct: 20, title: "9 AM: 40ml" },
  ]

  it("renders the Daily Summary heading", () => {
    render(<DailySummary bottleTotalMl={0} breastTotalMins={0} barData={barData} />)
    expect(screen.getByText("Daily Summary")).toBeInTheDocument()
  })

  it("renders the bottle total in ml", () => {
    render(<DailySummary bottleTotalMl={240} breastTotalMins={0} barData={barData} />)
    expect(screen.getByText("240ml")).toBeInTheDocument()
  })

  it("renders the breast total in mins", () => {
    render(<DailySummary bottleTotalMl={0} breastTotalMins={35} barData={barData} />)
    expect(screen.getByText("35 mins")).toBeInTheDocument()
  })

  it("renders a bar per barData entry with its title", () => {
    const { container } = render(
      <DailySummary bottleTotalMl={0} breastTotalMins={0} barData={barData} />,
    )
    const bars = container.querySelectorAll(".bg-primary-container\\/20")
    expect(bars.length).toBe(2)
    expect(screen.getByTitle("6 AM: 100ml")).toBeInTheDocument()
    expect(screen.getByTitle("9 AM: 40ml")).toBeInTheDocument()
  })
})
