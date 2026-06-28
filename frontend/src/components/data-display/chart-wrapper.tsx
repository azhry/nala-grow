import type { ReactNode } from "react"
import { Card } from "@/components/ui"

interface ChartLegendItem {
  readonly label: string
  readonly colorClass: string
}

interface ChartWrapperProps {
  readonly title: string
  readonly subtitle?: string
  readonly children: ReactNode
  readonly legend?: readonly ChartLegendItem[]
  readonly action?: ReactNode
  readonly className?: string
}

function ChartWrapper({
  title,
  subtitle,
  children,
  legend = [],
  action,
  className = "",
}: ChartWrapperProps) {
  return (
    <Card className={["space-y-gutter", className].join(" ")}>
      <div className="flex flex-col gap-base sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-headline-sm text-headline-sm text-primary">{title}</h2>
          {subtitle && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="min-h-[220px] overflow-hidden rounded-2xl bg-surface p-gutter">
        {children}
      </div>
      {legend.length > 0 && (
        <div className="flex flex-wrap gap-base">
          {legend.map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-2 font-label-md text-label-md text-on-surface-variant"
            >
              <span className={["h-2.5 w-2.5 rounded-full", item.colorClass].join(" ")} />
              {item.label}
            </span>
          ))}
        </div>
      )}
    </Card>
  )
}

export { ChartWrapper }
export type { ChartLegendItem, ChartWrapperProps }
