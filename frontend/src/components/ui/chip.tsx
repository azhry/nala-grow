import { type HTMLAttributes, forwardRef } from "react"

type ChipColor =
  | "primary"
  | "secondary"
  | "tertiary"
  | "error"
  | "accent"
  | "neutral"

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  color?: ChipColor
  icon?: string
}

const colorClasses: Record<ChipColor, string> = {
  primary:
    "bg-primary-container/10 text-primary",
  secondary:
    "bg-secondary-container/40 text-secondary",
  tertiary:
    "bg-tertiary-container/30 text-tertiary",
  error:
    "bg-error-container text-error",
  accent:
    "bg-[#FF8A7A]/15 text-[#FF8A7A]",
  neutral:
    "bg-surface-container-high text-on-surface-variant",
}

const Chip = forwardRef<HTMLSpanElement, ChipProps>(
  ({ color = "neutral", icon, className = "", children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={[
          "inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-md text-[10px] uppercase font-bold",
          colorClasses[color],
          className,
        ].join(" ")}
        {...props}
      >
        {icon && (
          <span className="material-symbols-outlined text-[12px]">{icon}</span>
        )}
        {children}
      </span>
    )
  },
)

Chip.displayName = "Chip"

export { Chip }
export type { ChipProps, ChipColor }
