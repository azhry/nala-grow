import { Avatar } from "@/components/ui"

interface ProfileSwitcherProfile {
  readonly id: string
  readonly name: string
  readonly age: string
  readonly photoUrl?: string
}

interface ProfileSwitcherProps {
  readonly profiles: readonly ProfileSwitcherProfile[]
  readonly activeProfileId: string
  readonly onChange?: (profileId: string) => void
  readonly className?: string
}

function ProfileSwitcher({
  profiles,
  activeProfileId,
  onChange,
  className = "",
}: ProfileSwitcherProps) {
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0]

  return (
    <div className={["rounded-xl bg-surface-container-high p-base", className].join(" ")}>
      {activeProfile && (
        <button
          type="button"
          className="flex w-full items-center gap-base rounded-xl p-base text-left transition-colors hover:bg-surface-container-highest active:scale-[0.98]"
          onClick={() => onChange?.(activeProfile.id)}
        >
          <Avatar src={activeProfile.photoUrl} alt={activeProfile.name} size="md" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-headline-sm text-headline-sm text-primary">
              {activeProfile.name}
            </span>
            <span className="block font-label-md text-label-md text-on-surface-variant">
              {activeProfile.age}
            </span>
          </span>
          <span className="material-symbols-outlined text-on-surface-variant">unfold_more</span>
        </button>
      )}

      {profiles.length > 1 && (
        <div className="mt-base flex gap-base overflow-x-auto hide-scrollbar">
          {profiles.map((profile) => {
            const selected = profile.id === activeProfileId
            return (
              <button
                key={profile.id}
                type="button"
                className={[
                  "flex min-w-[120px] items-center gap-2 rounded-full px-3 py-2 transition-all",
                  selected
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-lowest text-on-surface-variant hover:bg-primary-container/20",
                ].join(" ")}
                onClick={() => onChange?.(profile.id)}
              >
                <Avatar src={profile.photoUrl} alt={profile.name} size="sm" />
                <span className="truncate font-label-md text-label-md">{profile.name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export { ProfileSwitcher }
export type { ProfileSwitcherProfile, ProfileSwitcherProps }
