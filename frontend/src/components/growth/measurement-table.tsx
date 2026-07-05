"use client"

import { useMemo } from "react"
import type { Measurement, UnitSystem } from "@/lib/store"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function calcAge(iso: string, dob: string): string {
  const d = new Date(iso)
  const b = new Date(dob)
  let months = (d.getFullYear() - b.getFullYear()) * 12
  months += d.getMonth() - b.getMonth()
  if (months <= 0) return "Birth"
  if (months < 24) return `${months} months`
  const years = Math.floor(months / 12)
  return `${years}y ${months % 12}m`
}

function approxPercentile(weightKg: number): number | null {
  if (weightKg <= 0) return null
  if (weightKg < 2.5) return 1
  if (weightKg > 18) return 99
  const p = ((weightKg - 2.5) / (18 - 2.5)) * 100
  return Math.max(1, Math.min(99, Math.round(p)))
}

interface MeasurementTableProps {
  measurements: Measurement[]
  babyDob: string
  unit: UnitSystem
  onEdit: (m: Measurement) => void
  onDelete: (id: string) => void
  className?: string
}

function MeasurementTable({
  measurements,
  babyDob,
  unit,
  onEdit,
  onDelete,
  className = "",
}: MeasurementTableProps) {
  const sorted = useMemo(
    () =>
      [...measurements].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [measurements]
  )

  const fmt = (val: number | undefined, isWeight: boolean): string => {
    if (val == null) return "—"
    if (unit === "imperial") {
      const converted = isWeight ? val * 2.20462 : val * 0.393701
      return converted.toFixed(1)
    }
    return val.toFixed(1)
  }

  const unitLabel = (isWeight: boolean) =>
    unit === "imperial" ? (isWeight ? "lb" : "in") : isWeight ? "kg" : "cm"

  if (sorted.length === 0) {
    return (
      <div className={className}>
        <div className="text-center py-12 text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl mb-4 block">
            monitor_weight
          </span>
          <p className="font-body-md text-body-md">No measurements recorded yet.</p>
          <p className="font-body-sm text-body-sm">
            Add your first measurement to start tracking growth!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={["overflow-x-auto custom-scrollbar", className].join(" ")}>
      <table className="w-full text-left">
        <thead className="bg-surface-container-low">
          <tr>
            <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
              Age
            </th>
            <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
              Weight ({unitLabel(true)})
            </th>
            <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
              Height ({unitLabel(false)})
            </th>
            <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
              Head ({unitLabel(false)})
            </th>
            <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
              Notes
            </th>
            <th className="px-6 py-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/20">
          {sorted.map((m) => {
            const pc = m.weight_kg ? approxPercentile(m.weight_kg) : null
            const isOutOfRange = pc != null && (pc < 3 || pc > 97)
            return (
              <tr
                key={m.id}
                className="hover:bg-surface-container-lowest transition-colors"
              >
                <td className="px-6 py-4 font-body-md text-body-md whitespace-nowrap">
                  {formatDate(m.date)}
                </td>
                <td className="px-6 py-4 font-body-md text-body-md whitespace-nowrap">
                  {calcAge(m.date, babyDob)}
                </td>
                <td className="px-6 py-4">
                  {m.weight_kg != null ? (
                    <div className="flex flex-col">
                      <span
                        className={[
                          "font-headline-sm text-headline-sm",
                          isOutOfRange ? "text-error" : "",
                        ].join(" ")}
                      >
                        {fmt(m.weight_kg, true)}
                      </span>
                      {pc != null && (
                        <span
                          className={[
                            "text-xs font-bold",
                            isOutOfRange ? "text-error" : "text-primary",
                          ].join(" ")}
                        >
                          {isOutOfRange ? `⚠ ${pc}th percentile` : `${pc}th percentile`}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      —
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 font-body-md text-body-md">
                  {fmt(m.height_cm, false)}
                </td>
                <td className="px-6 py-4 font-body-md text-body-md">
                  {fmt(m.head_cm, false)}
                </td>
                <td className="px-6 py-4 font-body-sm text-body-sm text-on-surface-variant max-w-[160px] truncate">
                  {m.notes || "—"}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onEdit(m)}
                    className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary-container/10 rounded-full transition-all active:scale-90"
                    aria-label="Edit measurement"
                  >
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(m.id)}
                    className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-full transition-all active:scale-90"
                    aria-label="Delete measurement"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export { MeasurementTable }
export type { MeasurementTableProps }
