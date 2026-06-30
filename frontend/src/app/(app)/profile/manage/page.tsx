"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Spinner } from "@/components/ui"
import { useAppStore } from "@/lib/store"
import { deleteBaby } from "@/lib/baby-service"
import { calculateAge, formatDate } from "@/lib/age"
import { ApiError } from "@/lib/api-client"

export default function ManageProfilesPage() {
  const router = useRouter()
  const babies = useAppStore((s) => s.babies)
  const activeBaby = useAppStore((s) => s.activeBaby)
  const setActiveBaby = useAppStore((s) => s.setActiveBaby)
  const setBabies = useAppStore((s) => s.setBabies)

  const [switching, setSwitching] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function handleSwitch(babyId: string) {
    const baby = babies.find((b) => b.id === babyId)
    if (!baby) return
    setSwitching(babyId)
    setTimeout(() => {
      setActiveBaby(baby)
      setSwitching(null)
      router.push("/dashboard")
    }, 1000)
  }

  async function handleDelete(babyId: string) {
    setLoading(true)
    setError("")
    try {
      await deleteBaby(babyId)
      const updated = babies.filter((b) => b.id !== babyId)
      setBabies(updated)
      if (activeBaby?.id === babyId) {
        setActiveBaby(updated[0] || null)
      }
      setDeleteTarget(null)
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
    <div className="min-h-dvh bg-surface pb-stack-lg">
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between bg-surface px-container-margin shadow-sm shadow-primary/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="material-symbols-outlined rounded-full p-2 text-primary transition-colors hover:bg-surface-container-high active:scale-95"
          >
            arrow_back
          </button>
          <h1 className="font-headline-md text-headline-md text-primary">
            Manage Profiles
          </h1>
        </div>
      </header>

      <main className="mx-auto mt-stack-md max-w-[1040px] px-container-margin">
        <div className="mb-stack-md">
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface md:font-headline-lg md:text-headline-lg">
            Your Little Ones
          </h2>
          <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
            Switch between profiles to track growth and wellness for each child.
          </p>
        </div>

        {error && (
          <p className="mb-stack-md font-body-sm text-body-sm text-error">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
          {babies.map((baby) => {
            const isActive = activeBaby?.id === baby.id
            return (
              <div
                key={baby.id}
                className={[
                  "soft-shadow relative overflow-hidden rounded-[24px] border-2 bg-surface-container-lowest p-5",
                  isActive ? "border-primary-container" : "border-outline-variant/30",
                ].join(" ")}
              >
                {isActive && (
                  <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-bold tracking-widest text-on-primary">
                    <span
                      className="material-symbols-outlined fill-1 text-[14px]"
                    >
                      check_circle
                    </span>
                    CURRENT
                  </div>
                )}
                <div className="flex gap-4">
                  <div className="h-24 w-24 overflow-hidden rounded-[20px] bg-surface-container-high md:h-28 md:w-28">
                    {baby.photo_url ? (
                      <img
                        src={baby.photo_url}
                        alt={baby.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="material-symbols-outlined text-5xl text-primary-container">
                          face
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">
                      {baby.name}
                    </h3>
                    <p className="font-label-md font-semibold text-primary">
                      {calculateAge(baby.dob)}
                    </p>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center gap-2 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[16px]">
                          calendar_today
                        </span>
                        <span className="font-body-sm text-body-sm">
                          DOB: {formatDate(baby.dob)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[16px]">
                          child_care
                        </span>
                        <span className="font-body-sm text-body-sm">
                          Sex:{" "}
                          {baby.sex === "male"
                            ? "Male"
                            : baby.sex === "female"
                              ? "Female"
                              : "Other"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  {!isActive && (
                    <button
                      onClick={() => handleSwitch(baby.id)}
                      disabled={switching === baby.id}
                      className="squishy-active flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 px-4 font-semibold text-on-primary shadow-md shadow-primary/20 transition-all hover:brightness-110 disabled:opacity-50"
                    >
                      {switching === baby.id ? (
                        <Spinner size="sm" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">
                            swap_horiz
                          </span>
                          Switch to {baby.name}
                        </>
                      )}
                    </button>
                  )}
                  {isActive && (
                    <Link
                      href={`/profile/edit?id=${baby.id}`}
                      className="squishy-active flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface-container-high py-3 px-4 font-semibold text-primary transition-all hover:bg-primary-container/20"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        edit
                      </span>
                      Edit Profile
                    </Link>
                  )}
                  {!isActive && (
                    <button
                      onClick={() => setDeleteTarget(baby.id)}
                      className="rounded-xl bg-surface-container-low p-3 text-on-surface-variant transition-all hover:bg-surface-container-high"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          <Link
            href="/profile/create"
            className="squishy-active flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-primary-container bg-surface-container-low p-8 transition-all hover:bg-surface-container-high md:h-full"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container/30 text-primary transition-transform group-hover:scale-110">
              <span className="material-symbols-outlined text-3xl">
                add_circle
              </span>
            </div>
            <div className="text-center">
              <span className="block font-headline-sm text-headline-sm text-primary">
                Add New Baby
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Expand your NalaGrow family
              </span>
            </div>
          </Link>
        </div>
      </main>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/80 p-container-margin backdrop-blur-sm">
          <div className="soft-shadow max-w-sm rounded-3xl bg-surface-container-lowest p-8 text-center">
            <div className="mx-auto mb-gutter flex h-16 w-16 items-center justify-center rounded-full bg-error-container/30">
              <span className="material-symbols-outlined text-[36px] text-error">
                delete
              </span>
            </div>
            <h3 className="mb-2 font-headline-md text-headline-md text-on-surface">
              Delete Profile?
            </h3>
            <p className="mb-stack-md font-body-md text-body-md text-on-surface-variant">
              This action cannot be undone. All tracking data for this profile
              will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl bg-surface-container-high py-3 font-semibold text-on-surface-variant transition-all hover:bg-surface-container-highest"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                disabled={loading}
                className="flex-1 rounded-xl bg-error py-3 font-semibold text-on-primary transition-all hover:brightness-110 disabled:opacity-50"
              >
                {loading ? <Spinner size="sm" /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {switching && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface/80 p-container-margin text-center backdrop-blur-sm">
          <div className="flex max-w-sm w-full flex-col items-center gap-6 rounded-[32px] bg-surface-container-lowest p-8 shadow-2xl">
            <div className="relative">
              <div className="h-20 w-20 animate-spin rounded-full border-4 border-primary-container border-t-primary" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-primary">
                  sync
                </span>
              </div>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-primary">
                Switching Profile
              </h3>
              <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
                Loading data for{" "}
                <span className="font-bold text-on-surface">
                  {babies.find((b) => b.id === switching)?.name}
                </span>
                ...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
