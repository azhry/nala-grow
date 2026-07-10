"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PhotoUpload, Spinner, SuccessOverlay } from "@/components/ui"
import { createBaby } from "@/lib/baby-service"
import { useAppStore } from "@/lib/store"
import { ApiError } from "@/lib/api-client"
import { uploadBabyPhoto } from "@/lib/photo-utils"

export default function CreateBabyProfilePage() {
  const router = useRouter()
  const setActiveBaby = useAppStore((s) => s.setActiveBaby)
  const babies = useAppStore((s) => s.babies)
  const setBabies = useAppStore((s) => s.setBabies)

  const [name, setName] = useState("")
  const [dob, setDob] = useState("")
  const [sex, setSex] = useState<"male" | "female" | "unspecified">("unspecified")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)

  function handlePhotoChange(file: File) {
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!name.trim()) {
      setError("Please enter your baby's name.")
      return
    }
    if (!dob) {
      setError("Please enter the date of birth.")
      return
    }

    setLoading(true)
    try {
      const photo_url = photoFile ? await uploadBabyPhoto(photoFile) : undefined
      const baby = await createBaby({
        name: name.trim(),
        dob,
        sex,
        photo_url,
      })
      setBabies([...babies, baby])
      setActiveBaby(baby)
      setShowSuccess(true)
      setTimeout(() => router.push("/profile/manage"), 1800)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Something went wrong. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-container-margin py-stack-lg">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[5%] -top-[10%] h-[40%] w-[40%] rounded-full bg-primary-container/10 blur-3xl" />
        <div className="absolute -right-[5%] bottom-[5%] h-[35%] w-[35%] rounded-full bg-tertiary-container/10 blur-3xl" />
      </div>

      <div className="soft-shadow relative z-10 w-full max-w-[540px] rounded-[24px] bg-surface-container-lowest p-base md:p-gutter">
        <div className="p-container-margin md:p-8">
          <div className="mb-stack-lg text-center">
            <h1 className="mb-2 font-headline-lg-mobile text-headline-lg-mobile text-primary md:font-headline-lg md:text-headline-lg">
              Welcome to NalaGrow
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Let&apos;s create a beautiful profile for your little one to start
              tracking their journey.
            </p>
          </div>

          <form className="space-y-stack-md" onSubmit={handleSubmit}>
            <div className="mb-stack-lg flex flex-col items-center">
              <div className="relative group">
                <PhotoUpload
                  value={photoPreview}
                  onChange={handlePhotoChange}
                  size="lg"
                  shape="circle"
                  label="Upload Photo"
                />
                <label
                  htmlFor="avatar-input"
                  className="squishy-active absolute bottom-1 right-1 cursor-pointer rounded-full bg-primary p-2 text-on-primary shadow-md transition-colors hover:bg-on-primary-fixed-variant"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                </label>
              </div>
            </div>

            <div className="space-y-base">
              <label
                htmlFor="baby-name"
                className="ml-1 font-label-md text-label-md text-primary"
              >
                Baby&apos;s Name
              </label>
              <input
                id="baby-name"
                type="text"
                placeholder="What's their name?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-14 w-full rounded-xl border-transparent bg-surface-container px-gutter font-body-md text-body-md text-on-surface transition-all placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-0 focus:outline-none"
              />
            </div>

            <div className="space-y-base">
              <label
                htmlFor="baby-dob"
                className="ml-1 font-label-md text-label-md text-primary"
              >
                Date of Birth
              </label>
              <div className="relative">
                <input
                  id="baby-dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="h-14 w-full rounded-xl border-transparent bg-surface-container px-gutter font-body-md text-body-md text-on-surface transition-all focus:border-primary focus:ring-0 focus:outline-none"
                />
                <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  calendar_today
                </span>
              </div>
            </div>

            <div className="space-y-base">
              <label className="ml-1 font-label-md text-label-md text-primary">
                Sex
              </label>
              <div className="grid grid-cols-3 gap-base">
                {(["male", "female", "unspecified"] as const).map((s) => (
                  <label key={s} className="group relative cursor-pointer">
                    <input
                      type="radio"
                      name="sex"
                      value={s}
                      checked={sex === s}
                      onChange={() => setSex(s)}
                      className="peer sr-only"
                    />
                    <div className="flex h-14 items-center justify-center rounded-xl bg-surface-container font-body-md text-on-surface-variant transition-all peer-checked:bg-primary-container/30 peer-checked:text-on-primary-container peer-checked:ring-2 peer-checked:ring-primary">
                      {s === "male"
                        ? "Male"
                        : s === "female"
                          ? "Female"
                          : "Other"}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <p className="ml-1 font-body-sm text-body-sm text-error">{error}</p>
            )}

            <div className="pt-stack-md">
              <button
                type="submit"
                disabled={loading}
                className="squishy-active shadow-lg flex h-14 w-full items-center justify-center gap-base rounded-full bg-primary font-headline-sm text-headline-sm text-on-primary transition-colors hover:bg-on-primary-fixed-variant disabled:opacity-50"
              >
                {loading ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    Save Profile
                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-stack-md text-center">
            <button className="mx-auto flex items-center justify-center gap-1 font-body-sm text-body-sm text-on-surface-variant transition-colors hover:text-primary">
              <span className="material-symbols-outlined text-sm">help</span>
              Why do we need this information?
            </button>
          </div>
        </div>
      </div>

      <SuccessOverlay
        open={showSuccess}
        title="Profile Created!"
        message="Welcome to the family. Let's start tracking milestones."
      />
    </div>
  )
}
