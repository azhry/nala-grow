"use client"

import { SegmentedControl } from "@/components/ui"

interface FormatSelectorProps {
  value: "pdf" | "csv"
  onChange: (value: "pdf" | "csv") => void
}

const formatOptions = [
  { value: "pdf", label: "PDF Report" },
  { value: "csv", label: "CSV Data" },
]

function FormatSelector({ value, onChange }: FormatSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-label-md text-label-md text-on-surface-variant">Export Format</label>
      <SegmentedControl
        options={formatOptions}
        value={value}
        onChange={(v) => onChange(v as "pdf" | "csv")}
      />
    </div>
  )
}

export { FormatSelector }
export type { FormatSelectorProps }
