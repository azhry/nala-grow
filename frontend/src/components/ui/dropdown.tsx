"use client"

import { useState, useRef, useEffect } from "react"

interface DropdownOption {
  value: string
  label: string
}

interface DropdownProps {
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  className?: string
}

function Dropdown({ options, value, onChange, placeholder = "Select...", label, className = "" }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selected = options.find((opt) => opt.value === value)

  return (
    <div ref={ref} className={["relative", className].join(" ")}>
      {label && (
        <label className="font-label-md text-label-md text-on-surface-variant ml-1 mb-1 block">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-14 px-4 bg-surface-container-low rounded-xl font-body-md text-body-md text-on-surface flex items-center justify-between gap-2 focus:ring-2 focus:ring-primary-container outline-none transition-all"
      >
        <span className={selected ? "text-on-surface" : "text-on-surface-variant"}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="material-symbols-outlined text-outline text-[20px]">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-surface-container-lowest rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={[
                "w-full px-4 py-3 text-left font-body-md text-body-md transition-colors hover:bg-surface-container-high",
                opt.value === value
                  ? "text-primary font-bold bg-primary-container/10"
                  : "text-on-surface",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { Dropdown }
export type { DropdownProps, DropdownOption }
