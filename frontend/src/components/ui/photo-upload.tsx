"use client"

import { useRef } from "react"

interface PhotoUploadProps {
  value?: string
  onChange: (file: File) => void
  className?: string
}

function PhotoUpload({ value, onChange, className = "" }: PhotoUploadProps) {
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
        "relative w-24 h-24 md:w-28 md:h-28 rounded-[20px] overflow-hidden bg-surface-container-high flex items-center justify-center hover:brightness-95 transition-all active:scale-95",
        className,
      ].join(" ")}
    >
      {value ? (
        <img src={value} alt="Profile" className="w-full h-full object-cover" />
      ) : (
        <span className="material-symbols-outlined text-primary-container text-5xl">
          face
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
