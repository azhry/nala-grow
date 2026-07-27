"use client"

import { useRouter } from "next/navigation"

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <div className="space-y-stack-md text-body-md text-on-surface-variant">
          <p>
            Welcome to NalaGrow. By accessing or using our service, you agree to be bound by these Terms of Service.
          </p>
          <p>
            NalaGrow is a baby growth tracking application designed to help parents monitor and record their child&apos;s development.
          </p>
          <p>
            You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account.
          </p>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the service following any changes indicates your acceptance of the new terms.
          </p>
        </div>
      </div>
    </div>
  )
}
