import type { ReactNode } from "react"
import { Chip } from "./chip"
import type { ChipColor } from "./chip"

interface TimelineEntry {
  id: string
  title: string
  timestamp: string
  duration?: string
  color: ChipColor
  icon?: string
  tags?: { label: string; color?: ChipColor; icon?: string }[]
  active?: boolean
  children?: ReactNode
}

interface TimelineProps {
  entries: TimelineEntry[]
  className?: string
}

const dotColors: Record<string, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  tertiary: "bg-tertiary",
  error: "bg-error",
  accent: "bg-accent-coral",
  neutral: "bg-surface-container-high",
}

function Timeline({ entries, className = "" }: TimelineProps) {
  return (
    <div className={["relative pl-8 space-y-6", className].join(" ")}>
      <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-primary-container/30" />
      {entries.map((entry, i) => (
        <div key={entry.id} className="relative group">
          <div
            className={[
              "absolute -left-8 top-1 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white z-10",
              dotColors[entry.color] || "bg-primary-container",
            ].join(" ")}
          >
            {entry.icon && (
              <span className="material-symbols-outlined text-white text-xs fill-1">
                {entry.icon}
              </span>
            )}
          </div>
          <div className="bg-surface-container-low rounded-2xl p-gutter hover:bg-surface-container-high transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h4 className="font-headline-sm text-headline-sm text-primary">
                  {entry.title}
                </h4>
                {entry.duration && (
                  <span className="font-label-md text-label-md text-on-surface-variant bg-white px-3 py-1 rounded-full">
                    {entry.duration}
                  </span>
                )}
              </div>
              <span className="font-label-md text-label-md text-on-surface-variant">
                {entry.timestamp}
              </span>
            </div>
            {entry.tags && entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {entry.tags.map((tag) => (
                  <Chip
                    key={tag.label}
                    color={tag.color || "neutral"}
                    icon={tag.icon}
                    size="md"
                  >
                    {tag.label}
                  </Chip>
                ))}
              </div>
            )}
            {entry.active && (
              <div className="mt-2 inline-flex items-center gap-1 font-label-md text-label-md text-primary">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                IN PROGRESS
              </div>
            )}
            {entry.children && (
              <div className="mt-3">{entry.children}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export { Timeline }
export type { TimelineProps, TimelineEntry }
