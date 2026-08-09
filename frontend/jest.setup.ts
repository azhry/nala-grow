import "@testing-library/jest-dom"

jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  usePathname() {
    return "/"
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))
