"use client"

interface BreastTimerProps {
  runningSide: "left" | "right" | null
  leftSeconds: number
  rightSeconds: number
  onToggleSide: (side: "left" | "right") => void
  onManualDurationChange?: (mins: number) => void
  manualDuration?: number
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, "0")
  const s = (secs % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

function BreastTimer({
  runningSide,
  leftSeconds,
  rightSeconds,
  onToggleSide,
  onManualDurationChange,
  manualDuration = 0,
}: BreastTimerProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-gutter">
        <div className="flex flex-col gap-base">
          <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-center">
            Left Side
          </label>
          <button
            type="button"
            onClick={() => onToggleSide("left")}
            className={[
              "py-4 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95 group",
              runningSide === "left"
                ? "timer-active text-white shadow-lg"
                : "bg-surface-container text-primary hover:bg-surface-container-high",
            ].join(" ")}
          >
            <span className="material-symbols-outlined text-[32px] transition-transform group-hover:scale-110">
              {runningSide === "left" ? "pause_circle" : "play_circle"}
            </span>
            <span className="font-headline-sm text-headline-sm tabular-nums">
              {formatTime(leftSeconds)}
            </span>
          </button>
        </div>
        <div className="flex flex-col gap-base">
          <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-center">
            Right Side
          </label>
          <button
            type="button"
            onClick={() => onToggleSide("right")}
            className={[
              "py-4 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95 group",
              runningSide === "right"
                ? "timer-active text-white shadow-lg"
                : "bg-surface-container text-primary hover:bg-surface-container-high",
            ].join(" ")}
          >
            <span className="material-symbols-outlined text-[32px] transition-transform group-hover:scale-110">
              {runningSide === "right" ? "pause_circle" : "play_circle"}
            </span>
            <span className="font-headline-sm text-headline-sm tabular-nums">
              {formatTime(rightSeconds)}
            </span>
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <label className="font-label-md text-label-md text-on-surface-variant">
          Manual Duration (mins)
        </label>
        <input
          type="number"
          min={0}
          value={manualDuration || ""}
          onChange={(e) => onManualDurationChange?.(Math.max(0, Number(e.target.value)))}
          placeholder="0"
          className="w-full h-field px-gutter bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 font-body-md text-body-md outline-none"
        />
      </div>
    </div>
  )
}

BreastTimer.displayName = "BreastTimer"

export { BreastTimer }
export type { BreastTimerProps }
