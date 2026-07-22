"use client"

import type { FeedSession } from "@/lib/store"

interface FeedingRecordsProps {
  sessions: FeedSession[]
  onEdit: (session: FeedSession) => void
  onDelete: (session: FeedSession) => void
  activeFilter: "all" | FeedSession["feed_type"]
  filterOpen: boolean
  onToggleFilter: () => void
  onFilterChange: (filter: "all" | FeedSession["feed_type"]) => void
  onExport: () => void
}

const typeMeta: Record<string, { icon: string; label: string; className: string }> = {
  breast: { icon: "timer", label: "Breastfeed", className: "text-accent-coral" },
  bottle: { icon: "nutrition", label: "Bottle", className: "text-primary" },
  solids: { icon: "restaurant", label: "Solids", className: "text-tertiary" },
}

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function details(session: FeedSession) {
  if (session.feed_type === "breast") {
    const left = Math.round((session.left_duration_sec ?? 0) / 60)
    const right = Math.round((session.right_duration_sec ?? 0) / 60)
    return `${left + right}m (L:${left}, R:${right})`
  }
  if (session.feed_type === "bottle") return `${session.amount_ml ?? 0}ml ${session.milk_type === "formula" ? "Formula" : "Breastmilk"}`
  return [session.food_name ?? "Solids", session.quantity ? `${session.quantity}${session.quantity_unit ?? ""}` : ""].filter(Boolean).join(" · ")
}

function FeedingRecords({
  sessions,
  onEdit,
  onDelete,
  activeFilter,
  filterOpen,
  onToggleFilter,
  onFilterChange,
  onExport,
}: FeedingRecordsProps) {
  return (
    <section className="bg-white rounded-2xl p-stack-md soft-shadow overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-stack-md">
        <div>
          <h3 className="font-headline-md text-headline-md text-primary">Detailed History</h3>
          <p className="font-label-md text-label-md text-on-surface-variant">All feeding records for {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}</p>
        </div>
        <div className="flex gap-2 relative">
          <button type="button" onClick={onToggleFilter} aria-expanded={filterOpen} aria-controls="feeding-record-filter" className="flex items-center gap-1 px-3 py-2 bg-surface-container-low rounded-lg font-label-md text-label-md text-on-surface-variant"><span className="material-symbols-outlined text-sm">filter_list</span>Filter</button>
          <button type="button" onClick={onExport} className="flex items-center gap-1 px-3 py-2 bg-surface-container-low rounded-lg font-label-md text-label-md text-on-surface-variant"><span className="material-symbols-outlined text-sm">ios_share</span>Export</button>
          {filterOpen && <div id="feeding-record-filter" className="absolute right-0 top-11 z-10 w-40 rounded-xl bg-white p-2 shadow-soft border border-outline-variant/30">
            {(["all", "breast", "bottle", "solids"] as const).map((filter) => <button key={filter} type="button" onClick={() => onFilterChange(filter)} className={["w-full rounded-lg px-3 py-2 text-left font-label-md text-label-md capitalize", activeFilter === filter ? "bg-primary-container/20 text-primary" : "text-on-surface-variant hover:bg-surface-container-low"].join(" ")}>{filter === "all" ? "All records" : filter}</button>)}
          </div>}
        </div>
      </div>
      {sessions.length === 0 ? (
        <div className="py-16 text-center text-on-surface-variant"><span className="material-symbols-outlined text-4xl mb-3">restaurant</span><p className="font-body-md">No feeding records yet.</p></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left border-collapse">
            <thead><tr className="border-b border-outline-variant"><th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant">TIME</th><th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant">CATEGORY</th><th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant">DETAILS</th><th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant">NOTES</th><th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant">ACTIONS</th></tr></thead>
            <tbody className="font-body-sm text-body-sm">
              {sessions.map((session) => { const meta = typeMeta[session.feed_type] ?? typeMeta.bottle; return <tr key={session.id} className="border-b border-outline-variant/30 hover:bg-surface-container-low transition-colors"><td className="py-4 px-4 whitespace-nowrap">{time(session.started_at)}</td><td className="py-4 px-4"><span className="flex items-center gap-2"><span className={`material-symbols-outlined text-sm ${meta.className}`}>{meta.icon}</span>{meta.label}</span></td><td className="py-4 px-4">{details(session)}</td><td className="py-4 px-4 text-on-surface-variant italic max-w-[220px] truncate">{session.notes || "—"}</td><td className="py-4 px-4"><div className="flex gap-2"><button type="button" onClick={() => onEdit(session)} aria-label={`Edit ${meta.label} record`} className="text-primary hover:scale-110 transition-transform"><span className="material-symbols-outlined text-sm">edit</span></button><button type="button" onClick={() => onDelete(session)} aria-label={`Delete ${meta.label} record`} className="text-error hover:scale-110 transition-transform"><span className="material-symbols-outlined text-sm">delete</span></button></div></td></tr> })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export { FeedingRecords }
export type { FeedingRecordsProps }
