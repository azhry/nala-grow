"use client"

import { useState, useMemo, useCallback } from "react"
import { useAppStore } from "@/lib/store"
import { DateRangePicker, FormatSelector, DataPreview, ExportButton, ExportSuccess } from "@/components/export"
import { filterByDateRange, generateCsv, downloadCsv, printReport, formatFilename } from "@/lib/export-utils"
import { Card } from "@/components/ui"
import { AppHeader } from "@/components/layout/app-header"

function getDefaultFrom(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split("T")[0]
}

function getDefaultTo(): string {
  return new Date().toISOString().split("T")[0]
}

export default function ExportPage() {
  const activeBaby = useAppStore((s) => s.activeBaby)
  const feedSessions = useAppStore((s) => s.feedSessions)
  const sleepSessions = useAppStore((s) => s.sleepSessions)
  const measurements = useAppStore((s) => s.measurements)
  const milestones = useAppStore((s) => s.milestones)

  const [from, setFrom] = useState(getDefaultFrom)
  const [to, setTo] = useState(getDefaultTo)
  const [format, setFormat] = useState<"pdf" | "csv">("pdf")
  const [loading, setLoading] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successTitle, setSuccessTitle] = useState("")

  const babyId = activeBaby?.id ?? ""
  const babyName = activeBaby?.name ?? "Baby"

  const filteredData = useMemo(() => {
    const babyFeeds = babyId
      ? feedSessions.filter((s) => s.baby_id === babyId)
      : feedSessions
    const babySleep = babyId
      ? sleepSessions.filter((s) => s.baby_id === babyId)
      : sleepSessions
    const babyMeasurements = babyId
      ? measurements.filter((m) => m.baby_id === babyId)
      : measurements
    const babyMilestones = babyId
      ? milestones.filter((m) => m.baby_id === babyId)
      : milestones

    return {
      feedSessions: filterByDateRange(babyFeeds, from, to, "started_at"),
      sleepSessions: filterByDateRange(babySleep, from, to, "started_at"),
      measurements: filterByDateRange(babyMeasurements, from, to, "date"),
      milestones: filterByDateRange(babyMilestones, from, to, "achieved_date"),
    }
  }, [babyId, feedSessions, sleepSessions, measurements, milestones, from, to])

  const handleExport = useCallback(() => {
    setLoading(true)

    const data = {
      baby: activeBaby,
      ...filteredData,
      dateRange: { from, to },
    }

    setTimeout(() => {
      try {
        if (format === "csv") {
          const csv = generateCsv(data)
          const csvFilename = formatFilename(babyName, new Date(), "csv")
          downloadCsv(csv, csvFilename)
          setSuccessTitle("CSV Downloaded")
        } else {
          printReport(data)
          setSuccessTitle("PDF Generated")
        }
        setSuccessOpen(true)
      } catch {
        setSuccessTitle("Export Failed")
      } finally {
        setLoading(false)
      }
    }, 600)
  }, [activeBaby, filteredData, from, to, format, babyName])

  const handleSuccessClose = useCallback(() => {
    setSuccessOpen(false)
  }, [])

  const totalCount =
    filteredData.feedSessions.length +
    filteredData.sleepSessions.length +
    filteredData.measurements.length +
    filteredData.milestones.length

  return (
    <div className="pb-stack-lg">
      <AppHeader />
      <div className="content-enter px-container-margin py-stack-md max-w-lg mx-auto">
        <div className="flex flex-col gap-1 mb-stack-md">
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Export Data</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Download {babyName}&apos;s growth data as PDF or CSV
          </p>
        </div>

        <div className="flex flex-col gap-stack-md">
          <Card variant="elevated" padding="lg">
            <div className="flex flex-col gap-5">
              <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
              <FormatSelector value={format} onChange={setFormat} />
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <DataPreview
              feedSessions={filteredData.feedSessions}
              sleepSessions={filteredData.sleepSessions}
              measurements={filteredData.measurements}
              milestones={filteredData.milestones}
            />
          </Card>

          <div className="flex flex-col gap-2">
            <ExportButton
              format={format}
              loading={loading}
              onClick={handleExport}
              disabled={totalCount === 0}
            >
              {loading ? "Generating..." : format === "pdf" ? "Generate PDF Report" : "Download CSV Data"}
            </ExportButton>
            {totalCount === 0 && (
              <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
                No data found for the selected date range
              </p>
            )}
          </div>
        </div>
      </div>

      <ExportSuccess
        open={successOpen}
        title={successTitle}
        message={successTitle === "Export Failed" ? "Something went wrong. Please try again." : `Your ${format.toUpperCase()} has been generated successfully.`}
        onClose={handleSuccessClose}
      />
    </div>
  )
}
