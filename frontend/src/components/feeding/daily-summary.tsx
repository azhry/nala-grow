"use client"

interface DailySummaryProps {
  bottleTotalMl: number
  breastTotalMins: number
  barData: { label: string; heightPct: number; title: string }[]
}

function DailySummary({ bottleTotalMl, breastTotalMins }: DailySummaryProps) {

  return (
    <section className="lg:col-span-8 bg-white rounded-2xl p-stack-md soft-shadow relative overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-base mb-stack-md">
        <div>
          <h3 className="font-headline-md text-headline-md text-primary">Daily Summary</h3>
          <p className="font-label-md text-label-md text-on-surface-variant">
            Feeding Distribution (Last 24 Hours)
          </p>
        </div>
        <div className="flex gap-base">
          <span className="px-4 py-1 bg-primary-container/10 text-primary rounded-full font-label-md">Today</span>
          <span className="px-4 py-1 text-on-surface-variant font-label-md opacity-60">Yesterday</span>
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
      <div className="flex justify-between items-end mb-2 px-1">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-on-surface-variant opacity-60">250ml</span>
          <span className="text-[10px] text-on-surface-variant opacity-60">125ml</span>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-primary rounded-sm" />
            <span className="text-[10px] text-on-surface-variant">Bottle (ml)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-primary/20 rounded-sm" />
            <span className="text-[10px] text-on-surface-variant">Breast (min)</span>
          </div>
        </div>
      </div>
      <div className="mt-stack-md h-32 w-full flex items-end gap-2 relative">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
          <div className="border-t border-primary w-full" />
          <div className="border-t border-primary w-full" />
          <div className="border-t border-primary w-full" />
        </div>
        <div className="flex-1 bg-primary/20 rounded-t-lg h-[30%] transition-all hover:h-[40%] hover:bg-primary/40 cursor-help" title="12 AM" />
        <div className="flex-1 bg-primary/20 rounded-t-lg h-[15%] transition-all hover:h-[25%] hover:bg-primary/40 cursor-help" title="3 AM" />
        <div className="flex-1 bg-primary rounded-t-lg h-[65%] transition-all hover:scale-y-105 cursor-help" title="6 AM: 120ml" />
        <div className="flex-1 bg-primary/20 rounded-t-lg h-[40%] transition-all hover:h-[50%] hover:bg-primary/40 cursor-help" title="8 AM" />
        <div className="flex-1 bg-primary rounded-t-lg h-[85%] transition-all hover:scale-y-105 cursor-help" title="10 AM: 180ml" />
        <div className="flex-1 bg-primary/20 rounded-t-lg h-[50%] transition-all hover:h-[60%] hover:bg-primary/40 cursor-help" title="12 PM" />
        <div className="flex-1 bg-primary rounded-t-lg h-[75%] transition-all hover:scale-y-105 cursor-help" title="2 PM: 150ml" />
        <div className="flex-1 bg-primary/20 rounded-t-lg h-[35%] transition-all hover:h-[45%] hover:bg-primary/40 cursor-help" title="4 PM" />
        <div className="flex-1 bg-primary rounded-t-lg h-[95%] transition-all hover:scale-y-105 cursor-help" title="6 PM: 210ml" />
        <div className="flex-1 bg-primary/20 rounded-t-lg h-[45%] transition-all hover:h-[55%] hover:bg-primary/40 cursor-help" title="8 PM" />
        <div className="flex-1 bg-primary/20 rounded-t-lg h-[25%] transition-all hover:h-[35%] hover:bg-primary/40 cursor-help" title="10 PM" />
        <div className="flex-1 bg-accent-coral/40 rounded-t-lg h-[10%] animate-pulse cursor-help" title="Active Feed" />
      </div>
      <div className="flex justify-between mt-2 px-1 text-[10px] text-on-surface-variant opacity-60">
        <span>12am</span><span>4am</span><span>8am</span><span>12pm</span><span>4pm</span><span>8pm</span><span>12am</span>
      </div>
    </section>
  )
}

DailySummary.displayName = "DailySummary"

export { DailySummary }
export type { DailySummaryProps }
