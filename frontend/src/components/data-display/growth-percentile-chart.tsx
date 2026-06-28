interface GrowthPercentileChartProps {
  readonly className?: string
}

const xAxisLabels = ["Birth", "4m", "8m", "12m", "16m", "20m", "24m"] as const

function GrowthPercentileChart({ className = "" }: GrowthPercentileChartProps) {
  return (
    <div className={["relative w-full", className].join(" ")}>
      <div className="h-[320px] md:h-[400px]">
        <svg
          aria-label="Weight-for-age percentile chart"
          className="h-full w-full"
          preserveAspectRatio="none"
          viewBox="0 0 800 400"
        >
          <g className="stroke-outline-variant/20" strokeWidth="1">
            <line x1="0" x2="800" y1="360" y2="360" />
            <line x1="0" x2="800" y1="280" y2="280" />
            <line x1="0" x2="800" y1="200" y2="200" />
            <line x1="0" x2="800" y1="120" y2="120" />
            <line x1="0" x2="800" y1="40" y2="40" />
          </g>

          <path
            className="fill-none stroke-primary-container/40"
            d="M0 340 Q 200 200, 400 120 T 800 20"
            strokeDasharray="4"
            strokeWidth="1"
          />
          <path
            className="fill-none stroke-primary-container/40"
            d="M0 360 Q 200 240, 400 160 T 800 60"
            strokeWidth="1"
          />
          <path
            className="fill-none stroke-primary-container/40"
            d="M0 380 Q 200 280, 400 200 T 800 100"
            strokeDasharray="4"
            strokeWidth="1"
          />

          <text className="fill-on-surface-variant/50 font-label-md text-[10px]" x="750" y="30">
            97%
          </text>
          <text className="fill-on-surface-variant/50 font-label-md text-[10px]" x="750" y="70">
            50%
          </text>
          <text className="fill-on-surface-variant/50 font-label-md text-[10px]" x="750" y="110">
            3%
          </text>

          <path
            className="fill-none stroke-primary"
            d="M0 365 L 50 350 L 100 320 L 150 285 L 200 245"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <circle className="fill-primary/20" cx="200" cy="245" r="10" />
          <circle className="fill-primary" cx="200" cy="245" r="6" />
        </svg>
      </div>
      <div className="mt-4 flex justify-between px-2 font-label-md text-label-md text-on-surface-variant">
        {xAxisLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  )
}

export { GrowthPercentileChart }
export type { GrowthPercentileChartProps }
