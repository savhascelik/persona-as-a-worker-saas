"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { ArrowLeft, Building2, Coins, ShieldAlert, Trash2, Users, Zap } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"
import { useSession } from "@/components/session-provider"
import { SkillGenerator } from "@/components/admin/skill-generator"
import { ActivePersonasChart, CreditsChart, TopSkillsChart } from "@/components/admin/admin-charts"
import { deleteSkillTemplateAction } from "@/app/actions"
import { SKILLS } from "@/lib/skills"
import { resolveSkillIcon } from "@/lib/skill-icons"
import type { Company, Persona, SkillTemplate } from "@/lib/types"

export function AdminClient({
  companies,
  personas,
  initialTemplates,
}: {
  companies: Company[]
  personas: Persona[]
  initialTemplates: SkillTemplate[]
}) {
  const { t, locale } = useI18n()
  const { isAdmin } = useSession()
  const [templates, setTemplates] = useState<SkillTemplate[]>(initialTemplates)
  const [isPending, startTransition] = useTransition()
  const nf = useMemo(() => new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US"), [locale])

  const stats = useMemo(() => {
    const active = personas.filter((p) => p.status === "active" || p.status === "seeding" || p.status === "idle")
    const creditsConsumed = companies.reduce((sum, c) => sum + (c.creditsConsumed || 0), 0)
    return {
      companies: companies.length,
      personas: personas.length,
      active: active.length,
      creditsConsumed,
    }
  }, [companies, personas])

  const creditsByCompany = useMemo(
    () => companies.map((c) => ({ label: c.name, value: c.creditsConsumed || 0 })).sort((a, b) => b.value - a.value),
    [companies],
  )

  const activeByCompany = useMemo(
    () =>
      companies.map((c) => ({
        label: c.name,
        value: personas.filter(
          (p) => p.companyId === c.id && p.status !== "offline" && p.status !== "hibernating",
        ).length,
      })),
    [companies, personas],
  )

  const topSkills = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of personas) for (const id of p.skillIds || []) counts[id] = (counts[id] || 0) + 1
    const nameFor = (id: string) =>
      SKILLS.find((s) => s.id === id)?.name ?? templates.find((s) => s.id === id)?.name ?? id
    return Object.entries(counts)
      .map(([id, value]) => ({ label: nameFor(id), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [personas, templates])

  function removeTemplate(id: string) {
    setTemplates((prev) => prev.filter((s) => s.id !== id))
    startTransition(async () => {
      await deleteSkillTemplateAction(id)
    })
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.admin.back}
        </Link>
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          <h1 className="mt-4 text-lg font-medium text-foreground">{t.admin.adminOnly}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.admin.adminOnlyDesc}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.admin.back}
      </Link>

      <header className="mt-6">
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground">{t.admin.title}</h1>
        <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">{t.admin.subtitle}</p>
      </header>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Building2} label={t.admin.statCompanies} value={nf.format(stats.companies)} />
        <StatCard icon={Users} label={t.admin.statPersonas} value={nf.format(stats.personas)} />
        <StatCard icon={Zap} label={t.admin.statActive} value={nf.format(stats.active)} />
        <StatCard icon={Coins} label={t.admin.statCreditsConsumed} value={nf.format(stats.creditsConsumed)} accent />
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title={t.admin.chartCreditsTitle} desc={t.admin.chartCreditsDesc}>
          <CreditsChart data={creditsByCompany} />
        </ChartCard>
        <ChartCard title={t.admin.chartPersonasTitle} desc={t.admin.chartPersonasDesc}>
          <ActivePersonasChart data={activeByCompany} />
        </ChartCard>
        <ChartCard title={t.admin.chartSkillsTitle} desc={t.admin.chartSkillsDesc} className="lg:col-span-2">
          <TopSkillsChart data={topSkills} />
        </ChartCard>
      </div>

      {/* Skill templates */}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-medium text-foreground">{t.admin.templatesTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.admin.templatesDesc}</p>
          <div className="mt-4 space-y-3">
            {templates.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
                {t.admin.noTemplates}
              </p>
            ) : (
              templates.map((s) => {
                const Icon = resolveSkillIcon(s.iconName)
                return (
                  <div
                    key={s.id}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 text-accent">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{s.name}</span>
                        <span className="rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                          {t.admin.custom}
                        </span>
                      </div>
                      <p className="mt-0.5 text-pretty text-sm text-muted-foreground">{s.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {s.requiredTools.map((tool) => (
                          <code
                            key={tool}
                            className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                          >
                            {tool}
                          </code>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={t.admin.deleteTemplate}
                      onClick={() => removeTemplate(s.id)}
                      disabled={isPending}
                      className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <SkillGenerator onSaved={(skill) => setTemplates((prev) => [skill, ...prev])} />
      </div>
    </main>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "glow-border" : "border-border bg-card"}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className={`h-4 w-4 ${accent ? "text-accent" : ""}`} />
        {label}
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}

function ChartCard({
  title,
  desc,
  className,
  children,
}: {
  title: string
  desc: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 ${className ?? ""}`}>
      <h3 className="font-medium text-foreground">{title}</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-4">{children}</div>
    </div>
  )
}
