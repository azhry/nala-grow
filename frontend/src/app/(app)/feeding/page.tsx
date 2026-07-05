"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { useAppStore } from "@/lib/store"
import type {
  FeedSession,
  FeedType,
  MilkType,
  FeedTemperature,
} from "@/lib/store"
import { DailySummary, FeedingTimeline } from "@/components/feeding"
import { BreastTimer } from "@/components/feeding"
import { BottleForm } from "@/components/feeding"
import { SolidsForm } from "@/components/feeding"

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getTodayRange(): [Date, Date] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start.getTime() + 86400000)
  return [start, end]
}

export default function FeedingPage() {
  const activeBaby = useAppStore((s) => s.activeBaby)
  const feedSessions = useAppStore((s) => s.feedSessions)
  const addFeedSession = useAppStore((s) => s.addFeedSession)

  const babyId = activeBaby?.id ?? "sample"
  const babyName = activeBaby?.name ?? "Lily"

  const [activeTab, setActiveTab] = useState<FeedType>("breast")

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

  const todaySessions = useMemo(() => {
    const [start, end] = getTodayRange()
    return feedSessions
      .filter((s) => s.baby_id === babyId)
      .filter((s) => {
        const d = new Date(s.started_at)
        return d >= start && d < end
      })
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
  }, [feedSessions, babyId])

  const bottleTotalMl = useMemo(
    () =>
      todaySessions
        .filter((s) => s.feed_type === "bottle")
        .reduce((acc, s) => acc + (s.amount_ml ?? 0), 0),
    [todaySessions],
  )

  const breastTotalMins = useMemo(
    () =>
      todaySessions
        .filter((s) => s.feed_type === "breast")
        .reduce(
          (acc, s) =>
            acc + Math.round(((s.left_duration_sec ?? 0) + (s.right_duration_sec ?? 0)) / 60),
          0,
        ),
    [todaySessions],
  )

  const barData = useMemo(() => {
    const slots = ["6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM"]
    const maxMl = Math.max(
      ...todaySessions.filter((s) => s.feed_type === "bottle").map((s) => s.amount_ml ?? 0),
      1,
    )
    return slots.map((label, i) => {
      const hour = (i * 3 + 6) % 24
      const total = todaySessions
        .filter((s) => s.feed_type === "bottle")
        .filter((s) => {
          const h = new Date(s.started_at).getHours()
          return h >= hour && h < hour + 3
        })
        .reduce((acc, s) => acc + (s.amount_ml ?? 0), 0)
      return { label, heightPct: Math.max(5, (total / maxMl) * 100), title: `${label}: ${total}ml` }
    })
  }, [todaySessions])

  const lastFeedTime = useMemo(() => {
    if (todaySessions.length === 0) return null
    const sorted = [...todaySessions].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    )
    return new Date(sorted[0].started_at)
  }, [todaySessions])

  const hoursSinceLastFeed = useMemo(() => {
    if (!lastFeedTime) return null
    return (Date.now() - lastFeedTime.getTime()) / 3600000
  }, [lastFeedTime])

  const handleSaveBreast = () => {
    const totalSec = leftSeconds + rightSeconds
    if (totalSec === 0 && manualDuration === 0) return

    addFeedSession({
      id: generateId(),
      baby_id: babyId,
      feed_type: "breast",
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      left_duration_sec: manualDuration > 0 ? manualDuration * 60 : leftSeconds,
      right_duration_sec: manualDuration > 0 ? 0 : rightSeconds,
      notes: breastNotes || undefined,
    })

    setRunningSide(null)
    setLeftSeconds(0)
    setRightSeconds(0)
    setManualDuration(0)
    setBreastNotes("")
  }

  const handleSaveBottle = () => {
    addFeedSession({
      id: generateId(),
      baby_id: babyId,
      feed_type: "bottle",
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      amount_ml: bottleAmount,
      milk_type: milkType,
      temperature,
      notes: bottleNotes || undefined,
    })

    setBottleAmount(120)
    setMilkType("breast_milk")
    setTemperature("room")
    setBottleNotes("")
  }

  const handleSaveSolids = () => {
    if (!foodName.trim()) return

    addFeedSession({
      id: generateId(),
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

    setFoodName("")
    setQuantity(0)
    setQuantityUnit("tbsp")
    setReaction("")
    setSolidsNotes("")
  }

  const timelineSessions = useMemo(() => {
    const twentyFourHrsAgo = new Date(Date.now() - 86400000)
    return feedSessions
      .filter((s) => s.baby_id === babyId)
      .filter((s) => new Date(s.started_at) >= twentyFourHrsAgo)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
  }, [feedSessions, babyId])

  return (
    <div className="pb-stack-lg">
      <div className="px-container-margin md:px-stack-lg py-stack-md max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-stack-lg">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary">Feeding Log</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Track {babyName}&apos;s nourishment and growth journey.
            </p>
          </div>
          <div className="flex items-center gap-base">
            <button
              type="button"
              className="p-3 bg-white rounded-full soft-shadow text-primary hover:bg-primary-container/10 transition-colors"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="w-10 h-10 rounded-full border-2 border-primary-container overflow-hidden soft-shadow bg-primary-container/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">child_care</span>
            </div>
          </div>
        </header>

        {hoursSinceLastFeed !== null && hoursSinceLastFeed > 4 && (
          <div className="mb-stack-md p-gutter bg-error-container/20 border border-error-container/30 rounded-2xl flex items-center gap-3">
            <span className="material-symbols-outlined text-error">schedule</span>
            <p className="font-body-sm text-body-sm text-on-error-container">
              It&apos;s been over {Math.floor(hoursSinceLastFeed)} hours since {babyName}&apos;s last
              feed.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-md">
          <DailySummary
            bottleTotalMl={bottleTotalMl}
            breastTotalMins={breastTotalMins}
            barData={barData}
          />

          <section className="lg:col-span-4 bg-white rounded-2xl p-stack-md soft-shadow flex flex-col">
            <div className="flex justify-between items-center mb-stack-md">
              <h3 className="font-headline-md text-headline-md text-primary">Record Feed</h3>
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

          <FeedingTimeline sessions={timelineSessions} />
        </div>
      </div>
    </div>
  )
}
