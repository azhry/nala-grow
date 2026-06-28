interface StatCardProps {
  icon: string
  label: string
  value: string
  subtext?: string
  color?: "primary" | "secondary" | "tertiary" | "accent"
  active?: boolean
  badge?: string
  iconFill?: boolean
}

const iconBgColors = {
  primary: "bg-primary-container/20 text-primary",
  secondary: "bg-secondary-container/50 text-secondary",
  tertiary: "bg-tertiary-container/30 text-tertiary",
  accent: "bg-accent-coral/15 text-accent-coral",
}

function StatCard({ icon, label, value, subtext, color = "primary", active = false, badge, iconFill = false }: StatCardProps) {
  if (active) {
    return (
      <div className="bg-primary text-on-primary p-6 rounded-xl shadow-soft relative overflow-hidden group">
        <div className="relative z-10 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-primary-fixed rounded-full animate-pulse" />
            <span className="font-label-md text-label-md uppercase text-primary-fixed">{label}</span>
          </div>
          <span className="font-headline-md text-headline-md text-on-primary">{value}</span>
          {subtext && (
            <span className="font-body-sm text-body-sm text-on-primary/80">{subtext}</span>
          )}
        </div>
        <span className="material-symbols-outlined absolute bottom-4 right-4 text-6xl opacity-10 rotate-12">
          {icon}
        </span>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-lowest p-5 rounded-xl shadow-soft border border-primary/5 flex flex-col justify-between min-h-[132px]">
      <div className="flex justify-between items-start">
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${iconBgColors[color]}`}>
          <span className={["material-symbols-outlined text-[26px]", iconFill ? "fill-1" : ""].join(" ")}>
            {icon}
          </span>
        </div>
        {badge && (
          <span className="bg-primary/10 text-primary text-label-xs font-label-xs px-2 py-1 rounded-full uppercase">
            {badge}
          </span>
        )}
      </div>
      <div>
        <span className="font-label-md text-label-md text-on-surface-variant uppercase">
          {label}
        </span>
        <p className="font-headline-md text-headline-md text-on-surface mt-0.5">{value}</p>
        {subtext && (
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{subtext}</p>
        )}
      </div>
    </div>
  )
}

export { StatCard }
export type { StatCardProps }
