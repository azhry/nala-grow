"use client"

interface DailySleepSummaryProps {
  totalMinutes: number
  longestStretchMinutes: number
  sessionCount: number
  totalMinutesGoal?: number
}

function DailySleepSummary({
  totalMinutes,
  longestStretchMinutes,
  sessionCount,
  totalMinutesGoal = 600,
}: DailySleepSummaryProps) {
  const totalStr =
    totalMinutes >= 60
      ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
      : `${totalMinutes}m`

  const longestStr =
    longestStretchMinutes >= 60
      ? `${Math.floor(longestStretchMinutes / 60)}h ${longestStretchMinutes % 60}m`
      : `${longestStretchMinutes}m`

  const progressPct = Math.min(100, Math.round((totalMinutes / totalMinutesGoal) * 100))

  return (
    <section className="bg-white rounded-2xl p-stack-md soft-shadow relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <span className="material-symbols-outlined text-[80px] text-primary">bedtime</span>
      </div>

      <h3 className="font-headline-md text-headline-md text-primary mb-stack-md">
        Daily Sleep Summary
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-stack-md mb-stack-md">
        <div className="flex items-center gap-stack-md p-gutter bg-surface-container-low rounded-xl">
          <div className="p-4 bg-primary text-white rounded-2xl">
            <span className="material-symbols-outlined">schedule</span>
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
              Total Sleep
            </p>
            <p className="font-headline-lg text-headline-lg text-primary">{totalStr}</p>
          </div>
        </div>

        <div className="flex items-center gap-stack-md p-gutter bg-surface-container-low rounded-xl">
          <div className="p-4 bg-accent-coral text-white rounded-2xl">
            <span className="material-symbols-outlined">trending_up</span>
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
              Longest Stretch
            </p>
            <p className="font-headline-lg text-headline-lg text-primary">{longestStr}</p>
          </div>
        </div>

        <div className="flex items-center gap-stack-md p-gutter bg-surface-container-low rounded-xl">
          <div className="p-4 bg-tertiary text-white rounded-2xl">
            <span className="material-symbols-outlined">repeat</span>
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
              Sessions
            </p>
            <p className="font-headline-lg text-headline-lg text-primary">{sessionCount}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-label-md text-label-md text-on-surface-variant">
            Progress toward {Math.floor(totalMinutesGoal / 60)}h goal
          </span>
          <span className="font-label-md text-label-md text-primary">{progressPct}%</span>
        </div>
        <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </section>
  )
}

DailySleepSummary.displayName = "DailySleepSummary"

export { DailySleepSummary }
export type { DailySleepSummaryProps }
