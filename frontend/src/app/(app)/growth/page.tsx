"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useAppStore } from "@/lib/store"
import type { Measurement } from "@/lib/store"
import { AppHeader } from "@/components/layout/app-header"
import { DEMO_BABY, DEMO_MEASUREMENTS, recordsForProfile } from "@/lib/demo-data"
import {
  createMeasurement,
  updateMeasurement as updateMeasurementApi,
  deleteMeasurement as deleteMeasurementApi,
  fetchMeasurements,
} from "@/lib/measurement-service"
import { WhoChart, MeasurementTable, MeasurementForm } from "@/components/growth"

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function approxPercentile(weightKg: number): number {
  if (weightKg <= 2.5) return 1
  if (weightKg >= 18) return 99
  return Math.round(((weightKg - 2.5) / (18 - 2.5)) * 100)
}

export default function GrowthPage() {
  const activeBaby = useAppStore((s) => s.activeBaby)
  const storeMeasurements = useAppStore((s) => s.measurements)
  const unitSystem = useAppStore((s) => s.unitSystem)
  const addMeasurement = useAppStore((s) => s.addMeasurement)
  const updateMeasurement = useAppStore((s) => s.updateMeasurement)
  const deleteMeasurement = useAppStore((s) => s.deleteMeasurement)
  const setUnitSystem = useAppStore((s) => s.setUnitSystem)

  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    if (activeBaby?.id && !fetched) {
      fetchMeasurements(activeBaby.id).catch(() => {})
      setFetched(true)
    }
  }, [activeBaby?.id, fetched])

  const [showForm, setShowForm] = useState(false)
  const [editingMeasurement, setEditingMeasurement] = useState<Partial<Measurement> | undefined>(undefined)

  const babyName = activeBaby?.name ?? DEMO_BABY.name
  const babyDob = activeBaby?.dob ?? DEMO_BABY.dob
  const babyId = activeBaby?.id ?? DEMO_BABY.id

  const measurements = useMemo(() => {
    return recordsForProfile(activeBaby, storeMeasurements, DEMO_MEASUREMENTS)
  }, [activeBaby, storeMeasurements])

  const latest = useMemo(() => {
    const sorted = [...measurements].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    return sorted[0] ?? null
  }, [measurements])

  const handleSave = (data: Omit<Measurement, "id" | "baby_id">) => {
    if (editingMeasurement?.id) {
      const editId = editingMeasurement.id
      updateMeasurementApi(editId, {
        ...data,
        baby_id: babyId,
      }).catch(() => {
        updateMeasurement(editId, data)
      })
    } else {
      createMeasurement({
        ...data,
        baby_id: babyId,
      }).catch(() => {
        addMeasurement({
          ...data,
          id: generateId(),
          baby_id: babyId,
        })
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
    deleteMeasurementApi(id).catch(() => {
      deleteMeasurement(id)
    })
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
      <AppHeader />
      <div className="content-enter mx-auto max-w-7xl px-container-margin py-stack-md">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-stack-sm mb-stack-md">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">
              Growth Tracking - {babyName}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Monitoring {babyName}&apos;s healthy development journey.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-surface-container p-1">
            {(["metric", "imperial"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={unitSystem === option}
                onClick={() => setUnitSystem(option)}
                className={[
                  "rounded-full px-4 py-2 font-label-md text-label-md transition-colors",
                  unitSystem === option
                    ? "bg-primary text-on-primary shadow-soft"
                    : "text-on-surface-variant",
                ].join(" ")}
              >
                {option === "metric" ? "Metric (kg/cm)" : "Imperial (lb/in)"}
              </button>
            ))}
          </div>
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
                <Link
                  href="/export"
                  className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors"
                  aria-label="Export growth records"
                >
                  <span className="material-symbols-outlined">
                    file_download
                  </span>
                </Link>
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

      <footer className="mx-auto max-w-7xl border-t border-outline-variant/30 px-container-margin py-8 text-center">
        <p className="font-body-sm text-body-sm text-on-surface-variant">NalaGrow is a tool to support your parenting journey. Always consult with a healthcare professional for medical advice.</p>
        <div className="mt-4 flex justify-center gap-6 font-label-md text-label-md text-primary"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/help">Help Center</a></div>
      </footer>

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
