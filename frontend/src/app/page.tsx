import Link from "next/link"

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60dvh] gap-stack-md">
      <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary text-center">
        NalaGrow
      </h1>
      <p className="text-body-md text-on-surface-variant text-center max-w-xs">
        Track your baby&apos;s growth, feeding, sleep, and milestones
      </p>
      <div className="flex flex-col gap-stack-sm w-full mt-stack-md">
        <Link
          href="/login"
          className="w-full bg-primary text-on-primary text-center py-4 rounded-xl font-semibold text-body-md"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="w-full bg-surface-container-high text-primary text-center py-4 rounded-xl font-semibold text-body-md"
        >
          Create account
        </Link>
      </div>
    </div>
  )
}
