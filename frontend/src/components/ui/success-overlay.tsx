"use client"

import { useEffect, useState } from "react"
import { Card } from "./card"
import { Button } from "./button"

interface SuccessOverlayProps {
  open: boolean
  title: string
  message?: string
  onClose?: () => void
}

function SuccessOverlay({ open, title, message, onClose }: SuccessOverlayProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!open) {
      setProgress(0)
      return
    }
    const timer = setInterval(() => {
      setProgress((p) => Math.min(p + 4, 100))
    }, 30)
    return () => clearInterval(timer)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="max-w-sm w-full mx-4 text-center">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-16 h-16 rounded-full bg-primary-container/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-[36px] text-primary">
              check_circle
            </span>
          </div>
          <h2 className="font-headline-md text-on-surface">{title}</h2>
          {message && (
            <p className="font-body-md text-on-surface-variant">{message}</p>
          )}
          <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary-container transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          {onClose && progress >= 100 && (
            <Button variant="primary" size="md" onClick={onClose} className="mt-2">
              Continue
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

export { SuccessOverlay }
export type { SuccessOverlayProps }
