import type { ReactNode } from "react"

interface QuickLogAction {
  readonly id: string
  readonly label: string
  readonly icon: string
  readonly description?: string
  readonly tone?: "primary" | "secondary" | "tertiary" | "accent"
}

interface QuickLogGridProps {
  readonly actions: readonly QuickLogAction[]
  readonly onSelect?: (actionId: string) => void
  readonly className?: string
  readonly footer?: ReactNode
}

const toneClasses: Record<NonNullable<QuickLogAction["tone"]>, string> = {
  primary: "bg-primary-container/20 text-primary",
  secondary: "bg-secondary-container text-secondary",
  tertiary: "bg-tertiary-container/40 text-tertiary",
  accent: "bg-accent-coral/15 text-accent-coral",
}

function QuickLogGrid({ actions, onSelect, className = "", footer }: QuickLogGridProps) {
  return (
    <div className={["space-y-gutter", className].join(" ")}>
      <div className="grid grid-cols-2 gap-gutter sm:grid-cols-3">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className="group flex aspect-square min-h-[120px] flex-col items-center justify-center gap-base rounded-2xl bg-surface-container-low p-gutter text-center transition-all hover:bg-surface-container-high active:scale-[0.98]"
            onClick={() => onSelect?.(action.id)}
          >
            <span
              className={[
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-110",
                toneClasses[action.tone ?? "primary"],
              ].join(" ")}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-[32px]">{action.icon}</span>
            </span>
            <span className="font-body-md text-body-md font-semibold text-on-surface">{action.label}</span>
            {action.description && (
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {action.description}
              </span>
            )}
          </button>
        ))}
      </div>
      {footer}
    </div>
  )
}

export { QuickLogGrid }
export type { QuickLogAction, QuickLogGridProps }
