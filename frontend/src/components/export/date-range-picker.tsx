"use client"

interface DateRangePickerProps {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
}

function DateRangePicker({ from, to, onFromChange, onToChange }: DateRangePickerProps) {
  return (
    <div className="flex flex-col gap-3">
      <label className="font-label-md text-label-md text-on-surface-variant">Date Range</label>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="font-body-sm text-body-sm text-on-surface-variant mb-1 block">From</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
              calendar_today
            </span>
            <input
              type="date"
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            />
          </div>
        </div>
        <div className="flex-1">
          <label className="font-body-sm text-body-sm text-on-surface-variant mb-1 block">To</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
              calendar_today
            </span>
            <input
              type="date"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export { DateRangePicker }
export type { DateRangePickerProps }
