"use client"

interface SegmentedOption {
  value: string
  label: string
}

interface SegmentedControlProps {
  options: SegmentedOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

function SegmentedControl({
  options,
  value,
  onChange,
  className = "",
}: SegmentedControlProps) {
  return (
    <div
      className={[
        "flex bg-surface-container-low rounded-xl p-1",
        className,
      ].join(" ")}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={[
            "flex-1 py-2 rounded-lg font-label-md text-label-md transition-all duration-150",
            value === opt.value
              ? "bg-white text-primary shadow-sm font-bold"
              : "text-on-surface-variant hover:bg-white/50",
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
