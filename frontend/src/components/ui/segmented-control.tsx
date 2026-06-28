"use client"

interface SegmentedOption {
  value: string
  label: string
}

interface SegmentedControlProps {
  options: SegmentedOption[]
  value: string
  onChange: (value: string) => void
  variant?: "pill" | "tab"
  className?: string
}

function SegmentedControl({
  options,
  value,
  onChange,
  variant = "pill",
  className = "",
}: SegmentedControlProps) {
  const containerClasses = variant === "pill"
    ? "flex bg-surface-container-low p-1 rounded-full"
    : "flex bg-surface-container-low rounded-xl p-1"

  const buttonBase = variant === "pill"
    ? "flex-1 py-2 px-4 rounded-full font-label-md text-label-md transition-all duration-150"
    : "flex-1 py-2 px-4 rounded-lg font-label-md text-label-md transition-all duration-150"

  const activeClasses = variant === "pill"
    ? "bg-primary text-on-primary font-bold shadow-sm"
    : "bg-white text-primary font-bold shadow-sm"

  return (
    <div className={[containerClasses, className].join(" ")}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={[
            buttonBase,
            value === opt.value
              ? activeClasses
              : "text-on-surface-variant",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export { SegmentedControl }
export type { SegmentedControlProps, SegmentedOption }
