"use client"

import { useAppStore } from "@/lib/store"
import Link from "next/link"

export function AppHeader() {
  const activeBaby = useAppStore((s) => s.activeBaby)
  const babyName = activeBaby?.name ?? "Baby"

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-outline-variant/30 bg-surface px-container-margin">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
          aria-label="NalaGrow home"
        >
          <span className="material-symbols-outlined text-primary">home</span>
          <span className="font-headline-md text-headline-md text-primary">
            NalaGrow
          </span>
        </Link>
      </div>
      <div className="hidden w-full max-w-sm items-center md:flex">
        <div className="flex w-full items-center gap-2 rounded-full bg-surface-container px-4 py-2">
          <span className="material-symbols-outlined text-on-surface-variant">
            search
          </span>
          <input
            type="text"
            placeholder="Search records..."
            className="w-full bg-transparent font-body-sm text-body-sm text-on-surface outline-none placeholder:text-on-surface-variant placeholder:opacity-70"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-error" />
        </button>
        <Link
          href="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container font-label-md text-label-md text-primary transition-colors hover:bg-primary-container/80"
        >
          {babyName.slice(0, 1)}
        </Link>
      </div>
    </header>
  )
}
