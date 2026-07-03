"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { BottomSheet, QuickLogGrid } from "@/components/ui"
import type { QuickLogAction } from "@/components/ui"

interface QuickLogOverlayProps {
  open: boolean
  onClose: () => void
}

const quickLogActions: readonly QuickLogAction[] = [
  { id: "breastfeed", label: "Breastfeed", icon: "female", tone: "primary" },
  { id: "bottle", label: "Bottle Feed", icon: "bubbles", tone: "primary" },
  { id: "solids", label: "Solids", icon: "flatware", tone: "primary" },
  { id: "sleep", label: "Sleep", icon: "bedtime", tone: "primary" },
  { id: "growth", label: "Growth", icon: "straighten", tone: "primary" },
  { id: "diaper", label: "Diaper", icon: "child_care", tone: "primary" },
] as const

function QuickLogOverlay({ open, onClose }: QuickLogOverlayProps) {
  const router = useRouter()

  const handleSelect = useCallback(
    (actionId: string) => {
      onClose()
      const routes: Record<string, string> = {
        breastfeed: "/feeding/log",
        bottle: "/feeding/log",
        solids: "/feeding/log",
        sleep: "/sleep/log",
        growth: "/growth/log",
        diaper: "/feeding/log",
      }
      const path = routes[actionId]
      if (path) router.push(path)
    },
    [onClose, router],
  )

  const footer = (
    <div className="flex justify-center pt-stack-sm">
      <button
        onClick={onClose}
        className="font-label-md text-label-md text-on-surface-variant underline decoration-2 underline-offset-4 hover:text-primary transition-colors"
      >
        Cancel and return to dashboard
      </button>
    </div>
  )

  const milestoneFooter = (
    <>
      <button
        onClick={() => { onClose(); router.push("/milestones") }}
        className="col-span-full flex items-center justify-center gap-stack-sm rounded-3xl border-2 border-dashed border-secondary/20 bg-secondary-container/50 p-gutter transition-all hover:scale-[1.02] hover:bg-secondary-container"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-on-secondary">
          <span className="material-symbols-outlined">emoji_events</span>
        </div>
        <div className="text-left">
          <div className="font-label-md text-label-md font-bold text-secondary">New Milestone</div>
          <div className="text-[10px] uppercase tracking-tighter text-secondary/70">Capture a special moment</div>
        </div>
      </button>
      {footer}
    </>
  )

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="px-container-margin pb-6">
        <QuickLogGrid actions={quickLogActions} onSelect={handleSelect} footer={milestoneFooter} />
      </div>
    </BottomSheet>
  )
}

export { QuickLogOverlay }
export type { QuickLogOverlayProps }
