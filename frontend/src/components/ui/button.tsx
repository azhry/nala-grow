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
    "bg-primary text-on-primary shadow-md hover:brightness-110",
  secondary:
    "bg-secondary-container text-secondary border border-outline-variant",
  outline:
    "bg-transparent text-primary border-2 border-primary",
  ghost:
    "bg-transparent text-on-surface-variant hover:bg-surface-container-high",
  danger:
    "bg-error text-on-primary shadow-md",
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-label-md rounded-xl",
  md: "h-12 px-5 text-body-md rounded-2xl",
  lg: "h-14 px-6 text-headline-sm rounded-2xl",
  xl: "h-16 px-8 text-headline-sm rounded-full",
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "lg",
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
          "inline-flex items-center justify-center gap-2 font-semibold",
          "transition-all duration-150 ease-out",
          "active:scale-[0.98] active:transition-transform active:duration-100",
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
