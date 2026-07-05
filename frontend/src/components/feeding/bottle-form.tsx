"use client"

interface BottleFormProps {
  amountMl: number
  milkType: "breast_milk" | "formula" | "water"
  temperature: "cold" | "room" | "warm"
  notes: string
  onAmountChange: (val: number) => void
  onMilkTypeChange: (val: "breast_milk" | "formula" | "water") => void
  onTemperatureChange: (val: "cold" | "room" | "warm") => void
  onNotesChange: (val: string) => void
}

const milkTypeLabels: Record<string, string> = {
  breast_milk: "Breast Milk",
  formula: "Formula",
  water: "Water",
}

const temperatureConfig = [
  { value: "cold" as const, icon: "ac_unit", label: "Cold" },
  { value: "room" as const, icon: "thermostat", label: "Room" },
  { value: "warm" as const, icon: "mode_heat", label: "Warm" },
]

function BottleForm({
  amountMl,
  milkType,
  temperature,
  notes,
  onAmountChange,
  onMilkTypeChange,
  onTemperatureChange,
  onNotesChange,
}: BottleFormProps) {
  const adjustVolume = (delta: number) => {
    const next = Math.max(0, Math.min(300, amountMl + delta))
    onAmountChange(next)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="font-label-md text-label-md text-on-surface-variant">
          Amount
        </label>
        <div className="flex items-center gap-gutter">
          <input
            type="range"
            min={0}
            max={300}
            step={5}
            value={amountMl}
            onChange={(e) => onAmountChange(Number(e.target.value))}
            className="flex-1 h-2 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-primary"
          />
          <span className="font-headline-md text-headline-md text-primary min-w-[3rem] text-right">
            {amountMl}
            <span className="font-label-md text-label-md text-primary-container ml-1">ml</span>
          </span>
        </div>
        <div className="flex justify-between px-1 text-on-surface-variant font-label-md text-label-md">
          <span>0ml</span>
          <span>100ml</span>
          <span>200ml</span>
          <span>300ml</span>
        </div>
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={() => adjustVolume(-10)}
            className="flex-1 py-3 border-2 border-primary/20 rounded-xl font-bold text-primary active:scale-95 transition-transform font-label-md text-label-md"
          >
            -10ml
          </button>
          <button
            type="button"
            onClick={() => adjustVolume(10)}
            className="flex-1 py-3 border-2 border-primary/20 rounded-xl font-bold text-primary active:scale-95 transition-transform font-label-md text-label-md"
          >
            +10ml
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="font-label-md text-label-md text-on-surface-variant">
          Type
        </label>
        <div className="flex flex-col gap-2">
          {(["breast_milk", "formula", "water"] as const).map((type) => (
            <label
              key={type}
              className={[
                "flex items-center justify-between p-gutter bg-surface-container rounded-xl cursor-pointer border-2 transition-all",
                milkType === type
                  ? "border-primary bg-primary-container/10"
                  : "border-transparent",
              ].join(" ")}
            >
              <span className="font-body-md text-body-md text-on-surface">
                {milkTypeLabels[type]}
              </span>
              <input
                type="radio"
                name="milkType"
                value={type}
                checked={milkType === type}
                onChange={() => onMilkTypeChange(type)}
                className="hidden"
              />
              <span
                className={[
                  "material-symbols-outlined text-primary transition-opacity",
                  milkType === type ? "opacity-100" : "opacity-0",
                ].join(" ")}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="font-label-md text-label-md text-on-surface-variant">
          Temperature
        </label>
        <div className="flex gap-2">
          {temperatureConfig.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onTemperatureChange(t.value)}
              className={[
                "flex-1 flex flex-col items-center gap-2 py-3 rounded-2xl transition-all active:scale-95 border-2",
                temperature === t.value
                  ? "border-primary bg-primary-container/20 text-primary"
                  : "border-transparent bg-surface-container text-on-surface-variant hover:bg-surface-variant",
              ].join(" ")}
            >
              <span className="material-symbols-outlined">{t.icon}</span>
              <span className="font-label-md text-label-md">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="font-label-md text-label-md text-on-surface-variant">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="How did it go?"
          className="w-full h-20 p-gutter bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 font-body-md text-body-md resize-none outline-none"
        />
      </div>
    </div>
  )
}

BottleForm.displayName = "BottleForm"

export { BottleForm }
export type { BottleFormProps }
