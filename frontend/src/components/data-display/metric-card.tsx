interface MetricCardProps {
  readonly label: string
  readonly value: string
  readonly unit?: string
  readonly percentile?: string
  readonly trend?: "up" | "down" | "steady"
  readonly icon?: string
  readonly tone?: "primary" | "secondary" | "tertiary" | "error"
  readonly className?: string
}

const toneClasses: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  primary: "bg-primary-container/20 text-primary",
  secondary: "bg-secondary-container text-secondary",
  tertiary: "bg-tertiary-container/40 text-tertiary",
  error: "bg-error-container text-error",
}

const trendIcons: Record<NonNullable<MetricCardProps["trend"]>, string> = {
  up: "trending_up",
  down: "trending_down",
  steady: "trending_flat",
}

function MetricCard({
  label,
  value,
  unit,
  percentile,
  trend = "steady",
  icon,
  tone = "primary",
  className = "",
}: MetricCardProps) {
  return (
    <div
      className={[
        "rounded-2xl bg-surface-container p-3",
        "flex items-center justify-between gap-3",
        className,
      ].join(" ")}
    >
      {icon && (
        <span
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            toneClasses[tone],
          ].join(" ")}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-[24px]">{icon}</span>
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-label-md text-label-md text-on-surface-variant">{label}</p>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="font-headline-md text-headline-md text-on-surface">{value}</span>
          {unit && <span className="font-body-sm text-body-sm text-on-surface-variant">{unit}</span>}
        </div>
      </div>
      {percentile && (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-container/20 px-3 py-1 font-label-md text-label-md text-primary">
          <span className="material-symbols-outlined text-[14px]">{trendIcons[trend]}</span>
          {percentile}
        </span>
      )}
    </div>
  )
}

export { MetricCard }
export type { MetricCardProps }
