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
          "flex bg-surface-container-highest p-1.5 rounded-full",
          className,
        ].join(" ")}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              "flex-1 py-2 px-4 rounded-full font-label-md text-label-md transition-all duration-150",
              value === opt.value
                ? "bg-primary text-on-primary font-bold shadow-sm"
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
