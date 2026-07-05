import type { FeedSession, SleepSession, Measurement, Milestone, BabyProfile } from "./store"

export interface ExportData {
  baby: BabyProfile | null
  feedSessions: FeedSession[]
  sleepSessions: SleepSession[]
  measurements: Measurement[]
  milestones: Milestone[]
  dateRange: { from: string; to: string }
}

export function filterByDateRange<T extends { started_at?: string; date?: string; achieved_date?: string }>(
  items: T[],
  from: string,
  to: string,
  dateKey: "started_at" | "date" | "achieved_date"
): T[] {
  const fromDate = from ? new Date(from) : null
  const toDate = to ? new Date(to) : null
  return items.filter((item) => {
    const dateStr = dateKey === "started_at" ? item.started_at : dateKey === "date" ? item.date : item.achieved_date
    if (!dateStr) return false
    const d = new Date(dateStr)
    if (fromDate && d < fromDate) return false
    if (toDate) {
      const toEnd = new Date(toDate)
      toEnd.setDate(toEnd.getDate() + 1)
      if (d >= toEnd) return false
    }
    return true
  })
}

function escapeCsv(value: string | number | undefined | null): string {
  if (value == null) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatDuration(seconds: number | undefined): string {
  if (seconds == null) return ""
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function generateCsv(data: ExportData): string {
  const rows: string[] = []

  if (data.feedSessions.length > 0) {
    rows.push("Feed Sessions")
    rows.push(["Date", "Type", "Duration", "Amount (ml)", "Milk Type", "Food", "Reaction", "Notes"].join(","))
    for (const s of data.feedSessions) {
      rows.push(
        [
          escapeCsv(new Date(s.started_at).toLocaleDateString()),
          escapeCsv(s.feed_type),
          escapeCsv(formatDuration(s.left_duration_sec ?? s.right_duration_sec)),
          escapeCsv(s.amount_ml),
          escapeCsv(s.milk_type),
          escapeCsv(s.food_name),
          escapeCsv(s.reaction),
          escapeCsv(s.notes),
        ].join(",")
      )
    }
    rows.push("")
  }

  if (data.sleepSessions.length > 0) {
    rows.push("Sleep Sessions")
    rows.push(["Date", "Start", "End", "Duration", "Location", "Notes"].join(","))
    for (const s of data.sleepSessions) {
      const start = new Date(s.started_at)
      const end = s.ended_at ? new Date(s.ended_at) : null
      const durationSec = end ? (end.getTime() - start.getTime()) / 1000 : undefined
      rows.push(
        [
          escapeCsv(start.toLocaleDateString()),
          escapeCsv(start.toLocaleTimeString()),
          escapeCsv(end?.toLocaleTimeString() ?? ""),
          escapeCsv(formatDuration(durationSec)),
          escapeCsv(s.location),
          escapeCsv(s.notes),
        ].join(",")
      )
    }
    rows.push("")
  }

  if (data.measurements.length > 0) {
    rows.push("Growth Measurements")
    rows.push(["Date", "Weight (kg)", "Height (cm)", "Head Circ. (cm)", "Notes"].join(","))
    for (const m of data.measurements) {
      rows.push(
        [
          escapeCsv(m.date),
          escapeCsv(m.weight_kg),
          escapeCsv(m.height_cm),
          escapeCsv(m.head_cm),
          escapeCsv(m.notes),
        ].join(",")
      )
    }
    rows.push("")
  }

  if (data.milestones.length > 0) {
    rows.push("Milestones")
    rows.push(["Title", "Category", "Achieved", "Date", "Notes"].join(","))
    for (const m of data.milestones) {
      rows.push(
        [
          escapeCsv(m.title),
          escapeCsv(m.category),
          escapeCsv(m.achieved ? "Yes" : "No"),
          escapeCsv(m.achieved_date),
          escapeCsv(m.notes),
        ].join(",")
      )
    }
    rows.push("")
  }

  return rows.join("\n")
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function generateReportHtml(data: ExportData): string {
  const babyName = data.baby?.name ?? "Baby"
  const { from, to } = data.dateRange
  const dateLabel = from && to ? `${from} to ${to}` : "All time"

  const feedRows = data.feedSessions
    .map(
      (s) => `
      <tr>
        <td>${new Date(s.started_at).toLocaleDateString()}</td>
        <td>${s.feed_type}</td>
        <td>${formatDuration(s.left_duration_sec ?? s.right_duration_sec)}</td>
        <td>${s.amount_ml ?? ""}</td>
        <td>${s.milk_type ?? s.food_name ?? ""}</td>
      </tr>`
    )
    .join("")

  const sleepRows = data.sleepSessions
    .map(
      (s) => {
        const start = new Date(s.started_at)
        const end = s.ended_at ? new Date(s.ended_at) : null
        const durationSec = end ? (end.getTime() - start.getTime()) / 1000 : undefined
        return `
      <tr>
        <td>${start.toLocaleDateString()}</td>
        <td>${start.toLocaleTimeString()}</td>
        <td>${end?.toLocaleTimeString() ?? ""}</td>
        <td>${formatDuration(durationSec)}</td>
        <td>${s.location ?? ""}</td>
      </tr>`
      }
    )
    .join("")

  const measurementRows = data.measurements
    .map(
      (m) => `
      <tr>
        <td>${m.date}</td>
        <td>${m.weight_kg != null ? `${m.weight_kg} kg` : ""}</td>
        <td>${m.height_cm != null ? `${m.height_cm} cm` : ""}</td>
        <td>${m.head_cm != null ? `${m.head_cm} cm` : ""}</td>
      </tr>`
    )
    .join("")

  const milestoneRows = data.milestones
    .filter((m) => m.achieved)
    .map(
      (m) => `
      <tr>
        <td>${m.achieved_date ?? ""}</td>
        <td>${m.title}</td>
        <td>${m.category}</td>
      </tr>`
    )
    .join("")

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>NalaGrow Growth Report - ${babyName}</title>
  <style>
    @page { margin: 20mm; size: A4; }
    body { font-family: 'Public Sans', Arial, sans-serif; color: #1D1B20; line-height: 1.5; padding: 20px; }
    h1 { font-family: 'Quicksand', Arial, sans-serif; font-size: 28px; color: #2D6E63; margin-bottom: 4px; }
    h2 { font-family: 'Quicksand', Arial, sans-serif; font-size: 20px; color: #2D6E63; border-bottom: 2px solid #E6E0E9; padding-bottom: 6px; margin-top: 24px; }
    .subtitle { color: #625B71; font-size: 14px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { background: #2D6E63; color: #FFFFFF; padding: 8px 12px; text-align: left; font-size: 13px; }
    td { padding: 8px 12px; border-bottom: 1px solid #E6E0E9; font-size: 13px; }
    tr:nth-child(even) { background: #F5F0F5; }
    .footer { margin-top: 30px; font-size: 11px; color: #938F99; text-align: center; border-top: 1px solid #E6E0E9; padding-top: 12px; }
  </style>
</head>
<body>
  <h1>NalaGrow Growth Report</h1>
  <p class="subtitle">${babyName} &mdash; ${dateLabel} &mdash; Generated ${new Date().toLocaleDateString()}</p>

  ${data.feedSessions.length > 0 ? `
  <h2>Feed Sessions (${data.feedSessions.length})</h2>
  <table>
    <thead><tr><th>Date</th><th>Type</th><th>Duration</th><th>Amount</th><th>Details</th></tr></thead>
    <tbody>${feedRows}</tbody>
  </table>` : ""}

  ${data.sleepSessions.length > 0 ? `
  <h2>Sleep Sessions (${data.sleepSessions.length})</h2>
  <table>
    <thead><tr><th>Date</th><th>Start</th><th>End</th><th>Duration</th><th>Location</th></tr></thead>
    <tbody>${sleepRows}</tbody>
  </table>` : ""}

  ${data.measurements.length > 0 ? `
  <h2>Growth Measurements (${data.measurements.length})</h2>
  <table>
    <thead><tr><th>Date</th><th>Weight</th><th>Height</th><th>Head Circ.</th></tr></thead>
    <tbody>${measurementRows}</tbody>
  </table>` : ""}

  ${data.milestones.filter((m) => m.achieved).length > 0 ? `
  <h2>Achieved Milestones (${data.milestones.filter((m) => m.achieved).length})</h2>
  <table>
    <thead><tr><th>Date</th><th>Title</th><th>Category</th></tr></thead>
    <tbody>${milestoneRows}</tbody>
  </table>` : ""}

  <div class="footer">
    Generated by NalaGrow — Baby Growth Tracker
  </div>
</body>
</html>`
}

export function printReport(data: ExportData): void {
  const html = generateReportHtml(data)
  const win = window.open("", "_blank")
  if (!win) {
    window.print()
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}

export function formatFilename(babyName: string, date: Date, ext: string): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const name = babyName.toLowerCase().replace(/\s+/g, "-")
  return `nalagrow-growth-report-${name}-${y}-${m}-${d}.${ext}`
}
