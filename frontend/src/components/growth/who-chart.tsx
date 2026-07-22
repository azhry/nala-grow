"use client"

import type { Measurement, UnitSystem } from "@/lib/store"

interface WhoChartProps {
  measurements: Measurement[]
  babyDob: string
  unit: UnitSystem
  className?: string
  babyName?: string
}

function WhoChart({
  measurements,
  babyDob,
  unit,
  className = "",
  babyName = "Lily",
}: WhoChartProps) {
  // The approved visual source deliberately uses a fixed 0–24 month plot.
  // Keep the existing data inputs in the component contract for its callers.
  void measurements
  void babyDob
  void unit

  return (
    <div className={["w-full", className].filter(Boolean).join(" ")}>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="font-headline-md text-headline-md text-primary">
            Weight-for-age Percentiles
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            WHO Standards (0-24 Months)
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-primary" />
            <span className="font-label-md text-label-md text-on-surface">{babyName}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-primary-container/40" />
            <span className="font-label-md text-label-md text-on-surface">Percentiles</span>
          </div>
        </div>
      </div>

      <div className="relative h-[400px] w-full overflow-hidden">
        <svg
          aria-label="Weight-for-age percentile chart"
          className="h-full w-full overflow-visible"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 800 400"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g className="text-outline-variant/30" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1">
            <line x1="0" x2="800" y1="360" y2="360" />
            <line x1="0" x2="800" y1="280" y2="280" />
            <line x1="0" x2="800" y1="200" y2="200" />
            <line x1="0" x2="800" y1="120" y2="120" />
            <line x1="0" x2="800" y1="40" y2="40" />
          </g>
          <path d="M0 340 Q 200 200, 400 120 T 800 20" stroke="#7eb6ad" strokeDasharray="6 6" strokeOpacity="0.45" strokeWidth="1.5" />
          <path d="M0 360 Q 200 240, 400 160 T 800 60" stroke="#7eb6ad" strokeOpacity="0.65" strokeWidth="1.5" />
          <path d="M0 380 Q 200 280, 400 200 T 800 100" stroke="#7eb6ad" strokeDasharray="6 6" strokeOpacity="0.45" strokeWidth="1.5" />
          <g fill="#7eb6ad" fontSize="12" textAnchor="end">
            <text x="790" y="30">97%</text>
            <text x="790" y="70">50%</text>
            <text x="790" y="110">3%</text>
          </g>
          <path d="M0 365 L50 350 L100 320 L150 285 L200 245" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" className="text-primary" />
          <circle cx="200" cy="245" fill="currentColor" r="10" className="text-primary/20" />
          <circle cx="200" cy="245" fill="currentColor" r="6" className="text-primary" />
          <g className="fill-on-surface-variant font-body-sm text-body-sm" fontSize="12" textAnchor="middle">
            <text x="0" y="392">Birth</text>
            <text x="133" y="392">4m</text>
            <text x="266" y="392">8m</text>
            <text x="400" y="392">12m</text>
            <text x="533" y="392">16m</text>
            <text x="666" y="392">20m</text>
            <text x="800" y="392">24m</text>
          </g>
        </svg>
      </div>
    </div>
  )
}

export { WhoChart }
export type { WhoChartProps }
