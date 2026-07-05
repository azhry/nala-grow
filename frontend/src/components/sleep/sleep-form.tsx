"use client"

import { useState } from "react"
import type { SleepLocation } from "@/lib/store"
import { SleepLocationChips } from "./sleep-location-chips"

interface SleepFormProps {
  onSave: (data: {
    started_at: string
    ended_at: string
    location?: SleepLocation
    notes?: string
  }) => void
}

function formatDateForInput(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toISOString().slice(0, 16)
  } catch {
    return new Date().toISOString().slice(0, 16)
  }
}

function SleepForm({ onSave }: SleepFormProps) {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 3600000)

  const [startTime, setStartTime] = useState(formatDateForInput(oneHourAgo.toISOString()))
  const [endTime, setEndTime] = useState(formatDateForInput(now.toISOString()))
  const [location, setLocation] = useState<SleepLocation | undefined>()
  const [notes, setNotes] = useState("")

  const handleSave = () => {
    if (!startTime || !endTime) return
    const start = new Date(startTime)
    const end = new Date(endTime)
    if (end <= start) return

    onSave({
      started_at: start.toISOString(),
      ended_at: end.toISOString(),
      location,
      notes: notes.trim() || undefined,
    })

    const newNow = new Date()
    const newOneHourAgo = new Date(newNow.getTime() - 3600000)
    setStartTime(formatDateForInput(newOneHourAgo.toISOString()))
    setEndTime(formatDateForInput(newNow.toISOString()))
    setLocation(undefined)
    setNotes("")
  }

  const startDate = new Date(startTime)
  const endDate = new Date(endTime)
  const durationMin = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000))
  const durationStr =
    durationMin >= 60
      ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
      : `${durationMin}m`

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-gutter">
        <div className="space-y-2">
          <label className="font-label-md text-label-md text-on-surface-variant">
            Start Time
          </label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full h-field px-gutter bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 font-body-md text-body-md outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="font-label-md text-label-md text-on-surface-variant">
            End Time
          </label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full h-field px-gutter bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 font-body-md text-body-md outline-none"
          />
        </div>
      </div>

      {durationMin > 0 && (
        <div className="bg-primary-container/10 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">schedule</span>
          <span className="font-body-md text-body-md text-primary">
            Duration: {durationStr}
          </span>
        </div>
      )}

      <div className="space-y-2">
        <label className="font-label-md text-label-md text-on-surface-variant">
          Location
        </label>
        <SleepLocationChips value={location} onChange={setLocation} />
      </div>

      <div className="space-y-2">
        <label className="font-label-md text-label-md text-on-surface-variant">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any observations about this sleep?"
          className="w-full h-20 p-gutter bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 font-body-md text-body-md resize-none outline-none"
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={!startTime || !endTime || endDate <= startDate}
        className="w-full py-4 bg-primary text-white rounded-2xl font-headline-sm shadow-md hover:scale-[0.98] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined">check_circle</span>
        Save Sleep Entry
      </button>
    </div>
  )
}

SleepForm.displayName = "SleepForm"

export { SleepForm }
export type { SleepFormProps }
