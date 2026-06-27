import type { ReactNode } from "react"

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
    iconBg: "bg-primary-container/30",
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

  const base = [
    "relative overflow-hidden rounded-[24px] p-5 transition-all duration-200",
    active
      ? "bg-gradient-to-br from-primary to-primary-container text-on-primary"
      : "bg-surface-container-lowest shadow-[0_8px_20px_rgba(126,182,173,0.15)]",
  ].join(" ")

  if (active) {
    return (
      <div className={base}>
        <span className="material-symbols-outlined text-on-primary/20 text-[80px] absolute -bottom-2 -right-2">
          {icon}
        </span>
        <div className="relative z-10 flex flex-col gap-2">
          <span className="font-label-md text-on-primary/80 uppercase tracking-wider">
            {label}
          </span>
          <span className="font-headline-lg text-on-primary">{value}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={base}>
      <div className="flex items-start gap-4">
        <div
          className={[
            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
            c.iconBg,
          ].join(" ")}
        >
          <span className={`material-symbols-outlined text-[24px] ${c.iconColor}`}>
            {icon}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-label-md text-on-surface-variant uppercase tracking-wider">
            {label}
          </span>
          <span className={`font-headline-lg ${c.valueColor}`}>{value}</span>
        </div>
      </div>
    </div>
  )
}

export { StatCard }
export type { StatCardProps }
