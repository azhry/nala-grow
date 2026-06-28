"use client"

import { Avatar } from "./avatar"

interface ProfileCardProps {
  name: string
  age?: string
  photoUrl?: string
  active?: boolean
  onEdit?: () => void
  onSwitch?: () => void
  className?: string
}

function ProfileCard({
  name,
  age,
  photoUrl,
  active = false,
  onEdit,
  onSwitch,
  className = "",
}: ProfileCardProps) {
  return (
    <div
      className={[
        "bg-surface-container-lowest rounded-xl p-5 shadow-soft relative overflow-hidden group",
        active
          ? "border-2 border-primary-container"
          : "border border-outline-variant/30 hover:border-primary-container transition-all",
        className,
      ].join(" ")}
    >
      <div className="flex flex-col items-center text-center gap-3">
        <Avatar src={photoUrl} size="xxl" fallback={name[0]} />
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">{name}</h3>
          {age && (
            <span className="font-label-md text-label-md text-on-surface-variant">{age}</span>
          )}
        </div>
        {active && (
          <span className="bg-primary text-on-primary px-3 py-1 rounded-full font-label-xs text-label-xs flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            CURRENT
          </span>
        )}
      </div>
      <div className="flex gap-2 mt-4">
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 bg-surface-container-high text-primary font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container/20 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            <span className="font-label-md text-label-md">Edit Profile</span>
          </button>
        )}
        {!active && onSwitch && (
          <button
            type="button"
            onClick={onSwitch}
            className="flex-1 bg-primary text-on-primary font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all active:scale-95 shadow-md shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
            <span className="font-label-md text-label-md">Switch</span>
          </button>
        )}
      </div>
    </div>
  )
}

export { ProfileCard }
export type { ProfileCardProps }
