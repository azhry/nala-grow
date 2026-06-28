"use client"

import { type ButtonHTMLAttributes, forwardRef } from "react"

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger"
type ButtonSize = "sm" | "md" | "lg" | "xl"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: string
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary shadow-sm hover:shadow-md hover:scale-[1.02]",
  secondary:
    "bg-surface-container-highest text-primary border border-primary/20 shadow-sm hover:shadow-md hover:scale-[1.02]",
  outline:
    "bg-transparent text-primary border-2 border-primary hover:bg-primary/5",
  ghost:
    "bg-transparent text-on-surface-variant hover:bg-surface-container-high",
  danger:
    "bg-error text-on-primary shadow-sm",
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "gap-2 px-3 py-2 rounded-full font-label-md text-label-md",
  md: "gap-2 px-4 py-3 rounded-full font-label-md text-label-md",
  lg: "gap-3 px-6 py-3 rounded-full font-headline-sm text-headline-sm",
  xl: "gap-3 px-8 py-4 rounded-full font-headline-sm text-headline-sm",
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      fullWidth = false,
      className = "",
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          "inline-flex items-center justify-center whitespace-nowrap",
          "transition-all duration-150 ease-out",
          "active:scale-95",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? "w-full" : "",
          className,
        ].join(" ")}
        {...props}
      >
        {loading ? (
          <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : icon ? (
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        ) : null}
        {children}
      </button>
    )
  },
)

Button.displayName = "Button"

export { Button }
export type { ButtonProps, ButtonVariant, ButtonSize }
