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
      <p className="font-label-md text-label-md text-on-surface-variant">Date Range</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <label htmlFor="export-date-from" className="font-body-sm text-body-sm text-on-surface-variant mb-1 block">From</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
              calendar_today
            </span>
            <input
              id="export-date-from"
              type="date"
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
              className="h-12 w-full min-w-0 rounded-xl border border-outline-variant bg-surface-container-low pl-10 pr-4 font-body-md text-body-md text-on-surface transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor="export-date-to" className="font-body-sm text-body-sm text-on-surface-variant mb-1 block">To</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
              calendar_today
            </span>
            <input
              id="export-date-to"
              type="date"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
              className="h-12 w-full min-w-0 rounded-xl border border-outline-variant bg-surface-container-low pl-10 pr-4 font-body-md text-body-md text-on-surface transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export { DateRangePicker }
export type { DateRangePickerProps }
