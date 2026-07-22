"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuickLog } from "@/components/providers/quick-log-provider"
import { BottomSheet } from "@/components/ui"

interface QuickLogAction {
  readonly id: string
  readonly label: string
  readonly icon: string
  readonly description?: string
  readonly href: string
}

const quickLogActions: readonly QuickLogAction[] = [
  { id: "breast", label: "Breastfeed", icon: "female", href: "/feeding" },
  { id: "bottle", label: "Bottle Feed", icon: "local_drink", href: "/feeding" },
  { id: "solids", label: "Solids", icon: "restaurant", href: "/feeding" },
  { id: "sleep", label: "Sleep", icon: "bedtime", href: "/sleep" },
  { id: "growth", label: "Growth", icon: "straighten", href: "/growth" },
  { id: "diaper", label: "Diaper", icon: "baby_changing_station", href: "/feeding" },
  {
    id: "milestone",
    label: "New Milestone",
    description: "Capture a special moment",
    icon: "emoji_events",
    href: "/milestones",
  },
]

function QuickLogOverlay() {
  const { open, closeLog } = useQuickLog()
  const router = useRouter()

  return (
    <BottomSheet open={open} onClose={closeLog}>
      <div className="px-container-margin pb-6">
        <div className="mb-stack-md flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md text-primary">Quick Log</h3>
          <button
            type="button"
            className="p-2 rounded-full transition-colors text-on-surface-variant hover:bg-surface-container-high"
            onClick={closeLog}
            aria-label="Close quick log"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-base sm:grid-cols-3">
          {quickLogActions.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className="group flex flex-col items-center justify-center rounded-3xl bg-surface-container-low p-stack-md text-center transition-all hover:scale-105 hover:bg-primary-container/20 active:scale-[0.98]"
              onClick={closeLog}
            >
              <span className="mb-3 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-container/30 text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
                <span className="material-symbols-outlined text-[32px]">{action.icon}</span>
              </span>
              <span className="font-body-md text-body-md font-semibold text-on-surface">
                {action.label}
              </span>
              {action.description && (
                <span className="text-[10px] text-on-surface-variant uppercase tracking-tighter">
                  {action.description}
                </span>
              )}
            </Link>
          ))}
        </div>
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={closeLog}
            className="font-label-md text-label-md text-on-surface-variant underline decoration-2 underline-offset-4 hover:text-primary transition-colors"
          >
            Cancel and return to dashboard
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

export { QuickLogOverlay }
