"use client"

import { type ButtonHTMLAttributes, forwardRef } from "react"

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string
  variant?: "primary" | "secondary"
}

const baseClasses =
  "flex items-center gap-2 px-6 py-3 rounded-full shadow-sm hover:shadow-md transition-all whitespace-nowrap active:scale-95"

const variantClasses = {
  primary: "bg-primary text-on-primary",
  secondary: "bg-surface-container-highest text-primary border border-primary/20",
}

const PillButton = forwardRef<HTMLButtonElement, PillButtonProps>(
  ({ icon, variant = "primary", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={[baseClasses, variantClasses[variant], className].join(" ")}
        {...props}
      >
        <span className="material-symbols-outlined text-[24px]">{icon}</span>
        <span className="font-label-md text-label-md">{children}</span>
      </button>
    )
  },
)

PillButton.displayName = "PillButton"

export { PillButton }
export type { PillButtonProps }
