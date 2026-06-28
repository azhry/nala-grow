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
      <div className="grid grid-cols-2 gap-base sm:grid-cols-3">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className="group flex min-h-[136px] flex-col items-center justify-center rounded-3xl bg-surface-container-low p-stack-md text-center transition-all hover:scale-105 hover:bg-primary-container/20 active:scale-[0.98]"
            onClick={() => onSelect?.(action.id)}
          >
            <span
              className={[
                "mb-3 flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-colors group-hover:bg-primary group-hover:text-on-primary",
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
