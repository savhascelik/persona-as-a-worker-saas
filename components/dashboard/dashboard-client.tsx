"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import { ArrowLeft, Clock, Hexagon, Pencil, Plus, Timer, Trash2, TriangleAlert, Users } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"
import { LanguageToggle, ThemeToggle } from "@/components/controls"
import { StatusBadge } from "./status-badge"
import { PersonaForm } from "./persona-form"
import { deletePersonaAction } from "@/app/actions"
import type { Persona } from "@/lib/types"

function pad(n: number) {
  return String(n).padStart(2, "0")
}

export function DashboardClient({
  personas,
  dbError,
}: {
  personas: Persona[]
  dbError?: string | null
}) {
  const { t } = useI18n()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Persona | undefined>(undefined)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const stats = useMemo(() => {
    const total = personas.length
    const active = personas.filter((p) => p.status === "active" || p.status === "seeding").length
    const posts = personas.reduce((sum, p) => sum + p.postsPublished, 0)
    const engagement = total ? Math.round(personas.reduce((s, p) => s + p.engagementScore, 0) / total) : 0
    return { total, active, posts, engagement }
  }, [personas])

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(persona: Persona) {
    setEditing(persona)
    setFormOpen(true)
  }

  function handleDelete(id: string) {
    setPendingId(id)
    startTransition(async () => {
      await deletePersonaAction(id)
      setPendingId(null)
    })
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
              <Hexagon className="h-4 w-4" />
            </span>
            <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t.dashboard.backToSite}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t.dashboard.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t.dashboard.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center gap-2 self-start rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {t.dashboard.newPersona}
          </button>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Users} label={t.dashboard.statTotal} value={stats.total} />
          <StatCard icon={Clock} label={t.dashboard.statActive} value={stats.active} />
          <StatCard icon={Pencil} label={t.dashboard.statPosts} value={stats.posts} />
          <StatCard icon={Timer} label={t.dashboard.statEngagement} value={stats.engagement} />
        </div>

        {dbError && (
          <div className="mt-8 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{t.dashboard.dbError}</p>
          </div>
        )}

        {personas.length === 0 ? (
          <div className="glow-border mt-8 flex flex-col items-center rounded-xl px-6 py-20 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background/50 text-accent">
              <Users className="h-6 w-6" />
            </span>
            <p className="mt-4 max-w-sm text-pretty text-sm text-muted-foreground">{t.dashboard.empty}</p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              {t.dashboard.deployFirst}
            </button>
          </div>
        ) : (
          <div className="glow-border mt-8 overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 font-medium">{t.dashboard.colName}</th>
                    <th className="px-5 py-3 font-medium">{t.dashboard.colPlatform}</th>
                    <th className="px-5 py-3 font-medium">{t.dashboard.colHours}</th>
                    <th className="px-5 py-3 font-medium">{t.dashboard.colLatency}</th>
                    <th className="px-5 py-3 font-medium">{t.dashboard.colStatus}</th>
                    <th className="px-5 py-3 font-medium">{t.dashboard.colOutput}</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {personas.map((p) => (
                    <tr
                      key={p.id}
                      className={`border-b border-border/60 last:border-0 transition-opacity ${pendingId === p.id ? "opacity-40" : ""}`}
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-foreground">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.role}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-foreground">{p.platform}</div>
                        <div className="max-w-[180px] truncate font-mono text-xs text-muted-foreground">{p.mcpUrl || "—"}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs text-muted-foreground">
                          {pad(p.workStartHour)}:00–{pad(p.workEndHour)}:00
                        </span>
                        <div className="text-xs text-muted-foreground">{p.timezone}</div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                        {p.minLatencySeconds}–{p.maxLatencySeconds}s
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-foreground">
                          {p.postsPublished} <span className="text-xs text-muted-foreground">{t.dashboard.posts}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{p.engagementScore} eng.</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            aria-label={t.dashboard.edit}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            disabled={pendingId === p.id}
                            aria-label={t.dashboard.delete}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {formOpen && <PersonaForm persona={editing} onClose={() => setFormOpen(false)} />}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: number
}) {
  return (
    <div className="glow-border rounded-xl p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value.toLocaleString()}</div>
    </div>
  )
}
