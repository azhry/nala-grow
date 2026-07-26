/* eslint-disable @next/next/no-img-element */
import { type ImgHTMLAttributes, forwardRef } from "react"

type AvatarSize = "sm" | "md" | "lg" | "xl" | "xxl"

interface AvatarProps extends ImgHTMLAttributes<HTMLImageElement> {
  size?: AvatarSize
  fallback?: string
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
  xxl: "w-32 h-32",
}

const fallbackTextClasses: Record<AvatarSize, string> = {
  sm: "font-label-md text-label-md",
  md: "font-body-md text-body-md font-semibold",
  lg: "font-headline-sm text-headline-sm",
  xl: "font-headline-md text-headline-md",
  xxl: "font-headline-lg text-headline-lg",
}

const fallbackIconClasses: Record<AvatarSize, string> = {
  sm: "text-[18px]",
  md: "text-[22px]",
  lg: "text-[26px]",
  xl: "text-[32px]",
  xxl: "text-[48px]",
}

const Avatar = forwardRef<HTMLImageElement, AvatarProps>(
  ({ size = "md", fallback, className = "", alt = "", ...props }, ref) => {
    return (
      <div
        className={[
          "relative inline-flex items-center justify-center",
          "rounded-full overflow-hidden",
          "bg-primary-container/30",
          "border-2 border-primary-container",
          sizeClasses[size],
          className,
        ].join(" ")}
      >
        {props.src ? (
          <img
            ref={ref}
            alt={alt}
            className="w-full h-full object-cover"
            {...props}
          />
        ) : fallback ? (
          <span className={[fallbackTextClasses[size], "text-on-primary-container"].join(" ")}>
            {fallback}
          </span>
        ) : (
          <span className={["material-symbols-outlined text-on-surface-variant", fallbackIconClasses[size]].join(" ")}>
            person
          </span>
        )}
      </div>
    )
  },
)

Avatar.displayName = "Avatar"

export { Avatar }
export type { AvatarProps, AvatarSize }
