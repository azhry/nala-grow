import { fileToDataUrl } from "../photo-utils"

describe("photo utils", () => {
  it("converts a File to a data URL", async () => {
    const file = new File(["hello"], "test.txt", { type: "text/plain" })
    const result = await fileToDataUrl(file)
    expect(result).toMatch(/^data:text\/plain;base64,/)
  })
})
