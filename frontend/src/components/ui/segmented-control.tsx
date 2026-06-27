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
        "inline-flex bg-surface-container-low rounded-xl p-1 gap-0.5",
        className,
      ].join(" ")}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={[
            "px-4 py-1.5 rounded-lg font-label-md transition-all duration-150",
            "active:scale-[0.98]",
            value === opt.value
              ? "bg-white text-on-surface shadow-sm"
              : "text-on-surface-variant hover:text-on-surface",
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
