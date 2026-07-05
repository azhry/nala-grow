"use client"

import { useState } from "react"
import { Button, Input } from "@/components/ui"
import type { Measurement, UnitSystem } from "@/lib/store"

interface MeasurementFormProps {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<Measurement, "id" | "baby_id">) => void
  initial?: Partial<Measurement>
  unit: UnitSystem
  className?: string
}

function MeasurementForm({
  open,
  onClose,
  onSave,
  initial,
  unit,
  className = "",
}: MeasurementFormProps) {
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10))
  const [weight, setWeight] = useState(
    initial?.weight_kg != null ? String(initial.weight_kg) : ""
  )
  const [height, setHeight] = useState(
    initial?.height_cm != null ? String(initial.height_cm) : ""
  )
  const [head, setHead] = useState(
    initial?.head_cm != null ? String(initial.head_cm) : ""
  )
  const [notes, setNotes] = useState(initial?.notes ?? "")

  if (!open) return null

  const wtLabel = unit === "imperial" ? "Weight (lb)" : "Weight (kg)"
  const htLabel = unit === "imperial" ? "Height (in)" : "Height (cm)"
  const hdLabel = unit === "imperial" ? "Head Circ. (in)" : "Head Circ. (cm)"

  const parseVal = (v: string): number | undefined => {
    const n = parseFloat(v)
    return Number.isNaN(n) ? undefined : n
  }

  const handleSave = () => {
    let weightKg = parseVal(weight)
    let heightCm = parseVal(height)
    let headCm = parseVal(head)

    if (unit === "imperial") {
      if (weightKg != null) weightKg = weightKg / 2.20462
      if (heightCm != null) heightCm = heightCm / 0.393701
      if (headCm != null) headCm = headCm / 0.393701
    }

    onSave({
      date,
      weight_kg: weightKg,
      height_cm: heightCm,
      head_cm: headCm,
      notes: notes || undefined,
    })

    if (!initial) {
      setWeight("")
      setHeight("")
      setHead("")
      setNotes("")
    }
  }

  const hasValue = weight !== "" || height !== "" || head !== ""

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4">
      <div
        className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={[
          "relative w-full max-w-lg overflow-hidden bg-surface shadow-soft",
          "rounded-t-xl md:rounded-[32px]",
          className,
        ].join(" ")}
      >
        <div className="w-10 h-1 bg-outline-variant rounded-full mx-auto mt-3 mb-2" />
        <div className="px-container-margin pb-6 max-h-[80dvh] overflow-y-auto">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-6">
            {initial ? "Edit Measurement" : "New Measurement"}
          </h3>

          <div className="space-y-4">
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Input
              label={wtLabel}
              type="number"
              step="0.1"
              placeholder="e.g. 6.4"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              icon="scale"
              iconPosition="left"
            />
            <Input
              label={htLabel}
              type="number"
              step="0.1"
              placeholder="e.g. 63.5"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              icon="straighten"
              iconPosition="left"
            />
            <Input
              label={hdLabel}
              type="number"
              step="0.1"
              placeholder="e.g. 41.2"
              value={head}
              onChange={(e) => setHead(e.target.value)}
              icon="face_2"
              iconPosition="left"
            />
            <Input
              label="Notes (optional)"
              type="text"
              placeholder="Any observations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!hasValue} className="flex-1">
              {initial ? "Update" : "Record Measurement"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { MeasurementForm }
export type { MeasurementFormProps }
