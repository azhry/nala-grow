import type { ReactNode } from "react"

interface PageHeaderProps {
  readonly title: string
  readonly eyebrow?: string
  readonly subtitle?: string
  readonly leadingIcon?: string
  readonly trailing?: ReactNode
  readonly className?: string
}

function PageHeader({
  title,
  eyebrow,
  subtitle,
  leadingIcon,
  trailing,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={["flex items-start justify-between gap-gutter", className].join(" ")}>
      <div className="flex min-w-0 items-start gap-base">
        {leadingIcon && (
          <span className="material-symbols-outlined mt-1 text-primary text-[28px]">
            {leadingIcon}
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="font-label-md text-label-md uppercase text-on-surface-variant">
              {eyebrow}
            </p>
          )}
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-primary text-balance">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant text-balance">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </header>
  )
}

export { PageHeader }
export type { PageHeaderProps }
