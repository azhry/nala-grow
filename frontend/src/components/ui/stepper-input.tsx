"use client"

interface StepperInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  suffix?: string
  className?: string
}

function StepperInput({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 10,
  label,
  suffix = "ml",
  className = "",
}: StepperInputProps) {
  const decrement = () => {
    const next = Math.max(min, value - step)
    onChange(next)
  }

  const increment = () => {
    const next = Math.min(max, value + step)
    onChange(next)
  }

  return (
    <div className={["flex flex-col gap-1", className].join(" ")}>
      {label && (
        <label className="font-label-md text-label-md text-on-surface-variant ml-1">
          {label}
        </label>
      )}
      <div className="flex items-center h-14 bg-surface-container-low rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          className="w-14 h-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 transition-colors"
        >
          <span className="material-symbols-outlined text-[24px]">remove</span>
        </button>
        <div className="flex-1 flex items-center justify-center gap-1 font-headline-sm text-headline-sm text-on-surface tabular-nums">
          <span>{value}</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">{suffix}</span>
        </div>
        <button
          type="button"
          onClick={increment}
          disabled={value >= max}
          className="w-14 h-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 transition-colors"
        >
          <span className="material-symbols-outlined text-[24px]">add</span>
        </button>
      </div>
    </div>
  )
}

export { StepperInput }
export type { StepperInputProps }
