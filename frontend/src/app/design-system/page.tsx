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
  BottomSheet,
  Dropdown,
  PillButton,
  StepperInput,
  SideSelector,
  ProfileCard,
  PhotoUpload,
  OAuthButton,
  QuickLogGrid,
  ReactionSelector,
  SuccessOverlay,
} from "@/components/ui"
import { PageHeader, PageShell, ProfileSwitcher } from "@/components/layout"
import { ChartWrapper, GrowthPercentileChart, MetricCard, StatCard, Timeline } from "@/components/data-display"
import {
  componentInventory,
  designColors,
  designTypography,
  stitchScreens,
} from "@/lib/design-tokens"
import type { DesignTypographyToken } from "@/lib/design-tokens"

const timelineEntries = [
  {
    id: "1",
    title: "Morning Bottle",
    timestamp: "Today, 7:30 AM",
    duration: "180 ml",
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
    duration: "45 g",
    color: "tertiary" as const,
    icon: "restaurant",
    tags: [{ label: "Loved it", color: "tertiary" as const }],
  },
]

const quickLogActions = [
  { id: "breast", label: "Breastfeed", icon: "female", tone: "primary" as const },
  { id: "bottle", label: "Bottle Feed", icon: "local_drink", tone: "primary" as const },
  { id: "solids", label: "Solids", icon: "restaurant", tone: "primary" as const },
  { id: "sleep", label: "Sleep", icon: "bedtime", tone: "primary" as const },
  { id: "growth", label: "Growth", icon: "straighten", tone: "primary" as const },
  { id: "diaper", label: "Diaper", icon: "baby_changing_station", tone: "primary" as const },
]

const reactionOptions = [
  { value: "loved", label: "Loved it", icon: "favorite" },
  { value: "interested", label: "Interested", icon: "sentiment_satisfied" },
  { value: "disliked", label: "Disliked", icon: "sentiment_dissatisfied", tone: "error" as const },
]

const profiles = [
  { id: "lily", name: "Lily", age: "4 months" },
  { id: "nala", name: "Nala", age: "6 months" },
]

const screenPatternCoverage: Record<string, string[]> = {
  create_baby_profile: ["PageHeader", "PhotoUpload", "Input", "SegmentedControl", "Button", "SuccessOverlay"],
  create_your_account: ["Input", "OAuthButton", "Button", "Card"],
  detailed_sleep_tracking_timers: ["TopNavBar", "DesktopSidebar", "Timer", "StatCard", "Timeline"],
  feeding_entry_forms: ["QuickLogGrid", "BottomSheet", "SideSelector", "StepperInput", "Timeline"],
  feeding_log_timers: ["Timer", "StatCard", "Timeline", "BottomTabNav"],
  functional_nalagrow_dashboard: ["ProfileSwitcher", "StatCard", "QuickLogGrid", "BottomTabNav"],
  growth_tracking_charts: ["ChartWrapper", "GrowthPercentileChart", "MetricCard", "PillButton", "Timeline"],
  interactive_feeding_log: ["ReactionSelector", "BottomSheet", "Timer", "Timeline"],
  interactive_growth_tracking: ["ChartWrapper", "MetricCard", "Dropdown", "PillButton"],
  interactive_nalagrow_dashboard: ["PageShell", "ProfileSwitcher", "StatCard", "FAB"],
  login_to_nalagrow: ["Input", "OAuthButton", "Button", "ProgressBar"],
  manage_baby_profiles_switching: ["ProfileCard", "Avatar", "Button", "ProfileSwitcher"],
  milestones_timeline: ["Timeline", "Chip", "ProgressBar", "Button"],
  nalagrow_dashboard: ["PageHeader", "StatCard", "QuickLogGrid", "Timeline"],
  quick_log_menu_overlay: ["BottomSheet", "QuickLogGrid", "FAB", "Button"],
  record_bottle_feed_detail: ["StepperInput", "SegmentedControl", "Dropdown", "Button"],
  record_solids_feed_detail: ["ReactionSelector", "Input", "Dropdown", "Button"],
  solids_feeding_reactions_log: ["ReactionSelector", "Timeline", "Chip", "BottomSheet"],
  nalagrow_visual_framework: ["Design tokens", "Typography", "Color palette", "Radii", "Shadows"],
}

function readableScreenName(screen: string) {
  return screen
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ")
}

function tokenTextColor(hexValue: string) {
  const hex = hexValue.replace("#", "")
  const fullHex = hex.length === 3
    ? hex.split("").map((character) => character + character).join("")
    : hex
  const red = Number.parseInt(fullHex.slice(0, 2), 16)
  const green = Number.parseInt(fullHex.slice(2, 4), 16)
  const blue = Number.parseInt(fullHex.slice(4, 6), 16)
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000

  return luminance < 150 ? "text-white" : "text-on-surface"
}

const typographyClassNames: Record<DesignTypographyToken, string> = {
  "headline-lg": "font-headline-lg text-headline-lg",
  "headline-lg-mobile": "font-headline-lg-mobile text-headline-lg-mobile",
  "headline-md": "font-headline-md text-headline-md",
  "headline-sm": "font-headline-sm text-headline-sm",
  "body-lg": "font-body-lg text-body-lg",
  "body-md": "font-body-md text-body-md",
  "body-sm": "font-body-sm text-body-sm",
  "label-md": "font-label-md text-label-md",
  "label-xs": "font-label-xs text-label-xs",
  "display-timer": "font-display-timer text-display-timer",
  "display-hero": "font-display-hero text-display-hero",
}

export default function DesignSystemPage() {
  const [tab, setTab] = useState("components")
  const [timerRunning, setTimerRunning] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [side, setSide] = useState<"left" | "right" | null>("left")
  const [quantity, setQuantity] = useState(120)
  const [reaction, setReaction] = useState("loved")
  const [profileId, setProfileId] = useState("lily")
  const [metric, setMetric] = useState("weight")

  return (
    <PageShell maxWidth="xl" className="bg-surface">
      <div className="space-y-stack-lg">
        <PageHeader
          eyebrow="FE-010"
          title="NalaGrow Design System"
          subtitle={`${componentInventory.length} components mapped from ${stitchScreens.length} Stitch assets`}
          leadingIcon="child_care"
          trailing={<Avatar fallback="L" size="lg" />}
        />

        <SegmentedControl
          options={[
            { value: "components", label: "Components" },
            { value: "colors", label: "Colors" },
            { value: "typography", label: "Typography" },
            { value: "screens", label: "Screens" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "colors" && (
          <section className="grid grid-cols-2 gap-gutter md:grid-cols-4 lg:grid-cols-6">
            {Object.entries(designColors).map(([name, value]) => (
              <div
                key={name}
                className={["min-h-[112px] rounded-xl p-gutter shadow-soft", tokenTextColor(value)].join(" ")}
                style={{ backgroundColor: value }}
              >
                <p className="font-label-md text-label-md uppercase">{name}</p>
                <p className="mt-2 font-body-sm text-body-sm opacity-80">{value}</p>
              </div>
            ))}
          </section>
        )}

        {tab === "typography" && (
          <section className="grid gap-gutter md:grid-cols-2">
            {Object.entries(designTypography).map(([name, token]) => (
              <div key={name} className="rounded-xl bg-surface-container-lowest p-gutter shadow-soft">
                <p className="font-label-md text-label-md uppercase text-on-surface-variant">
                  {name}
                </p>
                <p className={["mt-2 text-on-surface", typographyClassNames[name as DesignTypographyToken]].join(" ")}>
                  The next feed starts at 10:30
                </p>
                <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
                  {token.fontFamily} / {token.fontSize} / {token.lineHeight} / {token.fontWeight}
                </p>
              </div>
            ))}
          </section>
        )}

        {tab === "screens" && (
          <section className="grid gap-gutter md:grid-cols-2 xl:grid-cols-3">
            {stitchScreens.map((screen) => (
              <div key={screen} className="rounded-xl bg-surface-container-lowest p-gutter shadow-soft">
                <h2 className="font-headline-sm text-headline-sm text-primary">
                  {readableScreenName(screen)}
                </h2>
                <div className="mt-base flex flex-wrap gap-base">
                  {(screenPatternCoverage[screen] ?? []).map((component) => (
                    <Chip key={component} color="primary" size="md">
                      {component}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === "components" && (
          <div className="space-y-stack-lg">
            <section className="grid gap-stack-md lg:grid-cols-[420px_1fr]">
              <div className="space-y-gutter">
                <div className="text-center">
                  <h2 className="font-headline-md text-headline-md text-primary">
                    Welcome to NalaGrow
                  </h2>
                  <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                    Let&apos;s create a beautiful profile for your little one.
                  </p>
                </div>
                <Card className="space-y-gutter">
                  <div className="flex justify-center">
                    <PhotoUpload
                      onChange={() => undefined}
                      size="lg"
                      shape="circle"
                      label="Upload Photo"
                    />
                  </div>
                  <Input label="Baby's Name" placeholder="What's their name?" />
                  <Input label="Date of Birth" type="date" />
                  <SegmentedControl
                    options={[
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                      { value: "other", label: "Other" },
                    ]}
                    value="other"
                    onChange={() => undefined}
                  />
                  <Button size="form" fullWidth icon="arrow_forward" iconPosition="end">
                    Save Profile
                  </Button>
                </Card>
              </div>

              <div className="space-y-gutter">
                <ProfileSwitcher profiles={profiles} activeProfileId={profileId} onChange={setProfileId} />
                <div className="grid gap-gutter md:grid-cols-3">
                  <StatCard icon="bedtime" label="Total Sleep" value="14.5h" color="primary" />
                  <StatCard icon="restaurant" label="Feedings" value="8" color="accent" />
                  <StatCard icon="emoji_events" label="Milestones" value="3" color="tertiary" />
                </div>
                <div className="flex flex-wrap gap-base">
                  <PillButton icon="restaurant">Log Feed</PillButton>
                  <PillButton icon="bedtime" variant="secondary">Log Sleep</PillButton>
                  <PillButton icon="monitoring" variant="secondary">Log Growth</PillButton>
                </div>
              </div>
            </section>

            <section className="grid items-start gap-gutter lg:grid-cols-[1fr_360px]">
              <ChartWrapper
                title="Weight-for-age Percentiles"
                subtitle="WHO Standards (0-24 Months)"
                contentClassName="overflow-visible bg-transparent p-0"
                legend={[
                  { label: "Lily", colorClass: "bg-primary" },
                  { label: "Percentiles", colorClass: "bg-primary-container/40" },
                ]}
              >
                <GrowthPercentileChart />
              </ChartWrapper>

              <Card className="space-y-3">
                <h3 className="font-headline-sm text-headline-sm text-primary">Current Stats</h3>
                <MetricCard label="Weight" value="6.4" unit="kg" percentile="62nd percentile" trend="up" icon="scale" />
                <MetricCard label="Height" value="63.5" unit="cm" percentile="58th percentile" icon="straighten" tone="tertiary" />
                <MetricCard label="Head Circ." value="41.2" unit="cm" percentile="45th percentile" icon="face_2" tone="secondary" />
              </Card>
            </section>

            <section className="grid gap-gutter lg:grid-cols-2">
              <Card className="space-y-gutter">
                <div className="flex flex-wrap gap-base">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                  <Button loading>Loading</Button>
                </div>
                <div className="grid gap-base sm:grid-cols-2">
                  <Input label="Email Address" icon="mail" placeholder="hello@example.com" />
                  <Input label="Password" icon="lock" type="password" placeholder="Password" />
                  <Dropdown
                    label="Measurement"
                    options={[
                      { value: "weight", label: "Weight" },
                      { value: "height", label: "Height" },
                      { value: "head", label: "Head circumference" },
                    ]}
                    value={metric}
                    onChange={setMetric}
                  />
                  <StepperInput label="Bottle Amount" value={quantity} onChange={setQuantity} />
                </div>
                <OAuthButton />
              </Card>

              <Card className="space-y-gutter">
                <Timer running={timerRunning} variant={timerRunning ? "active" : "default"} />
                <div className="flex flex-wrap gap-base">
                  <Button
                    size="sm"
                    variant={timerRunning ? "danger" : "primary"}
                    onClick={() => setTimerRunning(!timerRunning)}
                  >
                    {timerRunning ? "Stop" : "Start"}
                  </Button>
                  <PillButton icon="timer" variant="secondary">Log Session</PillButton>
                  <FAB fixed={false} />
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-container">
                    <Spinner />
                  </span>
                </div>
                <ProgressBar value={68} />
              </Card>
            </section>

            <section className="grid gap-gutter lg:grid-cols-2">
              <Card className="space-y-gutter">
                <SideSelector value={side} onChange={setSide} />
                <ReactionSelector options={reactionOptions} value={reaction} onChange={setReaction} />
                <div className="flex flex-wrap gap-base">
                  <Chip color="primary">Breast Milk</Chip>
                  <Chip color="secondary">Crib</Chip>
                  <Chip color="tertiary">Loved it</Chip>
                  <Chip color="error">Overdue</Chip>
                  <Chip color="accent">Quick Feed</Chip>
                  <Chip icon="check" color="primary">Verified</Chip>
                </div>
              </Card>

              <Card>
                <Timeline entries={timelineEntries} />
              </Card>
            </section>

            <section className="grid gap-gutter md:grid-cols-2 lg:grid-cols-4">
              <ProfileCard name="Lily" age="4 months" active />
              <ProfileCard name="Nala" age="6 months" onSwitch={() => undefined} />
              <Card variant="outlined">
                <div className="flex items-center gap-base">
                  <Avatar size="xl" fallback="N" />
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">Avatar</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Profile image fallback</p>
                  </div>
                </div>
              </Card>
              <Card variant="filled">
                <div className="flex h-full flex-col justify-between gap-gutter">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Sheets</h2>
                  <Button onClick={() => setSheetOpen(true)}>Open Bottom Sheet</Button>
                  <Button variant="secondary" onClick={() => setSuccessOpen(true)}>Show Success</Button>
                </div>
              </Card>
            </section>
          </div>
        )}
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <div className="space-y-gutter py-gutter">
          <PageHeader title="Quick Log" subtitle="Choose a tracking type." />
          <QuickLogGrid actions={quickLogActions} />
        </div>
      </BottomSheet>

      <SuccessOverlay
        open={successOpen}
        title="Profile Created"
        message="The design-system success overlay is active."
      />
    </PageShell>
  )
}
