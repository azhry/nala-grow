"use client"

import { useRouter } from "next/navigation"

export default function HelpPage() {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push("/")
    }
  }

  return (
    <div className="min-h-dvh bg-surface">
      <div className="mx-auto max-w-2xl px-container-margin py-stack-lg">
        <button
          type="button"
          onClick={handleBack}
          className="mb-stack-md inline-flex items-center gap-2 text-body-sm font-medium text-primary transition-colors hover:underline"
        >
          ← Back
        </button>
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-stack-md">
          Help &amp; Support
        </h1>
        <div className="space-y-stack-md text-body-md text-on-surface-variant">
          <p>
            Need help with NalaGrow? We&apos;re here to assist you.
          </p>
          <p>
            For technical issues, feature requests, or general questions, please reach out to our support team.
          </p>
          <p>
            Common topics include account setup, data export, tracking sessions, and profile management.
          </p>
        </div>
      </div>
    </div>
  )
}
