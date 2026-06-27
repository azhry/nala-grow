"use client"

import { type InputHTMLAttributes, forwardRef, useState } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: string
  iconAction?: () => void
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, iconAction, className = "", ...props }, ref) => {
    const [focused, setFocused] = useState(false)

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
            onFocus={(e) => {
              setFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setFocused(false)
              props.onBlur?.(e)
            }}
            className={[
              "w-full h-14 px-4 font-body-md text-on-surface",
              "bg-surface-container-low rounded-xl",
              "border-2 border-transparent",
              "outline-none transition-all duration-150",
              "placeholder:text-on-surface-variant placeholder:opacity-60",
              "focus:border-primary focus:bg-surface-container",
              error ? "border-error bg-error-container/20" : "",
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
