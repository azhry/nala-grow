import { act, render, screen } from "@testing-library/react"
import { ExportSuccess } from "../export-success"

jest.useFakeTimers()

describe("ExportSuccess", () => {
  afterEach(() => {
    jest.clearAllTimers()
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  it("renders after transitioning from closed to open and completes progress", () => {
    const onClose = jest.fn()
    const { container, rerender } = render(
      <ExportSuccess
        open={false}
        title="Export complete"
        message="Your CSV has been generated successfully."
        onClose={onClose}
      />,
    )

    expect(container.firstChild).toBeNull()

    rerender(
      <ExportSuccess
        open
        title="Export complete"
        message="Your CSV has been generated successfully."
        onClose={onClose}
      />,
    )

    expect(screen.getByText("Export complete")).toBeInTheDocument()
    expect(screen.getByText("Your CSV has been generated successfully.")).toBeInTheDocument()
    expect(container.querySelector(".h-full")).toHaveStyle("width: 0%")
    expect(onClose).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(750)
    })

    expect(container.querySelector(".h-full")).toHaveStyle("width: 100%")
    expect(onClose).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
