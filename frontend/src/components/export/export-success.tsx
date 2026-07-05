"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui"

interface ExportSuccessProps {
  open: boolean
  title: string
  message?: string
  onClose: () => void
}

function ExportSuccess({ open, title, message, onClose }: ExportSuccessProps) {
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

  useEffect(() => {
    if (open && progress >= 100) {
      const timeout = setTimeout(onClose, 500)
      return () => clearTimeout(timeout)
    }
  }, [open, progress, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/90 backdrop-blur-sm animate-in fade-in duration-200">
      <Card variant="filled" className="max-w-sm w-full mx-4 text-center">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-16 h-16 rounded-full bg-primary-container/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-[36px] text-primary">
              download_done
            </span>
          </div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">{title}</h2>
          {message && (
            <p className="font-body-md text-body-md text-on-surface-variant">{message}</p>
          )}
          <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary-container transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </Card>
    </div>
  )
}

export { ExportSuccess }
export type { ExportSuccessProps }
