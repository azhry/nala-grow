"use client"

import { Avatar } from "../ui/avatar"

interface TopNavBarProps {
  title?: string
  subtitle?: string
  babyAvatar?: string
  babyName?: string
  onNotificationClick?: () => void
}

function TopNavBar({
  title = "NalaGrow",
  subtitle,
  babyAvatar,
  babyName,
  onNotificationClick,
}: TopNavBarProps) {
  return (
    <header className="sticky top-0 z-20 h-16 bg-surface/90 backdrop-blur-md border-b border-outline-variant/20">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[28px] text-primary">
            child_care
          </span>
          <div>
            <h1 className="font-headline-md text-on-surface">{title}</h1>
            {subtitle && (
              <p className="font-body-sm text-on-surface-variant -mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onNotificationClick && (
            <button
              type="button"
              onClick={onNotificationClick}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[24px] text-on-surface-variant">
                notifications
              </span>
            </button>
          )}
          {babyName && (
            <Avatar src={babyAvatar} size="md" fallback={babyName[0]} />
          )}
        </div>
      </div>
    </header>
  )
}

export { TopNavBar }
export type { TopNavBarProps }
