"use client"

interface SideSelectorProps {
  value: "left" | "right" | null
  onChange: (value: "left" | "right") => void
  leftLabel?: string
  rightLabel?: string
  className?: string
}

function SideSelector({
  value,
  onChange,
  leftLabel = "Left",
  rightLabel = "Right",
  className = "",
}: SideSelectorProps) {
  return (
    <div className={["flex gap-3", className].join(" ")}>
      <button
        type="button"
        onClick={() => onChange("left")}
        className={[
          "flex-1 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 group",
          value === "left"
            ? "bg-primary text-white shadow-sm"
            : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high",
        ].join(" ")}
      >
        <span className="material-symbols-outlined text-[28px] transition-transform group-hover:scale-110">
          arrow_back
        </span>
        <span className="font-label-md text-label-md">{leftLabel}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("right")}
        className={[
          "flex-1 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 group",
          value === "right"
            ? "bg-primary text-white shadow-sm"
            : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high",
        ].join(" ")}
      >
        <span className="material-symbols-outlined text-[28px] transition-transform group-hover:scale-110">
          arrow_forward
        </span>
        <span className="font-label-md text-label-md">{rightLabel}</span>
      </button>
    </div>
  )
}

export { SideSelector }
export type { SideSelectorProps }
