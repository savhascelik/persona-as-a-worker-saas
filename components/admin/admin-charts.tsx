"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"

interface Datum {
  label: string
  value: number
}

const creditsConfig: ChartConfig = {
  value: { label: "Credits", color: "var(--chart-1)" },
}
const personasConfig: ChartConfig = {
  value: { label: "Active", color: "var(--chart-2)" },
}
const skillsConfig: ChartConfig = {
  value: { label: "Assignments", color: "var(--chart-3)" },
}

function BarPanel({
  data,
  config,
  color,
  horizontal,
}: {
  data: Datum[]
  config: ChartConfig
  color: string
  horizontal?: boolean
}) {
  return (
    <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
      <BarChart
        accessibilityLayer
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ left: horizontal ? 8 : 0, right: 12, top: 8, bottom: 0 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
        {horizontal ? (
          <>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={120}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          </>
        )}
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill={color} radius={6} />
      </BarChart>
    </ChartContainer>
  )
}

export function CreditsChart({ data }: { data: Datum[] }) {
  return <BarPanel data={data} config={creditsConfig} color="var(--color-value)" />
}

export function ActivePersonasChart({ data }: { data: Datum[] }) {
  return <BarPanel data={data} config={personasConfig} color="var(--color-value)" />
}

export function TopSkillsChart({ data }: { data: Datum[] }) {
  return <BarPanel data={data} config={skillsConfig} color="var(--color-value)" horizontal />
}
