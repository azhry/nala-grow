import { render, screen } from "@testing-library/react"
import { AuthGuard } from "../auth-guard"

describe("AuthGuard", () => {
  it("renders children without auth checks", () => {
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    )
    expect(screen.getByText("Protected Content")).toBeInTheDocument()
  })
})
