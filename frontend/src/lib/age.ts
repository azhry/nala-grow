export function calculateAge(dob: string): string {
  const birth = new Date(dob)
  const now = new Date()

  if (isNaN(birth.getTime())) return ""

  const diffMs = now.getTime() - birth.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    const weeksUntil = Math.abs(diffDays) / 7
    if (weeksUntil < 2) return "Due soon"
    return `Expecting in ${Math.floor(weeksUntil)} weeks`
  }

  const weeks = Math.floor(diffDays / 7)
  const months = Math.floor(diffDays / 30.44)
  const years = Math.floor(diffDays / 365.25)

  if (years >= 2) {
    const remainingMonths = Math.floor((diffDays % 365.25) / 30.44)
    return remainingMonths > 0
      ? `${years} yr ${remainingMonths} mo`
      : `${years} year${years > 1 ? "s" : ""} old`
  }

  if (months >= 1) {
    const remainingWeeks = Math.floor((diffDays % 30.44) / 7)
    return remainingWeeks > 0
      ? `${months} mo ${remainingWeeks} wk`
      : `${months} month${months > 1 ? "s" : ""} old`
  }

  return `${weeks} week${weeks !== 1 ? "s" : ""} old`
}

export function formatDate(dob: string): string {
  const date = new Date(dob)
  if (isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}
