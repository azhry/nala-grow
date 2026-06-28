import type { ReactNode } from "react"

interface PageShellProps {
  readonly children: ReactNode
  readonly aside?: ReactNode
  readonly className?: string
  readonly contentClassName?: string
  readonly maxWidth?: "sm" | "md" | "lg" | "xl"
}

const widthClasses: Record<NonNullable<PageShellProps["maxWidth"]>, string> = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-5xl",
  xl: "max-w-[1200px]",
}

function PageShell({
  children,
  aside,
  className = "",
  contentClassName = "",
  maxWidth = "xl",
}: PageShellProps) {
  return (
    <div className={["min-h-dvh bg-surface text-on-surface", className].join(" ")}>
      <div
        className={[
          "mx-auto w-full px-container-margin py-stack-md md:px-stack-md md:py-stack-lg",
          widthClasses[maxWidth],
          aside ? "grid gap-stack-md lg:grid-cols-[1fr_320px]" : "",
          contentClassName,
        ].join(" ")}
      >
        <main className="min-w-0">{children}</main>
        {aside && <aside className="min-w-0">{aside}</aside>}
      </div>
    </div>
  )
}

export { PageShell }
export type { PageShellProps }
