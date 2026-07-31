"use client"

interface DailySummaryProps {
  bottleTotalMl: number
  breastTotalMins: number
  barData: {
    label: string
    bottleHeightPct: number
    bottleTitle: string
    breastHeightPct: number
    breastTitle: string
  }[]
  range?: "today" | "yesterday"
  onRangeChange?: (range: "today" | "yesterday") => void
}

function DailySummary({ bottleTotalMl, breastTotalMins, barData, range = "today", onRangeChange }: DailySummaryProps) {

  return (
    <section className="lg:col-span-8 bg-white rounded-2xl p-stack-md soft-shadow relative overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-base mb-stack-md">
        <div>
          <h3 className="font-headline-md text-headline-md text-primary">Daily Summary</h3>
          <p className="font-label-md text-label-md text-on-surface-variant">
            Feeding Distribution ({range === "today" ? "Today" : "Yesterday"})
          </p>
        </div>
        <div className="flex gap-base" aria-label="Summary date range">
          {(["today", "yesterday"] as const).map((option) => <button key={option} type="button" aria-pressed={range === option} onClick={() => onRangeChange?.(option)} className={["px-4 py-1 rounded-full font-label-md transition-colors", range === option ? "bg-primary-container/10 text-primary" : "text-on-surface-variant opacity-60 hover:bg-surface-container-low hover:opacity-100"].join(" ")}>{option === "today" ? "Today" : "Yesterday"}</button>)}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-stack-md">
        <div className="flex items-center gap-stack-md p-gutter bg-surface-container-low rounded-xl">
          <div className="p-4 bg-primary text-white rounded-2xl">
            <span className="material-symbols-outlined">restaurant</span>
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
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <div className="w-3 h-3 bg-primary rounded-sm" />
            <span className="text-[10px] text-on-surface-variant">Bottle (ml)</span>
          </div>
          <div className="relative h-32 w-full flex items-end gap-2">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
              <div className="border-t border-primary w-full" />
              <div className="border-t border-primary w-full" />
              <div className="border-t border-primary w-full" />
            </div>
            <span className="absolute left-0 top-0 text-[10px] text-on-surface-variant opacity-60">250ml</span>
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] text-on-surface-variant opacity-60">125ml</span>
            {barData.map((bar) => (
              <div key={`bottle-${bar.label}`} data-testid={`bottle-bar-${bar.label}`} className="flex-1 bg-primary rounded-t-lg transition-all hover:scale-y-105 cursor-help" style={{ height: `${bar.bottleHeightPct}%` }} title={bar.bottleTitle} />
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-1">
            <div className="w-3 h-3 bg-primary/20 rounded-sm" />
            <span className="text-[10px] text-on-surface-variant">Breast (min)</span>
          </div>
          <div className="relative h-32 w-full flex items-end gap-2">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
              <div className="border-t border-primary/40 w-full" />
              <div className="border-t border-primary/40 w-full" />
              <div className="border-t border-primary/40 w-full" />
            </div>
            {barData.map((bar) => (
              <div key={`breast-${bar.label}`} data-testid={`breast-bar-${bar.label}`} className="flex-1 bg-primary/20 rounded-t-lg transition-all hover:bg-primary/40 cursor-help" style={{ height: `${bar.breastHeightPct}%` }} title={bar.breastTitle} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-2 px-1 text-[10px] text-on-surface-variant opacity-60">
        {barData.map((bar) => <span key={bar.label}>{bar.label}</span>)}
      </div>
    </section>
  )
}

DailySummary.displayName = "DailySummary"

export { DailySummary }
export type { DailySummaryProps }
