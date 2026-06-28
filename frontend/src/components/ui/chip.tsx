import { type HTMLAttributes, forwardRef } from "react"

type ChipColor =
  | "primary"
  | "secondary"
  | "tertiary"
  | "error"
  | "accent"
  | "neutral"

type ChipSize = "sm" | "md"

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  color?: ChipColor
  icon?: string
  size?: ChipSize
}

const colorClasses: Record<ChipColor, string> = {
  primary:
    "bg-primary-container/20 text-on-primary-container",
  secondary:
    "bg-secondary-container/40 text-secondary",
  tertiary:
    "bg-tertiary-container/30 text-tertiary",
  error:
    "bg-error-container text-error",
  accent:
    "bg-accent-coral/15 text-accent-coral",
  neutral:
    "bg-surface-container-high text-on-surface-variant",
}

const sizeClasses: Record<ChipSize, string> = {
  sm: "px-2 py-0.5 font-label-xs text-label-xs uppercase",
  md: "px-3 py-1 font-label-md text-label-md",
}

const Chip = forwardRef<HTMLSpanElement, ChipProps>(
  ({ color = "neutral", icon, size = "sm", className = "", children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={[
          "inline-flex items-center gap-1 rounded-full",
          sizeClasses[size],
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
