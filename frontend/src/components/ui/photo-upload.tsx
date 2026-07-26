"use client"

import { useRef } from "react"
import Image from "next/image"

interface PhotoUploadProps {
  value?: string
  onChange: (file: File) => void
  className?: string
  size?: "md" | "lg" | "xl"
  shape?: "rounded" | "circle"
  label?: string
}

const sizeClasses: Record<NonNullable<PhotoUploadProps["size"]>, string> = {
  md: "w-24 h-24 md:w-28 md:h-28",
  lg: "w-32 h-32 md:w-40 md:h-40",
  xl: "w-40 h-40 md:w-48 md:h-48",
}

const shapeClasses: Record<NonNullable<PhotoUploadProps["shape"]>, string> = {
  rounded: "rounded-xl",
  circle: "rounded-full border-4 border-surface-container",
}

function PhotoUpload({
  value,
  onChange,
  className = "",
  size = "md",
  shape = "rounded",
  label,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onChange(file)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={[
        "group relative overflow-hidden bg-surface-container-high flex items-center justify-center hover:brightness-95 transition-all active:scale-95",
        sizeClasses[size],
        shapeClasses[shape],
        className,
      ].join(" ")}
    >
      {value ? (
        <Image alt="Profile" className="object-cover" fill src={value} />
      ) : (
        <span className="flex flex-col items-center gap-1 text-on-surface-variant">
          <span className="material-symbols-outlined text-[40px]">add_a_photo</span>
          {label && <span className="font-label-md text-label-md">{label}</span>}
        </span>
      )}
      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
        <span className="material-symbols-outlined text-white text-[28px] opacity-0 group-hover:opacity-100 transition-opacity">
          camera_alt
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </button>
  )
}

export { PhotoUpload }
export type { PhotoUploadProps }
