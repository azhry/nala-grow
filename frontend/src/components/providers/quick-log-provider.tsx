"use client"

import { type ReactNode, createContext, useContext, useState } from "react"

interface QuickLogContextValue {
  open: boolean
  openLog: () => void
  closeLog: () => void
}

const QuickLogContext = createContext<QuickLogContextValue>({
  open: false,
  openLog: () => {},
  closeLog: () => {},
})

export function QuickLogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const openLog = () => setOpen(true)
  const closeLog = () => setOpen(false)

  return (
    <QuickLogContext.Provider value={{ open, openLog, closeLog }}>
      {children}
    </QuickLogContext.Provider>
  )
}

export function useQuickLog() {
  const context = useContext(QuickLogContext)
  if (context === undefined) {
    throw new Error("useQuickLog must be used within a QuickLogProvider")
  }
  return context
}
