"use client"

import { type ReactNode, useEffect, useState } from "react"

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

function BottomSheet({ open, onClose, children, className = "" }: BottomSheetProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={[
          "relative w-full max-w-lg bg-surface rounded-t-xl overflow-hidden shadow-soft",
          "animate-in fade-in slide-in-from-bottom duration-300 ease-out",
          visible ? "translate-y-0" : "translate-y-full",
          className,
        ].join(" ")}
      >
        <div className="w-10 h-1 bg-outline-variant rounded-full mx-auto mt-3 mb-2" />
        <div className="px-container-margin pb-6">{children}</div>
      </div>
    </div>
  )
}

export { BottomSheet }
export type { BottomSheetProps }
