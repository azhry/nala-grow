"use client"

interface DailySummaryProps {
  bottleTotalMl: number
  breastTotalMins: number
  barData: { label: string; heightPct: number; title: string }[]
}

function DailySummary({ bottleTotalMl, breastTotalMins, barData }: DailySummaryProps) {
  return (
    <section className="lg:col-span-8 bg-white rounded-2xl p-stack-md soft-shadow relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <span className="material-symbols-outlined text-[80px] text-primary">restaurant</span>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-base mb-stack-md">
        <h3 className="font-headline-md text-headline-md text-primary">Daily Summary</h3>
        <div className="flex gap-base">
          <span className="px-4 py-1 bg-primary-container/10 text-primary rounded-full font-label-md">Today</span>
          <span className="px-4 py-1 text-on-surface-variant font-label-md opacity-60">Yesterday</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-stack-md">
        <div className="flex items-center gap-stack-md p-gutter bg-surface-container-low rounded-xl">
          <div className="p-4 bg-primary text-white rounded-2xl">
            <span className="material-symbols-outlined">bottom_drawer</span>
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Bottle Total</p>
            <p className="font-headline-lg text-headline-lg text-primary">{bottleTotalMl}ml</p>
          </div>
        </div>
        <div className="flex items-center gap-stack-md p-gutter bg-surface-container-low rounded-xl">
          <div className="p-4 bg-accent-coral text-white rounded-2xl">
            <span className="material-symbols-outlined">timer</span>
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Breast Total</p>
            <p className="font-headline-lg text-headline-lg text-primary">{breastTotalMins} mins</p>
          </div>
        </div>
      </div>
      <div className="mt-stack-md h-32 w-full flex items-end gap-1">
        {barData.map((bar, i) => (
          <div
            key={i}
            className="flex-1 bg-primary-container/20 rounded-t-lg transition-all hover:bg-primary-container/40 cursor-help"
            style={{ height: `${bar.heightPct}%` }}
            title={bar.title}
          />
        ))}
      </div>
    </section>
  )
}

DailySummary.displayName = "DailySummary"

export { DailySummary }
export type { DailySummaryProps }
