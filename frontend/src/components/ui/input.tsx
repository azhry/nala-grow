"use client"

import { type InputHTMLAttributes, forwardRef } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: string
  iconPosition?: "left" | "right"
  iconAction?: () => void
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, iconPosition = "right", iconAction, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="font-label-md text-label-md text-primary ml-1 mb-0.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && iconPosition === "left" && (
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={[
              "w-full h-14 font-body-md text-body-md text-on-surface",
              "bg-surface-container-low border-none rounded-xl",
              "outline-none transition-all duration-150",
              "focus:ring-2 focus:ring-primary-container",
              "placeholder:text-on-surface-variant placeholder:opacity-50",
              error ? "ring-2 ring-error bg-error-container/20" : "",
              icon && iconPosition === "left" ? "pl-12 pr-4" : icon && iconPosition === "right" ? "pr-12 pl-4" : "px-4",
              className,
            ].join(" ")}
            {...props}
          />
          {icon && iconPosition === "right" && (
            <button
              type="button"
              onClick={iconAction}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">
                {icon}
              </span>
            </button>
          )}
        </div>
        {error && (
          <span className="font-body-sm text-body-sm text-error ml-1 mt-0.5">{error}</span>
        )}
      </div>
    )
  },
)

Input.displayName = "Input"

export { Input }
export type { InputProps }
