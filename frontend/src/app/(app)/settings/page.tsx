"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState(true)
  const [reminders, setReminders] = useState(false)

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <div className="min-h-dvh bg-surface">
      <div className="mx-auto max-w-2xl px-container-margin py-stack-lg">
        <button
          type="button"
          onClick={handleBack}
          className="mb-stack-md inline-flex items-center gap-2 text-body-sm font-medium text-primary transition-colors hover:underline"
        >
          ← Back
        </button>
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-stack-md">
          Settings
        </h1>
        <div className="space-y-stack-md">
          <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-stack-md">
            <h2 className="font-headline-sm text-headline-sm text-on-surface mb-stack-sm">
              Preferences
            </h2>
            <div className="space-y-stack-sm">
              <label className="flex items-center justify-between">
                <span className="text-body-md text-on-surface">Push notifications</span>
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                  className="h-5 w-5 rounded border-outline-variant bg-surface-container-high text-primary focus:ring-primary"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-body-md text-on-surface">Daily reminders</span>
                <input
                  type="checkbox"
                  checked={reminders}
                  onChange={(e) => setReminders(e.target.checked)}
                  className="h-5 w-5 rounded border-outline-variant bg-surface-container-high text-primary focus:ring-primary"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
