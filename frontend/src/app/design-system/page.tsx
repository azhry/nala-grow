"use client"

import { useState } from "react"
import {
  Button,
  Input,
  Card,
  Chip,
  Avatar,
  SegmentedControl,
  Spinner,
  ProgressBar,
  FAB,
  Timer,
  StatCard,
  Timeline,
} from "@/components/ui"

const mockTimelineEntries = [
  {
    id: "1",
    title: "Morning Bottle",
    timestamp: "Today, 7:30 AM",
    duration: "180ml",
    color: "accent" as const,
    icon: "restaurant",
    tags: [
      { label: "Breast Milk", color: "primary" as const },
      { label: "Fast feed", color: "neutral" as const },
    ],
  },
  {
    id: "2",
    title: "Midday Nap",
    timestamp: "Today, 10:15 AM",
    duration: "1h 20m",
    color: "primary" as const,
    icon: "bedtime",
    tags: [{ label: "Crib", color: "secondary" as const }],
    active: true,
  },
  {
    id: "3",
    title: "Solids: Avocado",
    timestamp: "Today, 12:00 PM",
    duration: "45g",
    color: "tertiary" as const,
    icon: "nutrition",
    tags: [{ label: "Loved it", color: "tertiary" as const }],
  },
]

export default function DesignSystemPage() {
  const [tab, setTab] = useState("components")
  const [segVal, setSegVal] = useState("day")
  const [timerRunning, setTimerRunning] = useState(false)

  return (
    <div className="min-h-screen bg-[#FDF5E6]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-headline-lg text-on-surface mb-2">
            NalaGrow Design System
          </h1>
          <p className="font-body-md text-on-surface-variant mb-4">
            Reusable UI components extracted from Stitch designs. Use this page
            to verify color, spacing, typography, and interaction fidelity.
          </p>
          <SegmentedControl
            options={[
              { value: "components", label: "Components" },
              { value: "colors", label: "Colors" },
              { value: "typography", label: "Typography" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>

        {tab === "colors" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Primary", class: "bg-primary text-on-primary" },
              { name: "Primary Container", class: "bg-primary-container text-on-primary-container" },
              { name: "Secondary", class: "bg-secondary text-on-primary" },
              { name: "Secondary Container", class: "bg-secondary-container text-secondary" },
              { name: "Tertiary", class: "bg-tertiary text-on-primary" },
              { name: "Tertiary Container", class: "bg-tertiary-container" },
              { name: "Error", class: "bg-error text-on-primary" },
              { name: "Error Container", class: "bg-error-container text-error" },
              { name: "Surface", class: "bg-surface text-on-surface" },
              { name: "Surface Container", class: "bg-surface-container text-on-surface" },
              { name: "Surface Container High", class: "bg-surface-container-high text-on-surface" },
              { name: "Accent Coral", class: "bg-[#FF8A7A] text-white" },
            ].map((c) => (
              <div key={c.name} className={`rounded-2xl p-4 ${c.class}`}>
                <p className="font-label-md">{c.name}</p>
                <p className="font-body-sm mt-1 opacity-80">{c.class.split(" ")[0].replace("bg-", "")}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "typography" && (
          <div className="space-y-6">
            {[
              { name: "headline-lg", class: "font-headline-lg", text: "NalaGrow — 32px Quicksand 700" },
              { name: "headline-lg-mobile", class: "font-headline-lg-mobile", text: "NalaGrow — 26px Quicksand 700" },
              { name: "headline-md", class: "font-headline-md", text: "Feeding Log — 24px Quicksand 600" },
              { name: "headline-sm", class: "font-headline-sm", text: "Morning Bottle — 20px Quicksand 600" },
              { name: "body-lg", class: "font-body-lg", text: "Track your baby's growth journey from day one. — 18px Public Sans 400" },
              { name: "body-md", class: "font-body-md", text: "Track your baby's growth journey from day one. — 16px Public Sans 400" },
              { name: "body-sm", class: "font-body-sm", text: "Track your baby's growth journey from day one. — 14px Public Sans 400" },
              { name: "label-md", class: "font-label-md", text: "TOTAL SLEEP TODAY — 12px Public Sans 600, 0.05em" },
            ].map((t) => (
              <div key={t.name}>
                <p className="font-body-sm text-on-surface-variant mb-1">{t.name}</p>
                <p className={t.class}>{t.text}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "components" && (
          <div className="space-y-12">
            <section>
              <h2 className="font-headline-md text-on-surface mb-4">Buttons</h2>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
              </div>
              <div className="flex flex-wrap gap-3 mt-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button size="xl" icon="arrow_forward">Extra Large</Button>
              </div>
              <div className="flex flex-wrap gap-3 mt-3">
                <Button loading>Loading</Button>
                <Button disabled>Disabled</Button>
                <Button icon="add">With Icon</Button>
              </div>
            </section>

            <section>
              <h2 className="font-headline-md text-on-surface mb-4">Input Fields</h2>
              <div className="max-w-md space-y-4">
                <Input label="Baby Name" placeholder="Enter name" />
                <Input label="Email" type="email" placeholder="Enter email" icon="email" />
                <Input label="Password" type="password" placeholder="Enter password" icon="visibility" />
                <Input label="With Error" placeholder="Required field" error="This field is required" />
              </div>
            </section>

            <section>
              <h2 className="font-headline-md text-on-surface mb-4">Cards</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card variant="elevated">
                  <h3 className="font-headline-sm mb-2">Elevated Card</h3>
                  <p className="font-body-sm text-on-surface-variant">
                    This card has the standard soft-shadow and rounded-[24px].
                  </p>
                </Card>
                <Card variant="outlined">
                  <h3 className="font-headline-sm mb-2">Outlined Card</h3>
                  <p className="font-body-sm text-on-surface-variant">
                    This card uses border instead of shadow.
                  </p>
                </Card>
                <Card variant="filled">
                  <h3 className="font-headline-sm mb-2">Filled Card</h3>
                  <p className="font-body-sm text-on-surface-variant">
                    This card uses surface-container background.
                  </p>
                </Card>
              </div>
            </section>

            <section>
              <h2 className="font-headline-md text-on-surface mb-4">Chips & Avatars</h2>
              <div className="flex flex-wrap gap-3 items-center">
                <Chip color="primary">Breast Milk</Chip>
                <Chip color="secondary">Crib</Chip>
                <Chip color="tertiary">Loved it</Chip>
                <Chip color="error">Overdue</Chip>
                <Chip color="accent">Quick Feed</Chip>
                <Chip color="neutral">Default</Chip>
                <Chip icon="check" color="primary">Verified</Chip>
              </div>
              <div className="flex gap-3 items-center mt-4">
                <Avatar size="sm" />
                <Avatar size="md" />
                <Avatar size="lg" />
                <Avatar size="xl" />
                <Avatar size="xxl" fallback="N" />
              </div>
            </section>

            <section>
              <h2 className="font-headline-md text-on-surface mb-4">Segmented Control</h2>
              <SegmentedControl
                options={[
                  { value: "day", label: "Day" },
                  { value: "week", label: "Week" },
                  { value: "month", label: "Month" },
                ]}
                value={segVal}
                onChange={setSegVal}
              />
              <p className="font-body-sm text-on-surface-variant mt-2">
                Selected: {segVal}
              </p>
            </section>

            <section>
              <h2 className="font-headline-md text-on-surface mb-4">Progress Bar & Spinner</h2>
              <div className="max-w-md space-y-4">
                <ProgressBar value={65} />
                <ProgressBar value={100} />
                <div className="flex gap-3 items-center">
                  <Spinner size="sm" />
                  <Spinner size="md" />
                  <Spinner size="lg" />
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-headline-md text-on-surface mb-4">Timer</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
                <Timer variant="default" />
                <Timer variant="active" running={timerRunning} />
                <Button
                  size="sm"
                  variant={timerRunning ? "danger" : "primary"}
                  onClick={() => setTimerRunning(!timerRunning)}
                >
                  {timerRunning ? "Stop Timer" : "Start Timer"}
                </Button>
              </div>
            </section>

            <section>
              <h2 className="font-headline-md text-on-surface mb-4">Stat Cards</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
                <StatCard icon="bedtime" label="Total Sleep Today" value="14.5h" color="primary" />
                <StatCard icon="timer" label="Longest Stretch" value="4.2h" color="tertiary" />
                <StatCard icon="favorite" label="Feedings Today" value="8" color="accent" />
              </div>
              <div className="mt-4 max-w-sm">
                <StatCard icon="night_stay" label="Nala is resting..." value="02:34:15" color="primary" active />
              </div>
            </section>

            <section>
              <h2 className="font-headline-md text-on-surface mb-4">Timeline</h2>
              <Card className="max-w-xl">
                <Timeline entries={mockTimelineEntries} />
              </Card>
            </section>

            <section>
              <h2 className="font-headline-md text-on-surface mb-4">FAB</h2>
              <p className="font-body-sm text-on-surface-variant mb-4">
                Floating action button appears fixed at bottom-right on the actual page (not shown here).
              </p>
              <div className="relative h-20 w-20">
                <FAB icon="add" variant="primary" fixed={false} />
              </div>
            </section>
          </div>
        )}

        <div className="mt-16 pt-8 border-t border-outline-variant/30 text-center">
          <p className="font-body-sm text-on-surface-variant">
            Design System v1.0 — 14 components, 12 color tokens, 8 type styles
          </p>
          <p className="font-body-sm text-on-surface-variant mt-1">
            Matching Stitch visual framework from{" "}
            <code className="font-label-md text-primary">nalagrow_visual_framework/DESIGN.md</code>
          </p>
        </div>
      </div>
    </div>
  )
}
