"use client"

import Link from "next/link"
import { Zap } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"

/**
 * Compact circular gauge showing remaining Seeding Credits as a fraction of the
 * company's lifetime credit pool (balance + consumed). Lives in the header.
 */
export function CreditGauge({
  balance,
  consumed,
  label,
}: {
  balance: number
  consumed: number
  label?: string
}) {
  const { t } = useI18n()
  const pool = Math.max(balance + consumed, 1)
  const fraction = Math.max(0, Math.min(1, balance / pool))
  const depleted = balance <= 0
  const low = !depleted && fraction < 0.2

  const tone = depleted
    ? "text-sky-500"
    : low
      ? "text-amber-500"
      : "text-emerald-500"

  // SVG ring geometry.
  const size = 34
  const stroke = 3.5
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const dash = circumference * fraction

  return (
    <Link
      href="/dashboard/billing"
      className="group flex items-center gap-2.5 rounded-lg border border-border bg-background/40 px-2.5 py-1.5 transition-colors hover:bg-accent/10"
      aria-label={`${t.credits.balance}: ${balance.toLocaleString()}`}
    >
      <span className="relative inline-flex" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            className={tone}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
        </svg>
        <Zap className={`absolute inset-0 m-auto h-3.5 w-3.5 ${tone}`} />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label ?? t.credits.balance}
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {balance.toLocaleString()}
          {depleted && <span className="ml-1.5 text-[10px] font-medium text-sky-500">{t.credits.depleted}</span>}
          {low && <span className="ml-1.5 text-[10px] font-medium text-amber-500">{t.credits.low}</span>}
        </span>
      </span>
    </Link>
  )
}
