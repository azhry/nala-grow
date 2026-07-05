"use client"

import { useMemo } from "react"
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts"
import type { Measurement, UnitSystem } from "@/lib/store"

interface WhoPercentilePoint {
  age: number
  p97: number
  p85: number
  p50: number
  p15: number
  p03: number
  band_15_03: number
  band_50_15: number
  band_85_50: number
  band_97_85: number
}

interface BabyDataPoint {
  age: number
  weight: number
  date: string
}

interface WhoChartProps {
  measurements: Measurement[]
  babyDob: string
  unit: UnitSystem
  className?: string
  babyName?: string
}

function monthsSince(dateStr: string, fromStr: string): number {
  const d = new Date(dateStr)
  const from = new Date(fromStr)
  let months = (d.getFullYear() - from.getFullYear()) * 12
  months += d.getMonth() - from.getMonth()
  return Math.max(0, months + (d.getDate() - from.getDate()) / 30)
}

const whoData: WhoPercentilePoint[] = [
  { age: 0, p97: 4.3, p85: 3.8, p50: 3.3, p15: 2.9, p03: 2.5, band_15_03: 0, band_50_15: 0, band_85_50: 0, band_97_85: 0 },
  { age: 2, p97: 5.8, p85: 5.2, p50: 4.6, p15: 4.1, p03: 3.6, band_15_03: 0, band_50_15: 0, band_85_50: 0, band_97_85: 0 },
  { age: 4, p97: 7.8, p85: 7.0, p50: 6.4, p15: 5.8, p03: 5.2, band_15_03: 0, band_50_15: 0, band_85_50: 0, band_97_85: 0 },
  { age: 6, p97: 9.2, p85: 8.3, p50: 7.5, p15: 6.8, p03: 6.1, band_15_03: 0, band_50_15: 0, band_85_50: 0, band_97_85: 0 },
  { age: 8, p97: 10.2, p85: 9.2, p50: 8.4, p15: 7.6, p03: 6.9, band_15_03: 0, band_50_15: 0, band_85_50: 0, band_97_85: 0 },
  { age: 10, p97: 11.0, p85: 10.0, p50: 9.1, p15: 8.3, p03: 7.5, band_15_03: 0, band_50_15: 0, band_85_50: 0, band_97_85: 0 },
  { age: 12, p97: 11.8, p85: 10.8, p50: 9.8, p15: 9.0, p03: 8.1, band_15_03: 0, band_50_15: 0, band_85_50: 0, band_97_85: 0 },
  { age: 14, p97: 12.3, p85: 11.3, p50: 10.3, p15: 9.5, p03: 8.6, band_15_03: 0, band_50_15: 0, band_85_50: 0, band_97_85: 0 },
  { age: 16, p97: 12.8, p85: 11.8, p50: 10.8, p15: 10.0, p03: 9.1, band_15_03: 0, band_50_15: 0, band_85_50: 0, band_97_85: 0 },
  { age: 18, p97: 13.2, p85: 12.2, p50: 11.2, p15: 10.2, p03: 9.3, band_15_03: 0, band_50_15: 0, band_85_50: 0, band_97_85: 0 },
  { age: 20, p97: 13.6, p85: 12.6, p50: 11.6, p15: 10.6, p03: 9.7, band_15_03: 0, band_50_15: 0, band_85_50: 0, band_97_85: 0 },
  { age: 22, p97: 14.0, p85: 13.0, p50: 12.0, p15: 11.0, p03: 10.1, band_15_03: 0, band_50_15: 0, band_85_50: 0, band_97_85: 0 },
  { age: 24, p97: 14.5, p85: 13.5, p50: 12.5, p15: 11.5, p03: 10.5, band_15_03: 0, band_50_15: 0, band_85_50: 0, band_97_85: 0 },
]

const chartData = whoData.map((d) => ({
  age: d.age,
  p97: d.p97,
  p85: d.p85,
  p50: d.p50,
  p15: d.p15,
  p03: d.p03,
  band_15_03: d.p15 - d.p03,
  band_50_15: d.p50 - d.p15,
  band_85_50: d.p85 - d.p50,
  band_97_85: d.p97 - d.p85,
}))

interface TooltipPayloadEntry {
  dataKey?: string
  value: number
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: number
}) {
  if (!active || !payload || payload.length === 0) return null
  const babyPoint = payload.find((p) => p.dataKey === "baby")
  if (!babyPoint) return null
  return (
    <div className="rounded-2xl bg-surface-container-lowest px-4 py-3 shadow-soft border border-primary/10 text-sm">
      <p className="font-label-md text-label-md text-on-surface-variant mb-1">
        {label != null ? `${Math.round(label)} months` : ""}
      </p>
      <p className="font-headline-sm text-headline-sm text-primary">
        {babyPoint.value.toFixed(1)} kg
      </p>
    </div>
  )
}

function WhoChart({
  measurements,
  babyDob,
  unit,
  className = "",
  babyName = "Baby",
}: WhoChartProps) {
  const babyData: BabyDataPoint[] = useMemo(() => {
    const sorted = [...measurements]
      .filter((m) => m.weight_kg != null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return sorted.map((m) => ({
      age: monthsSince(m.date, babyDob),
      weight: unit === "imperial" && m.weight_kg != null
        ? m.weight_kg * 2.20462
        : m.weight_kg!,
      date: m.date,
    }))
  }, [measurements, babyDob, unit])

  const yDomain: [number, number] = unit === "imperial" ? [4, 36] : [0, 18]
  const yUnit = unit === "imperial" ? "lb" : "kg"

  const xTickFormatter = (v: number) => {
    if (v === 0) return "Birth"
    return `${v}m`
  }

  const hasData = babyData.length > 0
  const latestPoint = hasData ? babyData[babyData.length - 1] : null

  const renderDataLines = () => {
    if (!hasData) return null
    const dot = { fill: "#2f6760", r: 6, strokeWidth: 0 }
    return (
      <Line
        type="monotone"
        dataKey="baby"
        data={babyData}
        stroke="#2f6760"
        strokeWidth={3}
        dot={dot}
        activeDot={{ r: 8, fill: "#2f6760", stroke: "#fff", strokeWidth: 2 }}
        connectNulls
      />
    )
  }

  return (
    <div className={["w-full", className].join(" ")}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-headline-md text-headline-md text-primary">
            Weight-for-age Percentiles
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            WHO Standards (0-24 Months)
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-primary" />
            <span className="font-label-md text-label-md">{babyName}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-primary-container/40" />
            <span className="font-label-md text-label-md">Percentiles</span>
          </div>
        </div>
      </div>

      <div className="h-[320px] md:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7eb6ad" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#7eb6ad" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#bfc8c6"
              strokeOpacity={0.15}
              vertical={false}
            />
            <XAxis
              dataKey="age"
              tickFormatter={xTickFormatter}
              tick={{ fontSize: 12, fill: "#404947" }}
              tickLine={false}
              axisLine={{ stroke: "#bfc8c6", strokeOpacity: 0.3 }}
              domain={[0, 24]}
              type="number"
              ticks={[0, 4, 8, 12, 16, 20, 24]}
            />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 12, fill: "#404947" }}
              tickLine={false}
              axisLine={false}
              width={40}
              unit={` ${yUnit}`}
            />
            <Tooltip content={<CustomTooltip />} />

            <Area
              dataKey="p03"
              stackId="1"
              fill="none"
              stroke="none"
            />
            <Area
              dataKey="band_15_03"
              stackId="1"
              fill="url(#bandGrad)"
              stroke="none"
            />
            <Area
              dataKey="band_50_15"
              stackId="1"
              fill="url(#bandGrad)"
              stroke="none"
            />
            <Area
              dataKey="band_85_50"
              stackId="1"
              fill="url(#bandGrad)"
              stroke="none"
            />
            <Area
              dataKey="band_97_85"
              stackId="1"
              fill="url(#bandGrad)"
              stroke="none"
            />

            <Line
              type="monotone"
              dataKey="p97"
              stroke="#7eb6ad"
              strokeOpacity={0.4}
              strokeDasharray="4 4"
              strokeWidth={1}
              dot={false}
              activeDot={false}
            />
            <Line
              type="monotone"
              dataKey="p85"
              stroke="#7eb6ad"
              strokeOpacity={0.3}
              strokeWidth={1}
              dot={false}
              activeDot={false}
            />
            <Line
              type="monotone"
              dataKey="p50"
              stroke="#7eb6ad"
              strokeOpacity={0.5}
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
            />
            <Line
              type="monotone"
              dataKey="p15"
              stroke="#7eb6ad"
              strokeOpacity={0.3}
              strokeWidth={1}
              dot={false}
              activeDot={false}
            />
            <Line
              type="monotone"
              dataKey="p03"
              stroke="#7eb6ad"
              strokeOpacity={0.4}
              strokeDasharray="4 4"
              strokeWidth={1}
              dot={false}
              activeDot={false}
            />

            {renderDataLines()}

            {latestPoint && (
              <ReferenceDot
                x={latestPoint.age}
                y={latestPoint.weight}
                r={10}
                fill="#2f6760"
                fillOpacity={0.15}
                stroke="none"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between mt-3 px-2 font-label-md text-label-md text-on-surface-variant">
        <span>Birth</span>
        <span>4m</span>
        <span>8m</span>
        <span>12m</span>
        <span>16m</span>
        <span>20m</span>
        <span>24m</span>
      </div>
    </div>
  )
}

export { WhoChart }
export type { WhoChartProps }
