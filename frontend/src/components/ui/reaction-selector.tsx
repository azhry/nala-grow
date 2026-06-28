interface ReactionOption {
  readonly value: string
  readonly label: string
  readonly icon: string
  readonly tone?: "primary" | "neutral" | "error"
}

interface ReactionSelectorProps {
  readonly options: readonly ReactionOption[]
  readonly value: string
  readonly onChange?: (value: string) => void
  readonly className?: string
}

const toneClasses: Record<NonNullable<ReactionOption["tone"]>, string> = {
  primary: "text-primary border-primary bg-primary-container/20",
  neutral: "text-on-surface-variant border-transparent bg-surface hover:border-primary-container",
  error: "text-error border-transparent bg-surface hover:border-error-container hover:bg-error-container/20",
}

function ReactionSelector({
  options,
  value,
  onChange,
  className = "",
}: ReactionSelectorProps) {
  return (
    <div className={["grid grid-cols-3 gap-base", className].join(" ")}>
      {options.map((option) => {
        const selected = option.value === value
        const tone = selected ? "primary" : option.tone ?? "neutral"
        return (
          <button
            key={option.value}
            type="button"
            className={[
              "flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 transition-all active:scale-[0.98]",
              toneClasses[tone],
            ].join(" ")}
            onClick={() => onChange?.(option.value)}
            aria-pressed={selected}
          >
            <span className="material-symbols-outlined text-[32px]">{option.icon}</span>
            <span className="font-label-xs text-label-xs uppercase">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export { ReactionSelector }
export type { ReactionOption, ReactionSelectorProps }
