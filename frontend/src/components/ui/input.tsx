"use client"

import { type InputHTMLAttributes, forwardRef } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: string
  iconAction?: () => void
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, iconAction, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="font-label-md text-primary ml-1 mb-0.5">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={[
              "w-full p-3 font-body-md text-on-surface bg-surface-container-low",
              "border-none rounded-xl",
              "outline-none transition-all duration-150",
              "focus:ring-2 focus:ring-primary/20",
              "placeholder:text-on-surface-variant placeholder:opacity-60",
              error ? "ring-2 ring-error bg-error-container/20" : "",
              icon ? "pr-12" : "",
              className,
            ].join(" ")}
            {...props}
          />
          {icon && (
            <button
              type="button"
              onClick={iconAction}
              className={[
                "absolute right-3 top-1/2 -translate-y-1/2",
                "w-9 h-9 flex items-center justify-center rounded-full",
                "text-on-surface-variant hover:bg-surface-container-high",
                "transition-colors duration-150",
              ].join(" ")}
            >
              <span className="material-symbols-outlined text-[22px]">
                {icon}
              </span>
            </button>
          )}
        </div>
        {error && (
          <span className="font-body-sm text-error ml-1 mt-0.5">{error}</span>
        )}
      </div>
    )
  },
)

Input.displayName = "Input"

export { Input }
export type { InputProps }
