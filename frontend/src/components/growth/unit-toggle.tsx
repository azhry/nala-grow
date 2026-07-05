"use client"

interface UnitToggleProps {
  unit: "metric" | "imperial"
  onChange: (unit: "metric" | "imperial") => void
  className?: string
}

function UnitToggle({ unit, onChange, className = "" }: UnitToggleProps) {
  return (
    <div
      className={[
        "inline-flex items-center gap-1 bg-surface-container-low p-0.5 rounded-full border border-outline-variant/30",
        className,
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => onChange("metric")}
        className={[
          "px-5 py-1.5 rounded-full font-label-md text-label-md transition-all whitespace-nowrap",
          unit === "metric"
            ? "bg-primary text-on-primary shadow-sm"
            : "text-on-surface-variant hover:bg-surface-container-high",
        ].join(" ")}
      >
        Metric (kg, cm)
      </button>
      <button
        type="button"
        onClick={() => onChange("imperial")}
        className={[
          "px-5 py-1.5 rounded-full font-label-md text-label-md transition-all whitespace-nowrap",
          unit === "imperial"
            ? "bg-primary text-on-primary shadow-sm"
            : "text-on-surface-variant hover:bg-surface-container-high",
        ].join(" ")}
      >
        Imperial (lb, in)
      </button>
    </div>
  )
}

export { UnitToggle }
export type { UnitToggleProps }
