"use client"

import { useEffect, useRef } from "react"

interface SleepTimerProps {
  running: boolean
  elapsedSeconds: number
  onStart: () => void
  onStop: () => void
  onElapsedChange?: (secs: number) => void
}

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600)
    .toString()
    .padStart(2, "0")
  const m = Math.floor((secs % 3600) / 60)
    .toString()
    .padStart(2, "0")
  const s = (secs % 60).toString().padStart(2, "0")
  if (h > "00") return `${h}:${m}:${s}`
  return `${m}:${s}`
}

function SleepTimer({
  running,
  elapsedSeconds,
  onStart,
  onStop,
  onElapsedChange,
}: SleepTimerProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        onElapsedChange?.(elapsedSeconds + 1)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, elapsedSeconds, onElapsedChange])

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div
        className={[
          "w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all",
          running
            ? "timer-active text-white shadow-lg"
            : "bg-surface-container text-primary",
        ].join(" ")}
      >
        <span className="font-headline-lg text-headline-lg tabular-nums">
          {formatTime(elapsedSeconds)}
        </span>
        <span className="font-label-md text-label-md opacity-70">
          {running ? "Sleeping..." : "Not started"}
        </span>
      </div>
      <button
        type="button"
        onClick={running ? onStop : onStart}
        className={[
          "flex items-center gap-2 py-3 px-8 rounded-2xl font-headline-sm transition-all active:scale-95",
          running
            ? "bg-error-container/20 text-error border-2 border-error/30"
            : "bg-primary text-white shadow-md",
        ].join(" ")}
      >
        <span className="material-symbols-outlined">
          {running ? "stop" : "bedtime"}
        </span>
        {running ? "Stop Sleep" : "Start Sleep"}
      </button>
    </div>
  )
}

SleepTimer.displayName = "SleepTimer"

export { SleepTimer }
export type { SleepTimerProps }
