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
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4">
      <div
        className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={[
          "relative w-full max-w-lg overflow-hidden bg-surface shadow-soft",
          "rounded-t-xl md:rounded-[32px]",
          "animate-in fade-in slide-in-from-bottom duration-300 ease-out md:zoom-in-95 md:slide-in-from-bottom-0",
          visible ? "translate-y-0 md:translate-y-0" : "translate-y-full md:translate-y-0",
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
