import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { QuickLogOverlay } from "../quick-log-overlay"

jest.mock("@/components/ui", () => ({
  BottomSheet: ({
    open,
    onClose,
    children,
  }: {
    open: boolean
    onClose: () => void
    children: ReactNode
  }) => {
    if (!open) return null
    return (
      <div data-testid="bottom-sheet" role="dialog">
        <button onClick={onClose}>Backdrop</button>
        <div>{children}</div>
      </div>
    )
  },
}))

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock("@/components/providers/quick-log-provider", () => {
  const openLog = jest.fn()
  const closeLog = jest.fn()
  return {
    useQuickLog: () => ({ open: true, openLog, closeLog }),
    QuickLogProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  }
})

describe("QuickLogOverlay", () => {
  it("renders all quick log actions when open", () => {
    render(<QuickLogOverlay />)

    expect(screen.getByRole("link", { name: /Breastfeed/ })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Bottle Feed/ })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Solids/ })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Sleep/ })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Growth/ })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Diaper/ })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /New Milestone/ })).toBeInTheDocument()
  })

  it("navigates to the correct routes for each action", () => {
    render(<QuickLogOverlay />)

    expect(screen.getByRole("link", { name: /Breastfeed/ })).toHaveAttribute(
      "href",
      "/feeding",
    )
    expect(screen.getByRole("link", { name: /Bottle Feed/ })).toHaveAttribute(
      "href",
      "/feeding",
    )
    expect(screen.getByRole("link", { name: /Solids/ })).toHaveAttribute("href", "/feeding")
    expect(screen.getByRole("link", { name: /Sleep/ })).toHaveAttribute("href", "/sleep")
    expect(screen.getByRole("link", { name: /Growth/ })).toHaveAttribute("href", "/growth")
    expect(screen.getByRole("link", { name: /Diaper/ })).toHaveAttribute("href", "/feeding")
    expect(screen.getByRole("link", { name: /New Milestone/ })).toHaveAttribute(
      "href",
      "/milestones",
    )
  })

  it("has a cancel button that returns to dashboard", async () => {
    const user = userEvent.setup()
    render(<QuickLogOverlay />)

    const cancelButton = screen.getByRole("button", { name: /Cancel and return to dashboard/ })
    expect(cancelButton).toBeInTheDocument()

    await user.click(cancelButton)
  })
})
