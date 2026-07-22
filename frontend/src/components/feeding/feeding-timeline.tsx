"use client"

import type { FeedSession } from "@/lib/store"

interface FeedingTimelineProps {
  sessions: FeedSession[]
}

const feedTypeMeta: Record<string, { icon: string; dotClass: string; label: string }> = {
  breast: { icon: "timer", dotClass: "bg-accent-coral", label: "Breastfeed" },
  bottle: { icon: "bottom_drawer", dotClass: "bg-primary", label: "Bottle Feed" },
  solids: { icon: "restaurant", dotClass: "bg-tertiary", label: "Solids" },
}

const reactionLabels: Record<string, string> = {
  loved: "Loved it!",
  interested: "Interested",
  disliked: "Disliked",
  reaction: "Reaction",
}

const reactionIcons: Record<string, string> = {
  loved: "favorite",
  interested: "sentiment_satisfied",
  disliked: "sentiment_dissatisfied",
  reaction: "warning",
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return iso
  }
}

function FeedingTimeline({ sessions }: FeedingTimelineProps) {
  if (sessions.length === 0) {
    return (
      <section className="lg:col-span-12 min-h-[280px] bg-white rounded-2xl p-stack-md soft-shadow flex flex-col">
        <div className="flex justify-between items-center mb-stack-lg">
          <h3 className="font-headline-md text-headline-md text-primary">Timeline (Last 24h)</h3>
          <button className="text-primary font-label-md flex items-center gap-1 hover:underline">
            View History
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/60">
            restaurant
          </span>
          <p className="font-body-md text-body-md text-on-surface-variant">
            No feeds recorded yet today.
          </p>
          <p className="font-label-md text-label-md text-on-surface-variant">
            Start by logging a feed above.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="lg:col-span-12 bg-white rounded-2xl p-stack-md soft-shadow">
      <div className="flex justify-between items-center mb-stack-lg">
        <h3 className="font-headline-md text-headline-md text-primary">Timeline (Last 24h)</h3>
        <button className="text-primary font-label-md flex items-center gap-1 hover:underline">
          View History
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      </div>
      <div className="relative pl-8 space-y-6 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-primary-container/30">
        {sessions.map((session) => {
          const meta = feedTypeMeta[session.feed_type] ?? feedTypeMeta.bottle
          let durationStr = ""
          const tags: { label: string; icon?: string; bgClass: string }[] = []

          if (session.feed_type === "breast") {
            const totalSec =
              (session.left_duration_sec ?? 0) + (session.right_duration_sec ?? 0)
            const totalMin = Math.round(totalSec / 60)
            durationStr = `${totalMin}m total`
            if (session.left_duration_sec) {
              tags.push({
                label: `Left (${Math.round(session.left_duration_sec / 60)}m)`,
                bgClass: "bg-primary-container/20 text-on-primary-container",
              })
            }
            if (session.right_duration_sec) {
              tags.push({
                label: `Right (${Math.round(session.right_duration_sec / 60)}m)`,
                bgClass: "bg-primary-container/20 text-on-primary-container",
              })
            }
          } else if (session.feed_type === "bottle") {
            const milkLabel =
              session.milk_type === "breast_milk"
                ? "Breastmilk"
                : session.milk_type === "formula"
                  ? "Formula"
                  : session.milk_type === "water"
                    ? "Water"
                    : ""
            durationStr = `${session.amount_ml ?? 0}ml ${milkLabel}`.trim()
          } else if (session.feed_type === "solids") {
            durationStr = session.food_name ?? "Solids"
            if (session.quantity) {
              durationStr += ` • ${session.quantity}${session.quantity_unit ?? ""}`
            }
            if (session.reaction) {
              tags.push({
                label: reactionLabels[session.reaction] ?? session.reaction,
                icon: reactionIcons[session.reaction],
                bgClass: [
                  session.reaction === "reaction"
                    ? "bg-error-container text-on-error-container"
                    : "bg-primary-container/20 text-on-primary-container",
                ].join(" "),
              })
            }
          }

          return (
            <div key={session.id} className="relative group">
              <div
                className={[
                  "absolute -left-[32px] top-1 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white z-10",
                  meta.dotClass,
                ].join(" ")}
              >
                <span
                  className="material-symbols-outlined text-white text-xs"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {meta.icon}
                </span>
              </div>
              <div className="bg-surface-container-low rounded-2xl p-gutter hover:bg-surface-container-high transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-headline-sm text-headline-sm text-primary">
                      {meta.label}
                    </p>
                    {durationStr && (
                      <span className="font-label-md text-label-md text-on-surface-variant bg-white px-3 py-1 rounded-full">
                        {durationStr}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {tags.length > 0 && (
                      <div className="flex gap-2">
                        {tags.map((tag) => (
                          <span
                            key={tag.label}
                            className={[
                              "px-3 py-1 rounded-full text-xs font-label-md flex items-center gap-1",
                              tag.bgClass,
                            ].join(" ")}
                          >
                            {tag.icon && (
                              <span
                                className="material-symbols-outlined text-xs"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                {tag.icon}
                              </span>
                            )}
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="font-label-md text-label-md text-on-surface-variant">
                      {formatTime(session.started_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

FeedingTimeline.displayName = "FeedingTimeline"

export { FeedingTimeline }
export type { FeedingTimelineProps }
