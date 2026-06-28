"use client"

import { type ButtonHTMLAttributes, forwardRef } from "react"

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger"
type ButtonSize = "sm" | "md" | "lg" | "xl" | "form"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: string
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary shadow-sm",
  secondary:
    "bg-surface-container-highest text-primary border border-primary/20 shadow-sm",
  outline:
    "bg-transparent text-primary border-2 border-primary hover:bg-primary/5",
  ghost:
    "bg-transparent text-on-surface-variant hover:bg-surface-container-high transition-colors",
  danger:
    "bg-error text-on-primary shadow-sm",
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "gap-1.5 px-3 py-2 rounded-full font-headline-sm text-headline-sm",
  md: "gap-2 px-4 py-3 rounded-full font-headline-sm text-headline-sm",
  lg: "gap-2 px-5 py-3 rounded-full font-headline-sm text-headline-sm",
  xl: "gap-2 px-8 py-4 rounded-full font-headline-sm text-headline-sm",
  form: "h-14 gap-2 px-6 rounded-xl font-headline-sm text-headline-sm hover:bg-on-primary-container",
}

const sizeActive: Record<ButtonSize, string> = {
  sm: "active:scale-95",
  md: "active:scale-95",
  lg: "active:scale-95",
  xl: "active:scale-95",
  form: "active:scale-[0.98]",
}

const sizeHover: Record<ButtonVariant, string> = {
  primary: "hover:shadow-md",
  secondary: "hover:shadow-md",
  outline: "",
  ghost: "",
  danger: "",
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
          sizeActive[size],
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
          variantClasses[variant],
          sizeClasses[size],
          sizeHover[variant],
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
