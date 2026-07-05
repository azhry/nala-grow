"use client"

interface SolidsFormProps {
  foodName: string
  quantity: number
  quantityUnit: string
  reaction: string
  notes: string
  onFoodNameChange: (val: string) => void
  onQuantityChange: (val: number) => void
  onQuantityUnitChange: (val: string) => void
  onReactionChange: (val: string) => void
  onNotesChange: (val: string) => void
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

function SolidsForm({
  foodName,
  quantity,
  quantityUnit,
  reaction,
  notes,
  onFoodNameChange,
  onQuantityChange,
  onQuantityUnitChange,
  onReactionChange,
  onNotesChange,
}: SolidsFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="font-label-md text-label-md text-on-surface-variant">
          Food Name
        </label>
        <input
          type="text"
          value={foodName}
          onChange={(e) => onFoodNameChange(e.target.value)}
          placeholder="e.g. Sweet Potato"
          className="w-full h-field px-gutter bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 font-body-md text-body-md outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-gutter">
        <div className="space-y-2">
          <label className="font-label-md text-label-md text-on-surface-variant">
            Quantity
          </label>
          <div className="relative flex items-center">
            <input
              type="number"
              min={0}
              step={0.5}
              value={quantity || ""}
              onChange={(e) => onQuantityChange(Math.max(0, Number(e.target.value)))}
              placeholder="0"
              className="w-full h-field pl-gutter pr-14 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 font-body-md text-body-md outline-none"
            />
            <select
              value={quantityUnit}
              onChange={(e) => onQuantityUnitChange(e.target.value)}
              className="absolute right-2 h-10 bg-transparent border-none text-primary font-bold font-label-md text-label-md focus:ring-0 outline-none cursor-pointer"
            >
              <option value="tbsp">tbsp</option>
              <option value="oz">oz</option>
              <option value="g">g</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="font-label-md text-label-md text-on-surface-variant">
            Time
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
              schedule
            </span>
            <input
              type="time"
              defaultValue={new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              className="w-full h-field px-gutter bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 font-body-md text-body-md outline-none"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="font-label-md text-label-md text-on-surface-variant">
          Reaction
        </label>
        <div className="grid grid-cols-2 gap-2">
          {reactions.map((r) => {
            const selected = reaction === r.value
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => onReactionChange(r.value)}
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

      <div className="space-y-2">
        <label className="font-label-md text-label-md text-on-surface-variant">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Any new flavors?"
          className="w-full h-20 p-gutter bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 font-body-md text-body-md resize-none outline-none"
        />
      </div>
    </div>
  )
}

SolidsForm.displayName = "SolidsForm"

export { SolidsForm }
export type { SolidsFormProps }
