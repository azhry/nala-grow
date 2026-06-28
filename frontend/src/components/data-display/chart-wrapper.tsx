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
  readonly contentClassName?: string
}

function ChartWrapper({
  title,
  subtitle,
  children,
  legend = [],
  action,
  className = "",
  contentClassName = "min-h-[220px] overflow-hidden rounded-2xl bg-surface p-gutter",
}: ChartWrapperProps) {
  return (
    <Card className={className}>
      <div className="mb-8 flex flex-col gap-base sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-headline-md text-headline-md text-primary">{title}</h2>
          {subtitle && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">{subtitle}</p>
          )}
        </div>
        {(legend.length > 0 || action) && (
          <div className="flex shrink-0 flex-wrap items-center gap-gutter">
            {legend.map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-1 font-label-md text-label-md text-on-surface"
              >
                <span className={["h-3 w-3 rounded-full", item.colorClass].join(" ")} />
                {item.label}
              </span>
            ))}
            {action}
          </div>
        )}
      </div>
      <div className={contentClassName}>
        {children}
      </div>
    </Card>
  )
}

export { ChartWrapper }
export type { ChartLegendItem, ChartWrapperProps }
