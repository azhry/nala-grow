"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { useAppStore } from "@/lib/store"
import type {
  FeedSession,
  FeedType,
  MilkType,
  FeedTemperature,
} from "@/lib/store"
import { createFeedSession, deleteFeedSession, fetchFeedSessions, updateFeedSession } from "@/lib/feeding-service"
import { downloadCsv, generateCsv } from "@/lib/export-utils"
import { DailySummary, FeedingRecords, FeedingTimeline } from "@/components/feeding"
import { BreastTimer } from "@/components/feeding"
import { BottleForm } from "@/components/feeding"
import { SolidsForm } from "@/components/feeding"
import { AppHeader } from "@/components/layout/app-header"

function getDateRange(daysAgo = 0): [Date, Date] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo)
  const end = new Date(start.getTime() + 86400000)
  return [start, end]
}

const reactions = [
  { value: "loved", icon: "favorite", label: "Loved it", tone: "primary" },
  { value: "interested", icon: "sentiment_satisfied", label: "Interested", tone: "neutral" },
  { value: "disliked", icon: "sentiment_dissatisfied", label: "Disliked", tone: "neutral" },
  { value: "reaction", icon: "warning", label: "Reaction", tone: "error" },
]

const toneClasses: Record<string, string> = {
  primary: "bg-primary-container/20 border-primary text-primary",
  neutral: "bg-surface border-transparent hover:border-primary-container text-on-surface-variant",
  error: "bg-surface border-transparent hover:border-error-container hover:bg-error-container/10 text-error",
}

const selectedClasses: Record<string, string> = {
  primary: "bg-primary-container/20 border-primary",
  neutral: "bg-primary-container/20 border-primary",
  error: "bg-error-container/20 border-error",
}

export default function FeedingPage() {
  const activeBaby = useAppStore((s) => s.activeBaby)
  const feedSessions = useAppStore((s) => s.feedSessions)
  useEffect(() => {
    if (activeBaby?.id) {
      fetchFeedSessions(activeBaby.id).catch(() => {})
    }
  }, [activeBaby?.id])

  const babyId = activeBaby?.id ?? "sample"
  const babyName = activeBaby?.name ?? "Lily"

  const [activeTab, setActiveTab] = useState<FeedType>("breast")
  const [summaryRange, setSummaryRange] = useState<"today" | "yesterday">("today")
  const [view, setView] = useState<"overview" | "records">("overview")
  const [editingSession, setEditingSession] = useState<FeedSession | null>(null)
  const [deletingSession, setDeletingSession] = useState<FeedSession | null>(null)
  const [editNotes, setEditNotes] = useState("")
  const [editLeftDuration, setEditLeftDuration] = useState(0)
  const [editRightDuration, setEditRightDuration] = useState(0)
  const [editAmountMl, setEditAmountMl] = useState(0)
  const [editMilkType, setEditMilkType] = useState<MilkType>("breast_milk")
  const [editTemperature, setEditTemperature] = useState<FeedTemperature>("room")
  const [editFoodName, setEditFoodName] = useState("")
  const [editQuantity, setEditQuantity] = useState(0)
  const [editQuantityUnit, setEditQuantityUnit] = useState("tbsp")
  const [editReaction, setEditReaction] = useState("")
  const [recordFilter, setRecordFilter] = useState<"all" | FeedType>("all")
  const [filterOpen, setFilterOpen] = useState(false)
  const [feedPanelOpen, setFeedPanelOpen] = useState(true)
  const [statusMessage, setStatusMessage] = useState("")
  const [saveError, setSaveError] = useState("")

  const [runningSide, setRunningSide] = useState<"left" | "right" | null>(null)
  const [leftSeconds, setLeftSeconds] = useState(0)
  const [rightSeconds, setRightSeconds] = useState(0)
  const [manualDuration, setManualDuration] = useState(0)

  const [bottleAmount, setBottleAmount] = useState(120)
  const [milkType, setMilkType] = useState<MilkType>("breast_milk")
  const [temperature, setTemperature] = useState<FeedTemperature>("room")
  const [bottleNotes, setBottleNotes] = useState("")

  const [foodName, setFoodName] = useState("")
  const [quantity, setQuantity] = useState(0)
  const [quantityUnit, setQuantityUnit] = useState("tbsp")
  const [reaction, setReaction] = useState("")
  const [solidsNotes, setSolidsNotes] = useState("")
  const [breastNotes, setBreastNotes] = useState("")

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (runningSide) {
      intervalRef.current = setInterval(() => {
        if (runningSide === "left") {
          setLeftSeconds((s) => s + 1)
        } else {
          setRightSeconds((s) => s + 1)
        }
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [runningSide])

  const toggleSide = useCallback(
    (side: "left" | "right") => {
      if (runningSide === side) {
        setRunningSide(null)
      } else {
        setRunningSide(side)
      }
    },
    [runningSide],
  )

  const rangeSessions = useMemo(() => {
    const [start, end] = getDateRange(summaryRange === "yesterday" ? 1 : 0)
    return feedSessions
      .filter((s) => s.baby_id === babyId)
      .filter((s) => {
        const d = new Date(s.started_at)
        return d >= start && d < end
      })
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
  }, [feedSessions, babyId, summaryRange])

  const bottleTotalMl = useMemo(
    () =>
      rangeSessions
        .filter((s) => s.feed_type === "bottle")
        .reduce((acc, s) => acc + (s.amount_ml ?? 0), 0),
    [rangeSessions],
  )

  const breastTotalMins = useMemo(
    () =>
      rangeSessions
        .filter((s) => s.feed_type === "breast")
        .reduce(
          (acc, s) =>
            acc + Math.round(((s.left_duration_sec ?? 0) + (s.right_duration_sec ?? 0)) / 60),
          0,
        ),
    [rangeSessions],
  )

  const barData = useMemo(() => {
    const slots = ["12 AM", "3 AM", "6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM"]
    const bottleChartMaximumMl = 250
    const maxBreastMinutes = Math.max(
      ...rangeSessions
        .filter((s) => s.feed_type === "breast")
        .map((s) => ((s.left_duration_sec ?? 0) + (s.right_duration_sec ?? 0)) / 60),
      1,
    )
    return slots.map((label, i) => {
      const hour = i * 3
      const sessionsInSlot = rangeSessions.filter((s) => {
        const h = new Date(s.started_at).getHours()
        return h >= hour && h < hour + 3
      })
      const bottleTotal = sessionsInSlot
        .filter((s) => s.feed_type === "bottle")
        .reduce((acc, s) => acc + (s.amount_ml ?? 0), 0)
      const breastMinutes = sessionsInSlot
        .filter((s) => s.feed_type === "breast")
        .reduce((acc, s) => acc + ((s.left_duration_sec ?? 0) + (s.right_duration_sec ?? 0)) / 60, 0)
      return {
        label,
        bottleHeightPct: bottleTotal ? Math.min(100, Math.round((bottleTotal / bottleChartMaximumMl) * 100)) : 0,
        bottleTitle: `${label}: ${bottleTotal}ml`,
        breastHeightPct: breastMinutes ? Math.max(5, (breastMinutes / maxBreastMinutes) * 100) : 0,
        breastTitle: `${label}: ${Math.round(breastMinutes)} min breastfeed`,
      }
    })
  }, [rangeSessions])

  const lastFeedTime = useMemo(() => {
    if (rangeSessions.length === 0) return null
    const sorted = [...rangeSessions].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    )
    return new Date(sorted[0].started_at)
  }, [rangeSessions])

  const hoursSinceLastFeed = useMemo(() => {
    if (!lastFeedTime) return null
    return (Date.now() - lastFeedTime.getTime()) / 3600000
  }, [lastFeedTime])

  const handleSaveBreast = async () => {
    const totalSec = leftSeconds + rightSeconds
    if (totalSec === 0 && manualDuration === 0) return

    setSaveError("")
    try {
      await createFeedSession({
        baby_id: babyId,
        feed_type: "breast",
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        left_duration_sec: manualDuration > 0 ? manualDuration * 60 : leftSeconds,
        right_duration_sec: manualDuration > 0 ? 0 : rightSeconds,
        notes: breastNotes || undefined,
      })
    } catch {
      setSaveError("Unable to save this feeding entry. Your details are still here; check your connection and try again.")
      return
    }

    setRunningSide(null)
    setLeftSeconds(0)
    setRightSeconds(0)
    setManualDuration(0)
    setBreastNotes("")
  }

  const handleSaveBottle = async () => {
    setSaveError("")
    try {
      await createFeedSession({
        baby_id: babyId,
        feed_type: "bottle",
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        amount_ml: bottleAmount,
        milk_type: milkType,
        temperature,
        notes: bottleNotes || undefined,
      })
    } catch {
      setSaveError("Unable to save this feeding entry. Your details are still here; check your connection and try again.")
      return
    }

    setBottleAmount(120)
    setMilkType("breast_milk")
    setTemperature("room")
    setBottleNotes("")
  }

  const handleSaveSolids = async () => {
    if (!foodName.trim()) return

    setSaveError("")
    try {
      await createFeedSession({
        baby_id: babyId,
        feed_type: "solids",
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        food_name: foodName,
        quantity: quantity || undefined,
        quantity_unit: quantityUnit,
        reaction: (reaction as FeedSession["reaction"]) || undefined,
        notes: solidsNotes || undefined,
      })
    } catch {
      setSaveError("Unable to save this feeding entry. Your details are still here; check your connection and try again.")
      return
    }

    setFoodName("")
    setQuantity(0)
    setQuantityUnit("tbsp")
    setReaction("")
    setSolidsNotes("")
  }

  const timelineSessions = rangeSessions

  const openEdit = (session: FeedSession) => {
    setEditingSession(session)
    setEditNotes(session.notes ?? "")
    setEditLeftDuration(session.left_duration_sec ?? 0)
    setEditRightDuration(session.right_duration_sec ?? 0)
    setEditAmountMl(session.amount_ml ?? 0)
    setEditMilkType((session.milk_type ?? "breast_milk") as MilkType)
    setEditTemperature((session.temperature ?? "room") as FeedTemperature)
    setEditFoodName(session.food_name ?? "")
    setEditQuantity(session.quantity ?? 0)
    setEditQuantityUnit(session.quantity_unit ?? "tbsp")
    setEditReaction(session.reaction ?? "")
  }

  const saveEdit = async () => {
    if (!editingSession) return
    setSaveError("")
    try {
      const updates: Partial<FeedSession> = { notes: editNotes }
      if (editingSession.feed_type === "breast") {
        updates.left_duration_sec = editLeftDuration
        updates.right_duration_sec = editRightDuration
      } else if (editingSession.feed_type === "bottle") {
        updates.amount_ml = editAmountMl
        updates.milk_type = editMilkType
        updates.temperature = editTemperature
      } else if (editingSession.feed_type === "solids") {
        updates.food_name = editFoodName
        updates.quantity = editQuantity
        updates.quantity_unit = editQuantityUnit
        updates.reaction = editReaction as FeedSession["reaction"]
      }
      await updateFeedSession(editingSession.id, updates)
    } catch {
      setSaveError("Unable to update this feeding entry. Your changes are still here; try again.")
      return
    }
    setEditingSession(null)
  }

  const confirmDelete = async () => {
    if (!deletingSession) return
    setSaveError("")
    try {
      await deleteFeedSession(deletingSession.id)
    } catch {
      setSaveError("Unable to delete this feeding entry. It has not been removed; try again.")
      return
    }
    setDeletingSession(null)
  }

  const recordsForBaby = useMemo(() => feedSessions
    .filter((session) => session.baby_id === babyId)
    .filter((session) => recordFilter === "all" || session.feed_type === recordFilter)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()), [babyId, feedSessions, recordFilter])

  const handleFilterChange = (filter: "all" | FeedType) => {
    setRecordFilter(filter)
    setFilterOpen(false)
  }

  const handleExportRecords = () => {
    const csv = generateCsv({ baby: activeBaby, feedSessions: recordsForBaby, sleepSessions: [], measurements: [], milestones: [], dateRange: { from: "", to: "" } })
    downloadCsv(csv, `${babyName.toLowerCase().replace(/\s+/g, "-")}-feeding-records.csv`)
    setStatusMessage("Feeding records exported")
  }

  return (
    <div className="min-h-full bg-surface pb-stack-lg">
      <AppHeader />
      <div className="w-full max-w-7xl mx-auto p-container-margin lg:p-stack-lg">
        <div className="mb-stack-md">
          <h1 className="font-headline-lg text-headline-lg text-primary">Feeding Log</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Track {babyName}&apos;s nourishment and growth journey.
          </p>
        </div>

        {hoursSinceLastFeed !== null && hoursSinceLastFeed > 4 && (
          <div className="mb-stack-md p-gutter bg-error-container/20 border border-error-container/30 rounded-2xl flex items-center gap-3">
            <span className="material-symbols-outlined text-error">schedule</span>
            <p className="font-body-sm text-body-sm text-on-error-container">
              It&apos;s been over {Math.floor(hoursSinceLastFeed)} hours since {babyName}&apos;s last
              feed.
            </p>
          </div>
        )}

        <div className="mb-stack-md flex gap-4 border-b border-outline-variant" role="tablist" aria-label="Feeding views">
          {(["overview", "records"] as const).map((tab) => (
            <button key={tab} type="button" role="tab" aria-selected={view === tab} onClick={() => setView(tab)} className={["px-5 py-3 font-headline-sm text-headline-sm border-b-4 capitalize transition-all", view === tab ? "text-primary border-primary" : "border-transparent text-on-surface-variant opacity-60 hover:opacity-100"].join(" ")}>{tab}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-md">
          <div className="lg:col-span-8 space-y-stack-md">
            {view === "overview" ? <><DailySummary bottleTotalMl={bottleTotalMl} breastTotalMins={breastTotalMins} barData={barData} range={summaryRange} onRangeChange={setSummaryRange} /><FeedingTimeline sessions={timelineSessions} rangeLabel={summaryRange === "today" ? "Today" : "Yesterday"} onViewHistory={() => setView("records")} /></> : <FeedingRecords sessions={recordsForBaby} onEdit={openEdit} onDelete={setDeletingSession} activeFilter={recordFilter} filterOpen={filterOpen} onToggleFilter={() => setFilterOpen((open) => !open)} onFilterChange={handleFilterChange} onExport={handleExportRecords} />}
          </div>

          <aside className="lg:col-span-4 lg:sticky lg:top-stack-lg h-fit">
          {feedPanelOpen ? <section className="min-h-[460px] bg-white rounded-2xl p-stack-md soft-shadow flex flex-col">
            <div className="flex justify-between items-center mb-stack-md">
              <h3 className="font-headline-md text-headline-md text-primary">Record Feed</h3>
              <button
                type="button"
                onClick={() => setFeedPanelOpen(false)}
                aria-label="Close feed entry"
                className="text-on-surface-variant opacity-60 transition-opacity hover:opacity-100"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex bg-surface-container-low rounded-xl p-1 mb-stack-md">
              {(["breast", "bottle", "solids"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={[
                    "flex-1 py-2 rounded-lg font-label-md text-label-md transition-all",
                    activeTab === tab
                      ? "bg-white text-primary font-bold shadow-sm"
                      : "text-on-surface-variant hover:bg-white/50",
                  ].join(" ")}
                >
                  {tab === "breast" ? "Breast" : tab === "bottle" ? "Bottle" : "Solids"}
                </button>
              ))}
            </div>

            <div className="flex-1 space-y-4">
              {activeTab === "breast" && (
                <>
                  <BreastTimer
                    runningSide={runningSide}
                    leftSeconds={leftSeconds}
                    rightSeconds={rightSeconds}
                    onToggleSide={toggleSide}
                    onManualDurationChange={setManualDuration}
                    manualDuration={manualDuration}
                  />
                  <div className="space-y-2">
                    <label className="font-label-md text-label-md text-on-surface-variant">
                      Notes
                    </label>
                    <textarea
                      value={breastNotes}
                      onChange={(e) => setBreastNotes(e.target.value)}
                      placeholder="Any observations?"
                      className="w-full h-20 p-gutter bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 font-body-md text-body-md resize-none outline-none"
                    />
                  </div>
                </>
              )}

              {activeTab === "bottle" && (
                <BottleForm
                  amountMl={bottleAmount}
                  milkType={milkType}
                  temperature={temperature}
                  notes={bottleNotes}
                  onAmountChange={setBottleAmount}
                  onMilkTypeChange={setMilkType}
                  onTemperatureChange={setTemperature}
                  onNotesChange={setBottleNotes}
                />
              )}

              {activeTab === "solids" && (
                <SolidsForm
                  foodName={foodName}
                  quantity={quantity}
                  quantityUnit={quantityUnit}
                  reaction={reaction}
                  notes={solidsNotes}
                  onFoodNameChange={setFoodName}
                  onQuantityChange={setQuantity}
                  onQuantityUnitChange={setQuantityUnit}
                  onReactionChange={setReaction}
                  onNotesChange={setSolidsNotes}
                />
              )}
            </div>

            <button
              type="button"
              onClick={
                activeTab === "breast"
                  ? handleSaveBreast
                  : activeTab === "bottle"
                    ? handleSaveBottle
                    : handleSaveSolids
              }
              className="w-full mt-6 py-4 bg-primary text-white rounded-2xl font-headline-sm shadow-md hover:scale-[0.98] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">check_circle</span>
              Save Entry
            </button>
          </section>
          : <button type="button" onClick={() => setFeedPanelOpen(true)} className="w-full rounded-2xl bg-primary py-4 text-on-primary font-headline-sm text-headline-sm shadow-md"><span className="material-symbols-outlined mr-2">add</span>Log a feed</button>}
          </aside>
        </div>
      </div>
      {saveError && (
        <div role="alert" className="fixed top-6 left-1/2 z-[70] w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-error-container bg-error-container p-3 font-body-sm text-body-sm text-on-error-container shadow-soft">
          {saveError}
        </div>
      )}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-container-margin bg-primary/20 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="edit-heading">
          <div className="w-full max-w-lg bg-white rounded-[24px] soft-shadow overflow-hidden">
            <div className="p-6 bg-surface-container-low flex items-center justify-between">
              <div>
                <h2 id="edit-heading" className="font-headline-md text-headline-md">Edit Feed Entry</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{new Date(editingSession.started_at).toLocaleString()}</p>
              </div>
              <button type="button" onClick={() => setEditingSession(null)} aria-label="Close edit dialog" className="p-2 rounded-full hover:bg-surface-container-high"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-surface-container-low p-4">
                <p className="font-label-md text-label-md text-primary uppercase">{editingSession.feed_type} entry</p>
                <p className="font-body-md text-body-md">Update the details below.</p>
              </div>

              {editingSession.feed_type === "breast" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-gutter">
                    <div className="space-y-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">Left (sec)</label>
                      <input type="number" min={0} value={editLeftDuration} onChange={(e) => setEditLeftDuration(Math.max(0, Number(e.target.value)))} className="w-full h-field px-gutter bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 font-body-md text-body-md outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">Right (sec)</label>
                      <input type="number" min={0} value={editRightDuration} onChange={(e) => setEditRightDuration(Math.max(0, Number(e.target.value)))} className="w-full h-field px-gutter bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 font-body-md text-body-md outline-none" />
                    </div>
                  </div>
                </div>
              )}

              {editingSession.feed_type === "bottle" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="font-label-md text-label-md text-on-surface-variant">Amount (ml)</label>
                    <input type="number" min={0} max={300} value={editAmountMl} onChange={(e) => setEditAmountMl(Math.max(0, Math.min(300, Number(e.target.value))))} className="w-full h-field px-gutter bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 font-body-md text-body-md outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-label-md text-on-surface-variant">Milk Type</label>
                    <div className="flex gap-2">
                      {(["breast_milk", "formula", "water"] as const).map((type) => (
                        <button key={type} type="button" onClick={() => setEditMilkType(type)} className={["flex-1 py-3 rounded-xl font-label-md transition-all border-2", editMilkType === type ? "border-primary bg-primary-container/10 text-primary" : "border-transparent text-on-surface-variant hover:bg-surface-container"].join(" ")}>{type === "breast_milk" ? "Breast Milk" : type === "formula" ? "Formula" : "Water"}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-label-md text-on-surface-variant">Temperature</label>
                    <div className="flex gap-2">
                      {(["cold", "room", "warm"] as const).map((temp) => (
                        <button key={temp} type="button" onClick={() => setEditTemperature(temp)} className={["flex-1 flex flex-col items-center gap-1 py-3 rounded-xl font-label-md transition-all border-2", editTemperature === temp ? "border-primary bg-primary-container/10 text-primary" : "border-transparent text-on-surface-variant hover:bg-surface-container"].join(" ")}><span className="material-symbols-outlined text-sm">{temp === "cold" ? "ac_unit" : temp === "room" ? "thermostat" : "mode_heat"}</span>{temp}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {editingSession.feed_type === "solids" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="font-label-md text-label-md text-on-surface-variant">Food Name</label>
                    <input type="text" value={editFoodName} onChange={(e) => setEditFoodName(e.target.value)} placeholder="e.g. Sweet Potato" className="w-full h-field px-gutter bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 font-body-md text-body-md outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-gutter">
                    <div className="space-y-2">
                      <label className="font-label-md text-label-md text-on-surface-variant">Quantity</label>
                      <div className="relative flex items-center">
                        <input type="number" min={0} step={0.5} value={editQuantity || ""} onChange={(e) => setEditQuantity(Math.max(0, Number(e.target.value)))} placeholder="0" className="w-full h-field pl-gutter pr-14 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 font-body-md text-body-md outline-none" />
                        <select value={editQuantityUnit} onChange={(e) => setEditQuantityUnit(e.target.value)} className="absolute right-2 h-10 bg-transparent border-none text-primary font-bold font-label-md text-label-md focus:ring-0 outline-none cursor-pointer"><option value="tbsp">tbsp</option><option value="oz">oz</option><option value="g">g</option></select>
                      </div>
                    </div>
                      <div className="space-y-2">
                        <label className="font-label-md text-label-md text-on-surface-variant">Reaction</label>
                        <div className="grid grid-cols-2 gap-2">
                          {reactions.map((r) => {
                            const selected = editReaction === r.value
                            return (
                              <button
                                key={r.value}
                                type="button"
                                onClick={() => setEditReaction(r.value)}
                                className={[
                                  "flex items-center justify-center gap-2 py-3 px-2 rounded-xl border-2 transition-all active:scale-95",
                                  selected ? selectedClasses[r.tone] : toneClasses[r.tone],
                                ].join(" ")}
                              >
                                <span
                                  className="material-symbols-outlined text-sm"
                                  style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                  {r.icon}
                                </span>
                                <span className="font-label-md text-label-md">{r.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="font-label-md text-label-md text-primary uppercase">Notes</label>
                <textarea value={editNotes} onChange={(event) => setEditNotes(event.target.value)} placeholder="Any observations?" className="mt-2 w-full h-24 p-gutter rounded-xl bg-surface-container-high border-none outline-none focus:ring-2 focus:ring-primary/20 font-body-md text-body-md resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingSession(null)} className="flex-1 py-3 rounded-full border-2 border-primary-container text-primary font-headline-sm">Cancel</button>
                <button type="button" onClick={saveEdit} className="flex-1 py-3 rounded-full bg-primary-container text-on-primary-container font-headline-sm">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deletingSession && <div className="fixed inset-0 z-[60] flex items-center justify-center p-container-margin bg-primary/20 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-heading"><div className="w-full max-w-sm bg-white rounded-[24px] p-stack-md soft-shadow text-center"><div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error-container/40 text-error flex items-center justify-center"><span className="material-symbols-outlined text-[32px]">delete_forever</span></div><h2 id="delete-heading" className="font-headline-sm text-headline-sm mb-2">Delete this record?</h2><p className="font-body-md text-body-md text-on-surface-variant mb-stack-md">This feeding record will be permanently removed.</p><button type="button" onClick={confirmDelete} className="w-full py-3 rounded-full bg-error text-white font-headline-sm mb-2">Delete</button><button type="button" onClick={() => setDeletingSession(null)} className="w-full py-3 rounded-full text-primary font-label-md text-label-md">Cancel</button></div></div>}
      {statusMessage && <div role="status" className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-inverse-surface px-5 py-3 text-body-sm text-inverse-on-surface shadow-soft">{statusMessage}</div>}
    </div>
  )
}
