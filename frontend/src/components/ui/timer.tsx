"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface TimerProps {
  running?: boolean
  initialSeconds?: number
  variant?: "default" | "active" | "minimal"
  onTick?: (seconds: number) => void
  onPause?: (seconds: number) => void
  onStop?: (seconds: number) => void
}

function Timer({
  running = false,
  initialSeconds = 0,
  variant = "default",
  onTick,
  onPause,
  onStop,
}: TimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1
          onTick?.(next)
          return next
        })
      }, 1000)
    } else {
      clearTimer()
    }
    return clearTimer
  }, [running, clearTimer, onTick])

  const formatTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600)
    const m = Math.floor((totalSecs % 3600) / 60)
    const s = totalSecs % 60
    return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":")
  }

  const containerClasses = {
    default: "bg-surface-container-low rounded-[24px] p-5",
    active:
      "bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-[24px] p-5 shadow-lg",
    minimal: "",
  }

  return (
    <div className={containerClasses[variant]}>
      <div className="flex flex-col items-center gap-4">
        <span
          className={[
            "font-headline-lg tracking-wider tabular-nums",
            variant === "default" ? "text-on-surface" : "text-on-primary",
          ].join(" ")}
        >
          {formatTime(seconds)}
        </span>
        <div className="flex gap-3">
          {running ? (
            <button
              type="button"
              onClick={() => onPause?.(seconds)}
              className={[
                "px-5 py-2 rounded-full font-label-md transition-all active:scale-[0.97]",
                variant === "active"
                  ? "bg-white/20 text-on-primary hover:bg-white/30"
                  : "bg-primary text-on-primary",
              ].join(" ")}
            >
              Pause
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onStop?.(seconds)}
              className={[
                "px-5 py-2 rounded-full font-label-md transition-all active:scale-[0.97]",
                variant === "active"
                  ? "bg-white text-on-primary-container"
                  : "bg-primary text-on-primary",
              ].join(" ")}
            >
              Stop
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export { Timer }
export type { TimerProps }
