"use client"

import { useMemo, useState, useTransition, Fragment } from "react"
import { useRouter } from "next/navigation"
import { Building2, Clock, Moon, Pencil, Plus, Target, Timer, Trash2, TriangleAlert, Users } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"
import { useSession } from "@/components/session-provider"
import { StatusBadge } from "./status-badge"
import { PersonaWizard } from "./persona-wizard"
import { ConnectPlatformForm } from "./connect-platform-form"
import { ActivityFeed } from "./activity-feed"
import { DashboardHeader } from "./dashboard-header"
import { deletePersonaAction } from "@/app/actions/persona-actions"
import { useSkills } from "@/components/skills-provider"
import { PersonaGoals } from "./persona-goals"
import type { Company, Persona } from "@/lib/types"

function pad(n: number) {
  return String(n).padStart(2, "0")
}

export function DashboardClient({
  personas,
  companies,
  dbError,
}: {
  personas: Persona[]
  companies: Company[]
  dbError?: string | null
}) {
  const { t } = useI18n()
  const router = useRouter()
  const { skillMap } = useSkills()
  const { activeCompanyId, setActiveCompanyId } = useSession()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const [editing, setEditing] = useState<Persona | undefined>(undefined)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [expandedPersonaId, setExpandedPersonaId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const visiblePersonas = useMemo(
    () => (activeCompanyId ? personas.filter((p) => p.companyId === activeCompanyId) : personas),
    [personas, activeCompanyId],
  )

  const activeCompany = useMemo(
    () => (activeCompanyId ? companies.find((c) => c.id === activeCompanyId) : undefined),
    [companies, activeCompanyId],
  )

  const stats = useMemo(() => {
    const total = visiblePersonas.length
    const active = visiblePersonas.filter((p) => p.status === "active" || p.status === "seeding").length
    const posts = visiblePersonas.reduce((sum, p) => sum + p.postsPublished, 0)
    const engagement = total ? Math.round(visiblePersonas.reduce((s, p) => s + p.engagementScore, 0) / total) : 0
    return { total, active, posts, engagement }
  }, [visiblePersonas])

  const countByCompany = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of personas) map.set(p.companyId, (map.get(p.companyId) ?? 0) + 1)
    return map
  }, [personas])

  function openCreate() {
    setEditing(undefined)
    setWizardOpen(true)
  }
  function openEdit(persona: Persona) {
    setEditing(persona)
    setWizardOpen(true)
  }
  function handleDelete(id: string) {
    setPendingId(id)
    startTransition(async () => {
      await deletePersonaAction(id)
      setPendingId(null)
    })
  }

  const noCompanies = companies.length === 0
  const hibernating = activeCompany ? activeCompany.totalCredits <= 0 : false

  return (
    <div className="min-h-dvh">
      <DashboardHeader companies={companies} />

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[260px_1fr]">
        {/* Sidebar: tenant / company switcher */}
        <aside className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t.tenant.workspace}
            </span>
          </div>

          {/* Mobile dropdown */}
          <select
            value={activeCompanyId ?? ""}
            onChange={(e) => setActiveCompanyId(e.target.value || null)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring lg:hidden"
            aria-label={t.tenant.selectCompany}
          >
            <option value="">{t.tenant.allCompanies}</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Desktop list */}
          <nav className="hidden flex-col gap-1 lg:flex">
            <CompanyItem
              label={t.tenant.allCompanies}
              count={personas.length}
              active={activeCompanyId === null}
              onClick={() => setActiveCompanyId(null)}
            />
            {companies.map((c) => (
              <CompanyItem
                key={c.id}
                label={c.name}
                hint={c.domain}
                count={countByCompany.get(c.id) ?? 0}
                active={activeCompanyId === c.id}
                depleted={c.totalCredits <= 0}
                onClick={() => setActiveCompanyId(c.id)}
              />
            ))}
            {noCompanies && <p className="px-3 py-2 text-xs text-muted-foreground">{t.tenant.noCompany}</p>}
          </nav>

          <button
            type="button"
            onClick={() => setConnectOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background/40 px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent/10"
          >
            <Building2 className="h-4 w-4" />
            {t.tenant.connectNew}
          </button>
        </aside>

        {/* Main content */}
        <main className="min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{t.dashboard.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t.dashboard.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              disabled={noCompanies}
              title={noCompanies ? t.tenant.noCompany : undefined}
              className="inline-flex h-10 items-center gap-2 self-start rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
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

          {hibernating && (
            <div className="mt-8 flex items-start gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-600 dark:text-sky-400">
              <Moon className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{t.credits.hibernationNote}</p>
            </div>
          )}

          {dbError && (
            <div className="mt-8 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{t.dashboard.dbError}</p>
            </div>
          )}

          <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_340px]">
            {/* Persona table */}
            <div className="min-w-0">
              {visiblePersonas.length === 0 ? (
                <div className="glow-border flex flex-col items-center rounded-xl px-6 py-20 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background/50 text-accent">
                    <Users className="h-6 w-6" />
                  </span>
                  <p className="mt-4 max-w-sm text-pretty text-sm text-muted-foreground">{t.dashboard.empty}</p>
                  <button
                    type="button"
                    onClick={openCreate}
                    disabled={noCompanies}
                    className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    {t.dashboard.deployFirst}
                  </button>
                </div>
              ) : (
                <div className="glow-border overflow-hidden rounded-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="px-5 py-3 font-medium">{t.dashboard.colName}</th>
                          <th className="px-5 py-3 font-medium">{t.dashboard.colSkills}</th>
                          <th className="px-5 py-3 font-medium">{t.dashboard.colHours}</th>
                          <th className="px-5 py-3 font-medium">{t.dashboard.colStatus}</th>
                          <th className="px-5 py-3 font-medium">{t.dashboard.colOutput}</th>
                          <th className="px-5 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {visiblePersonas.map((p) => (
                          <Fragment key={p.id}>
                            <tr
                              className={`border-b border-border/60 transition-opacity last:border-0 ${pendingId === p.id ? "opacity-40" : ""}`}
                            >
                            <td className="px-5 py-4">
                              <div className="font-medium text-foreground">{p.name}</div>
                              <div className="text-xs text-muted-foreground">{p.role}</div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-wrap gap-1">
                                {p.skillIds?.length ? (
                                  p.skillIds.map((id) => (
                                    <span
                                      key={id}
                                      className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                                    >
                                      {skillMap[id]?.name ?? id}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="font-mono text-xs text-muted-foreground">
                                {pad(p.workStartHour)}:00–{pad(p.workEndHour)}:00
                              </span>
                              <div className="text-xs text-muted-foreground">{p.timezone}</div>
                            </td>
                            <td className="px-5 py-4">
                              <StatusBadge status={p.status} />
                            </td>
                            <td className="px-5 py-4">
                              <div className="text-foreground">
                                {p.postsPublished}{" "}
                                <span className="text-xs text-muted-foreground">{t.dashboard.posts}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">{p.engagementScore} eng.</div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setExpandedPersonaId(expandedPersonaId === p.id ? null : p.id)}
                                  title="Objectives & Goals"
                                  className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                                    expandedPersonaId === p.id
                                      ? "bg-accent/25 text-accent border border-accent/30"
                                      : "text-muted-foreground hover:bg-accent/10 hover:text-accent border border-transparent"
                                  }`}
                                >
                                  <Target className="h-4 w-4" />
                                </button>
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
                          {expandedPersonaId === p.id && (
                            <tr key={`${p.id}-goals`} className="bg-muted/10 border-b border-border/40">
                              <td colSpan={6} className="px-5 py-5">
                                <div className="animate-in fade-in-50 duration-200">
                                  <PersonaGoals
                                    persona={p}
                                    company={activeCompany || companies.find((c) => c.id === p.companyId)!}
                                  />
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Live activity feed */}
            <ActivityFeed personas={visiblePersonas} companyId={activeCompanyId} />
          </div>
        </main>
      </div>

      {wizardOpen && (
        <PersonaWizard
          companies={companies}
          defaultCompanyId={activeCompanyId ?? undefined}
          defaultSkillIds={editing ? undefined : activeCompany?.suggestedSkillIds}
          persona={editing}
          onClose={() => setWizardOpen(false)}
        />
      )}
      {connectOpen && (
        <ConnectPlatformForm
          onClose={() => setConnectOpen(false)}
          onCreated={(company) => {
            setActiveCompanyId(company.id)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function CompanyItem({
  label,
  hint,
  count,
  active,
  depleted,
  onClick,
}: {
  label: string
  hint?: string
  count: number
  active: boolean
  depleted?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active}
      className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
        active ? "bg-accent/10 text-foreground" : "text-muted-foreground hover:bg-accent/5 hover:text-foreground"
      }`}
    >
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          {depleted && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" aria-hidden />}
          <span className="block truncate font-medium">{label}</span>
        </span>
        {hint && <span className="block truncate text-xs text-muted-foreground">{hint}</span>}
      </span>
      <span className="shrink-0 rounded-full border border-border px-1.5 text-[11px] tabular-nums text-muted-foreground">
        {count}
      </span>
    </button>
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
