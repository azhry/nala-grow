"use client"

import { type ButtonHTMLAttributes, forwardRef } from "react"

interface ExportButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  format: "pdf" | "csv"
}

const ExportButton = forwardRef<HTMLButtonElement, ExportButtonProps>(
  ({ loading = false, format, className = "", children, disabled, ...props }, ref) => {
    const iconName = format === "pdf" ? "picture_as_pdf" : "table_chart"
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          "inline-flex items-center justify-center w-full h-14 gap-2 px-6 rounded-full",
          "bg-primary text-on-primary font-headline-sm text-headline-sm",
          "shadow-sm transition-all duration-150 ease-out active:scale-[0.98]",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
          className,
        ].join(" ")}
        {...props}
      >
        {loading ? (
          <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="material-symbols-outlined text-[22px]">{iconName}</span>
        )}
        {children}
      </button>
    )
  }
)

ExportButton.displayName = "ExportButton"

export { ExportButton }
export type { ExportButtonProps }
