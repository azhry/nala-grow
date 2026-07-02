import { calculateAge, formatDate } from "../age"

describe("age utilities", () => {
  describe("calculateAge", () => {
    it("returns empty string for invalid date", () => {
      expect(calculateAge("invalid")).toBe("")
    })

    it("calculates weeks for newborn (under 1 month)", () => {
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      expect(calculateAge(twoWeeksAgo.toISOString())).toContain("2 week")
    })

    it("calculates months for baby under 2 years", () => {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const result = calculateAge(sixMonthsAgo.toISOString())
      expect(result).toMatch(/\d+ mo/)
    })

    it("calculates years for baby 2+ years", () => {
      const threeYearsAgo = new Date()
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)
      const result = calculateAge(threeYearsAgo.toISOString())
      expect(result).toMatch(/\d+ (yr|year)/)
    })

    it("handles future date as expecting", () => {
      const future = new Date()
      future.setDate(future.getDate() + 14)
      const result = calculateAge(future.toISOString())
      expect(result).toContain("Expecting")
    })

    it("returns singular week for 1 week old", () => {
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      expect(calculateAge(oneWeekAgo.toISOString())).toBe("1 week old")
    })
  })

  describe("formatDate", () => {
    it("returns empty string for invalid date", () => {
      expect(formatDate("invalid")).toBe("")
    })

    it("formats a valid date", () => {
      const result = formatDate("2024-06-12")
      expect(result).toContain("June")
      expect(result).toContain("12")
      expect(result).toContain("2024")
    })
  })
})
