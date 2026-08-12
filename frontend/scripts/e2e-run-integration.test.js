const { buildPlaywrightArgs, defaultSpec, isSpecPath } = require("./e2e-run-integration")

describe("full-stack E2E runner arguments", () => {
  test("uses the generic frontend/backend proof when no spec is supplied", () => {
    expect(buildPlaywrightArgs([])).toEqual(["test", defaultSpec, "--project=desktop"])
  })

  test("keeps the generic default when only Playwright options are supplied", () => {
    expect(buildPlaywrightArgs(["--grep", "login"])).toEqual([
      "test",
      defaultSpec,
      "--project=desktop",
      "--grep",
      "login",
    ])
  })

  test("runs an explicitly supplied spec instead of the default", () => {
    expect(buildPlaywrightArgs(["e2e/auth-navigation.spec.ts"])).toEqual([
      "test",
      "--project=desktop",
      "e2e/auth-navigation.spec.ts",
    ])
  })

  test("forwards multiple explicitly supplied specs", () => {
    const specs = ["e2e/auth-navigation.spec.ts", "e2e/frontend-backend-integration.spec.ts"]
    expect(buildPlaywrightArgs(specs)).toEqual(["test", "--project=desktop", ...specs])
  })

  test.each([
    ["e2e/example.spec.ts", true],
    ["e2e/example.spec.tsx", true],
    ["--grep", false],
    ["login", false],
  ])("classifies %s as a spec path: %s", (argument, expected) => {
    expect(isSpecPath(argument)).toBe(expected)
  })
})
