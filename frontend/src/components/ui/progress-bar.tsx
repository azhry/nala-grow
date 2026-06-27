interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  barClassName?: string
}

function ProgressBar({
  value,
  max = 100,
  className = "",
  barClassName = "",
}: ProgressBarProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div
      className={[
        "w-full h-2 bg-surface-container rounded-full overflow-hidden",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "h-full rounded-full bg-gradient-to-r from-primary to-primary-container",
          "transition-all duration-500 ease-out",
          barClassName,
        ].join(" ")}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export { ProgressBar }
export type { ProgressBarProps }
