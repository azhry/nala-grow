import { type HTMLAttributes, forwardRef } from "react"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "elevated" | "outlined" | "filled"
  padding?: "none" | "sm" | "md" | "lg"
}

const variantClasses = {
  elevated:
    "bg-surface-container-lowest border border-primary/5 shadow-[0_8px_20px_rgba(126,182,173,0.15)]",
  outlined: "bg-surface-container-lowest border border-outline-variant",
  filled: "bg-surface-container",
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "elevated",
      padding = "lg",
      className = "",
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={[
          "rounded-[24px]",
          variantClasses[variant],
          paddingClasses[padding],
          className,
        ].join(" ")}
        {...props}
      >
        {children}
      </div>
    )
  },
)

Card.displayName = "Card"

export { Card }
export type { CardProps }
