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

function Timeline({ entries, className = "" }: TimelineProps) {
  return (
    <div className={["flex flex-col gap-4", className].join(" ")}>
      {entries.map((entry, i) => (
        <div key={entry.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={[
                "w-3 h-3 rounded-full mt-1.5 ring-2 ring-white",
                entry.active
                  ? "bg-primary animate-pulse"
                  : entry.color === "accent"
                    ? "bg-[#FF8A7A]"
                    : entry.color === "tertiary"
                      ? "bg-tertiary"
                      : "bg-primary-container",
              ].join(" ")}
            />
            {i < entries.length - 1 && (
              <div className="w-0.5 flex-1 bg-outline-variant/50 min-h-[16px]" />
            )}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {entry.icon && (
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                      {entry.icon}
                    </span>
                  )}
                  <h4 className="font-headline-sm text-on-surface truncate">
                    {entry.title}
                  </h4>
                  {entry.active && (
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-body-sm text-on-surface-variant">
                    {entry.timestamp}
                  </span>
                  {entry.duration && (
                    <>
                      <span className="text-on-surface-variant/30">·</span>
                      <span className="font-body-sm text-on-surface-variant">
                        {entry.duration}
                      </span>
                    </>
                  )}
                </div>
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {entry.tags.map((tag) => (
                      <Chip
                        key={tag.label}
                        color={tag.color || "neutral"}
                        icon={tag.icon}
                      >
                        {tag.label}
                      </Chip>
                    ))}
                  </div>
                )}
                {entry.children && (
                  <div className="mt-3">{entry.children}</div>
                )}
              </div>
              <button
                type="button"
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export { Timeline }
export type { TimelineProps, TimelineEntry }
