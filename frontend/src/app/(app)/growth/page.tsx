"use client"

import { useState, useMemo } from "react"
import { useAppStore } from "@/lib/store"
import type { Measurement } from "@/lib/store"
import { WhoChart, UnitToggle, MeasurementTable, MeasurementForm } from "@/components/growth"

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function approxPercentile(weightKg: number): number {
  if (weightKg <= 2.5) return 1
  if (weightKg >= 18) return 99
  return Math.round(((weightKg - 2.5) / (18 - 2.5)) * 100)
}

const sampleMeasurements: Measurement[] = [
  {
    id: "sample-1",
    baby_id: "sample",
    date: "2024-07-20",
    weight_kg: 3.4,
    height_cm: 50.0,
    head_cm: 35.0,
    notes: "Birth weights.",
  },
  {
    id: "sample-2",
    baby_id: "sample",
    date: "2024-09-12",
    weight_kg: 5.1,
    height_cm: 58.2,
    head_cm: 39.5,
    notes: "Steady growth reported.",
  },
  {
    id: "sample-3",
    baby_id: "sample",
    date: "2024-10-24",
    weight_kg: 6.4,
    height_cm: 63.5,
    head_cm: 41.2,
    notes: "Post 4m vaccinations checkup",
  },
]

export default function GrowthPage() {
  const activeBaby = useAppStore((s) => s.activeBaby)
  const storeMeasurements = useAppStore((s) => s.measurements)
  const unitSystem = useAppStore((s) => s.unitSystem)
  const addMeasurement = useAppStore((s) => s.addMeasurement)
  const updateMeasurement = useAppStore((s) => s.updateMeasurement)
  const deleteMeasurement = useAppStore((s) => s.deleteMeasurement)
  const setUnitSystem = useAppStore((s) => s.setUnitSystem)

  const [showForm, setShowForm] = useState(false)
  const [editingMeasurement, setEditingMeasurement] = useState<Partial<Measurement> | undefined>(undefined)

  const babyName = activeBaby?.name ?? "Lily"
  const babyDob = activeBaby?.dob ?? "2024-07-20"
  const babyId = activeBaby?.id ?? "sample"

  const measurements = useMemo(() => {
    const userM = storeMeasurements.filter((m) => m.baby_id === babyId)
    if (userM.length === 0) {
      return sampleMeasurements.map((m) => ({ ...m, baby_id: babyId }))
    }
    return userM
  }, [storeMeasurements, babyId])

  const latest = useMemo(() => {
    const sorted = [...measurements].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    return sorted[0] ?? null
  }, [measurements])

  const handleSave = (data: Omit<Measurement, "id" | "baby_id">) => {
    if (editingMeasurement?.id) {
      updateMeasurement(editingMeasurement.id, data)
    } else {
      addMeasurement({
        ...data,
        id: generateId(),
        baby_id: babyId,
      })
    }
    setShowForm(false)
    setEditingMeasurement(undefined)
  }

  const handleEdit = (m: Measurement) => {
    setEditingMeasurement(m)
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    deleteMeasurement(id)
  }

  const openNewForm = () => {
    setEditingMeasurement(undefined)
    setShowForm(true)
  }

  const statValue = (val: number | undefined, isWeight: boolean): string => {
    if (val == null) return "—"
    if (unitSystem === "imperial") {
      const converted = isWeight ? val * 2.20462 : val * 0.393701
      return `${converted.toFixed(1)} ${isWeight ? "lb" : "in"}`
    }
    return `${val.toFixed(1)} ${isWeight ? "kg" : "cm"}`
  }

  const statPercentile = (val: number | undefined): string | null => {
    if (val == null) return null
    const pc = approxPercentile(val)
    return `${pc}th %`
  }

  return (
    <div className="pb-stack-lg">
      <div className="px-container-margin md:px-stack-lg py-stack-md max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-stack-sm mb-stack-md">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">
              Growth Tracking — {babyName}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Monitoring {babyName}&apos;s healthy development journey.
            </p>
          </div>
          <UnitToggle unit={unitSystem} onChange={setUnitSystem} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-md">
          <div className="lg:col-span-8 bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_20px_rgba(126,182,173,0.15)] border border-primary-container/10">
            <WhoChart
              measurements={measurements}
              babyDob={babyDob}
              unit={unitSystem}
              babyName={babyName}
            />
          </div>

          <div className="lg:col-span-4 flex flex-col gap-stack-md">
            <div
              onClick={openNewForm}
              className="bg-primary-container rounded-3xl p-6 text-on-primary-container flex flex-col items-center justify-center text-center shadow-lg group cursor-pointer hover:bg-primary transition-colors duration-300 active:scale-[0.98]"
            >
              <div className="w-16 h-16 bg-on-primary-container/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-on-primary/10">
                <span className="material-symbols-outlined text-4xl">
                  add_circle
                </span>
              </div>
              <h3 className="font-headline-sm text-headline-sm mb-2">
                New Measurement
              </h3>
              <p className="font-body-sm text-body-sm opacity-80 mb-4">
                {babyName} is growing fast! Add her latest stats to see updated
                percentiles.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  openNewForm()
                }}
                className="w-full bg-on-primary-container text-primary-container py-3 rounded-2xl font-label-md text-label-md font-bold uppercase tracking-wider group-hover:bg-white transition-colors"
              >
                Record Now
              </button>
            </div>

            <div className="glass-card rounded-3xl p-6 border border-primary-container/10 shadow-[0_8px_20px_rgba(126,182,173,0.15)]">
              <h3 className="font-headline-sm text-headline-sm text-primary mb-6">
                Current Stats
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">
                      scale
                    </span>
                    <div>
                      <p className="font-label-md text-label-md text-on-surface-variant">
                        Weight
                      </p>
                      <p className="font-headline-sm text-headline-sm">
                        {statValue(latest?.weight_kg, true)}
                      </p>
                    </div>
                  </div>
                  {latest?.weight_kg != null && (
                    <span className="bg-primary-container/20 text-primary px-3 py-1 rounded-full font-label-md text-label-md">
                      {statPercentile(latest.weight_kg)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">
                      straighten
                    </span>
                    <div>
                      <p className="font-label-md text-label-md text-on-surface-variant">
                        Height
                      </p>
                      <p className="font-headline-sm text-headline-sm">
                        {statValue(latest?.height_cm, false)}
                      </p>
                    </div>
                  </div>
                  {latest?.height_cm != null && (
                    <span className="bg-primary-container/20 text-primary px-3 py-1 rounded-full font-label-md text-label-md">
                      {statPercentile(latest.height_cm)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">
                      face_2
                    </span>
                    <div>
                      <p className="font-label-md text-label-md text-on-surface-variant">
                        Head Circ.
                      </p>
                      <p className="font-headline-sm text-headline-sm">
                        {statValue(latest?.head_cm, false)}
                      </p>
                    </div>
                  </div>
                  {latest?.head_cm != null && (
                    <span className="bg-primary-container/20 text-primary px-3 py-1 rounded-full font-label-md text-label-md">
                      {statPercentile(latest.head_cm)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-12 bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm border border-primary-container/10">
            <div className="p-6 border-b border-outline-variant/30 flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                Measurement History
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors"
                  aria-label="Filter"
                >
                  <span className="material-symbols-outlined">filter_list</span>
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors"
                  aria-label="Export"
                >
                  <span className="material-symbols-outlined">
                    file_download
                  </span>
                </button>
              </div>
            </div>
            <MeasurementTable
              measurements={measurements}
              babyDob={babyDob}
              unit={unitSystem}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </div>

      <MeasurementForm
        open={showForm}
        onClose={() => {
          setShowForm(false)
          setEditingMeasurement(undefined)
        }}
        onSave={handleSave}
        initial={editingMeasurement}
        unit={unitSystem}
      />
    </div>
  )
}
