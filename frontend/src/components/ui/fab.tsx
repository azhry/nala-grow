"use client"

import { type ButtonHTMLAttributes, forwardRef } from "react"

interface FABProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string
  variant?: "primary" | "secondary"
  fixed?: boolean
}

const variantClasses = {
  primary:
    "bg-primary text-on-primary shadow-lg",
  secondary:
    "bg-surface-container-lowest text-primary border border-outline-variant shadow-md",
}

const FAB = forwardRef<HTMLButtonElement, FABProps>(
  ({ icon = "add", variant = "primary", fixed = true, className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={[
          fixed
            ? "fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-6 z-40 md:hidden"
            : "inline-flex",
          "w-14 h-14 rounded-full",
          "flex items-center justify-center",
          "transition-transform duration-150 ease-out",
          "hover:scale-105 active:scale-95",
          "cursor-pointer",
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
