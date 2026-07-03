"use client"

import type { ReactNode } from "react"

interface SummaryCardProps {
  icon: string
  iconBgColor?: string
  iconColor?: string
  label: string
  value: string
  children?: ReactNode
  badge?: string
  onClick?: () => void
  className?: string
}

const iconBgMap: Record<string, string> = {
  primary: "bg-primary-container/20 text-primary",
  tertiary: "bg-tertiary-container/20 text-tertiary",
  secondary: "bg-secondary-container/50 text-secondary",
}

function SummaryCard({
  icon,
  iconBgColor = "primary",
  label,
  value,
  children,
  badge,
  onClick,
  className = "",
}: SummaryCardProps) {
  return (
    <div
      className={[
        "bento-card flex min-h-[160px] flex-col justify-between rounded-3xl border border-primary/5 bg-surface-container-lowest p-stack-md shadow-soft",
        onClick ? "cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-soft-lg active:scale-[0.99]" : "",
        className,
      ].join(" ")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick() } : undefined}
    >
      <div className="flex items-start justify-between">
        <div className={["flex h-12 w-12 items-center justify-center rounded-2xl", iconBgMap[iconBgColor] || iconBgMap.primary].join(" ")}>
          <span className="material-symbols-outlined fill-1 text-[28px]">{icon}</span>
        </div>
        {badge && (
          <span className="rounded-full bg-primary/10 px-2 py-1 text-label-xs font-label-xs uppercase tracking-wider text-primary">
            {badge}
          </span>
        )}
      </div>
      <div>
        <h3 className="mt-stack-sm font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">
          {label}
        </h3>
        <p className="font-headline-md text-headline-md text-on-surface">{value}</p>
        {children && <div className="text-body-sm text-on-surface-variant">{children}</div>}
      </div>
    </div>
  )
}

export { SummaryCard }
export type { SummaryCardProps }
