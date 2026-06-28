interface StatCardProps {
  icon: string
  label: string
  value: string
  color?: "primary" | "tertiary" | "accent"
  trend?: "up" | "down" | "neutral"
  active?: boolean
}

const colorClasses = {
  primary: {
    iconBg: "bg-primary-container/20",
    iconColor: "text-primary",
    valueColor: "text-primary",
  },
  tertiary: {
    iconBg: "bg-tertiary-container/30",
    iconColor: "text-tertiary",
    valueColor: "text-tertiary",
  },
  accent: {
    iconBg: "bg-[#FF8A7A]/15",
    iconColor: "text-[#FF8A7A]",
    valueColor: "text-[#FF8A7A]",
  },
}

function StatCard({ icon, label, value, color = "primary", active = false }: StatCardProps) {
  const c = colorClasses[color]

  if (active) {
    return (
      <div className="bg-primary p-6 rounded-[24px] shadow-lg text-on-primary relative overflow-hidden">
        <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-9xl opacity-10 rotate-12">
          {icon}
        </span>
        <div className="relative z-10 flex flex-col gap-2">
          <span className="font-label-md text-label-md text-on-primary/80 uppercase tracking-widest">
            {label}
          </span>
          <span className="font-headline-lg text-headline-lg text-on-primary">{value}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-lowest p-6 rounded-[24px] shadow-[0_8px_20px_rgba(126,182,173,0.15)] border border-primary/5 flex flex-col justify-between min-h-[160px]">
      <div className="flex justify-between items-start">
        <div
          className={[
            "w-12 h-12 rounded-2xl flex items-center justify-center",
            c.iconBg,
          ].join(" ")}
        >
          <span className={`material-symbols-outlined text-[28px] fill-1 ${c.iconColor}`}>
            {icon}
          </span>
        </div>
      </div>
      <div>
        <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">
          {label}
        </span>
        <p className={`font-headline-md text-headline-md mt-0.5 ${c.valueColor}`}>{value}</p>
      </div>
    </div>
  )
}

export { StatCard }
export type { StatCardProps }
