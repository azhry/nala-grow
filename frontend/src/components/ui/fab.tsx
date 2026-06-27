"use client"

import { type ButtonHTMLAttributes, forwardRef } from "react"

interface FABProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string
  variant?: "primary" | "secondary"
  fixed?: boolean
}

const variantClasses = {
  primary:
    "bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-lg",
  secondary:
    "bg-surface-container-lowest text-primary border border-outline-variant shadow-md",
}

const FAB = forwardRef<HTMLButtonElement, FABProps>(
  ({ icon = "add", variant = "primary", fixed = true, className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={[
          fixed ? "fixed bottom-24 right-6 z-40" : "inline-flex",
          "w-14 h-14 rounded-2xl",
          "flex items-center justify-center",
          "transition-all duration-150 ease-out",
          "active:scale-[0.95]",
          "shadow-[0_8px_20px_rgba(126,182,173,0.3)]",
          variantClasses[variant],
          className,
        ].join(" ")}
        {...props}
      >
        <span className="material-symbols-outlined text-[28px]">{icon}</span>
      </button>
    )
  },
)

FAB.displayName = "FAB"

export { FAB }
export type { FABProps }
