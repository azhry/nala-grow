"use client"

import type { SleepLocation } from "@/lib/store"

interface SleepLocationChipsProps {
  value?: SleepLocation
  onChange: (location: SleepLocation) => void
}

const locationConfig: { value: SleepLocation; icon: string; label: string }[] = [
  { value: "crib", icon: "crib", label: "Crib" },
  { value: "bed", icon: "bed", label: "Bed" },
  { value: "carrier", icon: "carry_on_bag", label: "Carrier" },
  { value: "stroller", icon: "stroller", label: "Stroller" },
  { value: "contact", icon: "contact_page", label: "Contact" },
]

function SleepLocationChips({ value, onChange }: SleepLocationChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {locationConfig.map((loc) => (
        <button
          key={loc.value}
          type="button"
          onClick={() => onChange(loc.value)}
          className={[
            "inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-label-md text-label-md transition-all active:scale-95",
            value === loc.value
              ? "bg-primary-container/30 text-primary border-2 border-primary"
              : "bg-surface-container-high text-on-surface-variant border-2 border-transparent hover:bg-surface-container-highest",
          ].join(" ")}
        >
          <span className="material-symbols-outlined text-sm">{loc.icon}</span>
          {loc.label}
        </button>
      ))}
    </div>
  )
}

SleepLocationChips.displayName = "SleepLocationChips"

export { SleepLocationChips }
export type { SleepLocationChipsProps }
