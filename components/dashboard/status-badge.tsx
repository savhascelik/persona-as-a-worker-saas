"use client"

import { useI18n } from "@/components/i18n-provider"
import type { PersonaStatus } from "@/lib/types"

const styles: Record<PersonaStatus, string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  seeding: "border-accent/30 bg-accent/10 text-accent",
  idle: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  offline: "border-border bg-muted text-muted-foreground",
}

const dotStyles: Record<PersonaStatus, string> = {
  active: "bg-emerald-500",
  seeding: "bg-accent",
  idle: "bg-amber-500",
  offline: "bg-muted-foreground",
}

export function StatusBadge({ status }: { status: PersonaStatus }) {
  const { t } = useI18n()
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[status]} ${status === "active" ? "animate-pulse" : ""}`} />
      {t.status[status]}
    </span>
  )
}
