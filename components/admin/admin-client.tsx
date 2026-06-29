"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Building2,
  Coins,
  ShieldAlert,
  Trash2,
  Users,
  Zap,
  Search,
  Key,
  Globe,
  Plus,
  Check,
  X,
  Pencil,
  CircleAlert,
  BarChart3,
  User,
  GraduationCap
} from "lucide-react"
import { useI18n } from "@/components/i18n-provider"
import { useSession } from "@/components/session-provider"
import { SkillGenerator } from "@/components/admin/skill-generator"
import { ActivePersonasChart, CreditsChart, TopSkillsChart } from "@/components/admin/admin-charts"
import { deleteSkillTemplateAction, setCompanyCreditsAction } from "@/app/actions"
import { SKILLS } from "@/lib/skills"
import { resolveSkillIcon } from "@/lib/skill-icons"
import type { Company, Persona, SkillTemplate } from "@/lib/types"

interface ClerkUser {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  role: string
}

export function AdminClient({
  companies,
  personas,
  initialTemplates,
  users = [],
}: {
  companies: Company[]
  personas: Persona[]
  initialTemplates: SkillTemplate[]
  users?: ClerkUser[]
}) {
  const { t, locale } = useI18n()
  const { isAdmin } = useSession()
  const [templates, setTemplates] = useState<SkillTemplate[]>(initialTemplates)
  const [activeTab, setActiveTab] = useState<"analytics" | "users" | "companies" | "templates">("analytics")
  
  // Search states
  const [usersSearch, setUsersUsersSearch] = useState("")
  const [companiesSearch, setCompaniesSearch] = useState("")

  // Credits modal states
  const [selectedCompanyForCredits, setSelectedCompanyForCredits] = useState<Company | null>(null)
  const [creditsInput, setCreditsInput] = useState<number>(0)
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalSuccess, setModalSuccess] = useState<boolean>(false)

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

  // Filtered users
  const filteredUsers = useMemo(() => {
    const term = usersSearch.toLowerCase().trim()
    if (!term) return users
    return users.filter(
      (u) =>
        u.id.toLowerCase().includes(term) ||
        (u.firstName && u.firstName.toLowerCase().includes(term)) ||
        (u.lastName && u.lastName.toLowerCase().includes(term)) ||
        u.email.toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term)
    )
  }, [users, usersSearch])

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    const term = companiesSearch.toLowerCase().trim()
    if (!term) return companies
    return companies.filter(
      (c) =>
        c.id.toLowerCase().includes(term) ||
        c.name.toLowerCase().includes(term) ||
        c.domain.toLowerCase().includes(term) ||
        c.baseUrl.toLowerCase().includes(term)
    )
  }, [companies, companiesSearch])

  function removeTemplate(id: string) {
    setTemplates((prev) => prev.filter((s) => s.id !== id))
    startTransition(async () => {
      await deleteSkillTemplateAction(id)
    })
  }

  function openCreditsModal(company: Company) {
    setSelectedCompanyForCredits(company)
    setCreditsInput(company.totalCredits)
    setModalError(null)
    setModalSuccess(false)
  }

  function handleCreditsSave() {
    if (!selectedCompanyForCredits) return
    setModalError(null)

    if (creditsInput < 0) {
      setModalError("Credits cannot be negative")
      return
    }

    startTransition(async () => {
      const res = await setCompanyCreditsAction(selectedCompanyForCredits.id, creditsInput)
      if (res.ok) {
        setModalSuccess(true)
        setTimeout(() => {
          setSelectedCompanyForCredits(null)
          setModalSuccess(false)
        }, 1500)
      } else {
        setModalError(res.error || "Failed to update credits")
      }
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

      <header className="mt-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground">{t.admin.title}</h1>
          <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">{t.admin.subtitle}</p>
        </div>
      </header>

      {/* Admin navigation tabs */}
      <div className="mt-8 flex flex-wrap gap-2 border-b border-border pb-px">
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "analytics"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          {t.admin.tabAnalytics}
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "users"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          {t.admin.tabUsers}
          <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {users.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("companies")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "companies"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="h-4 w-4" />
          {t.admin.tabCompanies}
          <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {companies.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "templates"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          {t.admin.tabSkills}
          <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {templates.length}
          </span>
        </button>
      </div>

      {/* TAB 1: ANALYTICS (Charts & Stats) */}
      {activeTab === "analytics" && (
        <div className="mt-8 space-y-6 animate-in fade-in duration-200">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={Building2} label={t.admin.statCompanies} value={nf.format(stats.companies)} />
            <StatCard icon={Users} label={t.admin.statPersonas} value={nf.format(stats.personas)} />
            <StatCard icon={Zap} label={t.admin.statActive} value={nf.format(stats.active)} />
            <StatCard icon={Coins} label={t.admin.statCreditsConsumed} value={nf.format(stats.creditsConsumed)} accent />
          </div>

          {/* Charts Grid */}
          <div className="grid gap-4 lg:grid-cols-2">
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
        </div>
      )}

      {/* TAB 2: USERS (Clerk user details) */}
      {activeTab === "users" && (
        <div className="mt-6 space-y-4 animate-in fade-in duration-200">
          {/* Users Header / Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-medium text-foreground">{t.admin.tabUsers}</h2>
              <p className="text-sm text-muted-foreground">Detailed list of all accounts registered in your system.</p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute top-2.5 left-3.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={usersSearch}
                onChange={(e) => setUsersUsersSearch(e.target.value)}
                placeholder={t.admin.searchUsersPlaceholder}
                className="w-full rounded-xl border border-border bg-card py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-card/80 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-4">{t.admin.colName}</th>
                    <th className="px-6 py-4">{t.admin.colEmail}</th>
                    <th className="px-6 py-4">{t.admin.colId}</th>
                    <th className="px-6 py-4">{t.admin.colRole}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                        No registered users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || t.admin.unnamedUser
                      const isAdminRole = user.role.toLowerCase() === "admin"
                      const isManagerRole = user.role.toLowerCase() === "manager"

                      return (
                        <tr key={user.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent font-semibold text-xs border border-accent/20">
                              {name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                            </span>
                            {name}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{user.email}</td>
                          <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{user.id}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                                isAdminRole
                                  ? "bg-accent/10 text-accent border-accent/30"
                                  : isManagerRole
                                  ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                                  : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMPANIES / PLATFORMS (Platforms management & set credits) */}
      {activeTab === "companies" && (
        <div className="mt-6 space-y-4 animate-in fade-in duration-200">
          {/* Companies Header / Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-medium text-foreground">{t.admin.tabCompanies}</h2>
              <p className="text-sm text-muted-foreground">Manage connected platform setups and allocate seeding credits.</p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute top-2.5 left-3.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={companiesSearch}
                onChange={(e) => setCompaniesSearch(e.target.value)}
                placeholder={t.admin.searchCompaniesPlaceholder}
                className="w-full rounded-xl border border-border bg-card py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* Companies Table */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-card/80 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-4">{t.admin.tabCompanies}</th>
                    <th className="px-6 py-4">{t.admin.colDomain}</th>
                    <th className="px-6 py-4">{t.admin.colUrl}</th>
                    <th className="px-6 py-4">{t.admin.colTools}</th>
                    <th className="px-6 py-4">{t.admin.colCredits}</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        No platform connections found.
                      </td>
                    </tr>
                  ) : (
                    filteredCompanies.map((c) => {
                      const toolsCount = c.discoveredTools?.length || 0
                      const remaining = (c.totalCredits || 0) - (c.creditsConsumed || 0)
                      const isLowCredits = remaining <= 1000

                      return (
                        <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-6 py-4 font-medium text-foreground">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold">{c.name}</span>
                              <span className="text-xs text-muted-foreground font-mono">{c.id}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground/60" />
                            {c.domain}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground font-mono text-xs max-w-[200px] truncate" title={c.baseUrl}>
                            {c.baseUrl}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent border border-accent/20">
                              {toolsCount} {t.skills.tools}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <Coins className={`h-3.5 w-3.5 ${isLowCredits ? "text-amber-400" : "text-emerald-400"}`} />
                                <span className="font-semibold text-foreground">{nf.format(remaining)}</span>
                                <span className="text-xs text-muted-foreground">/ {nf.format(c.totalCredits || 0)}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground mt-0.5">
                                Consumed: {nf.format(c.creditsConsumed || 0)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => openCreditsModal(c)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-all hover:bg-accent/20 hover:border-accent hover:scale-[1.02] active:scale-[0.98]"
                            >
                              <Coins className="h-3.5 w-3.5" />
                              {t.admin.actionSetCredits}
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SKILL TEMPLATES */}
      {activeTab === "templates" && (
        <div className="mt-10 grid gap-6 lg:grid-cols-2 animate-in fade-in duration-200">
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
                      className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:border-accent/40 transition-colors"
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
      )}

      {/* CREDITS OVERRIDE DIALOG / MODAL */}
      {selectedCompanyForCredits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent border border-accent/20">
                  <Coins className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{t.admin.modalTitle}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.admin.modalDesc}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCompanyForCredits(null)}
                className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-6 space-y-4">
              {/* Selected Platform Meta */}
              <div className="rounded-xl bg-muted/50 p-4 border border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Selected Connection</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-semibold text-foreground">{selectedCompanyForCredits.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{selectedCompanyForCredits.domain}</span>
                </div>
              </div>

              {/* Seeding Ledger Details */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-border p-3 text-center bg-card">
                  <span className="text-[10px] text-muted-foreground block uppercase">Allocated</span>
                  <span className="font-mono text-sm font-semibold text-foreground block mt-1">
                    {nf.format(selectedCompanyForCredits.totalCredits || 0)}
                  </span>
                </div>
                <div className="rounded-xl border border-border p-3 text-center bg-card">
                  <span className="text-[10px] text-muted-foreground block uppercase">Consumed</span>
                  <span className="font-mono text-sm font-semibold text-muted-foreground block mt-1">
                    {nf.format(selectedCompanyForCredits.creditsConsumed || 0)}
                  </span>
                </div>
                <div className="rounded-xl border border-border p-3 text-center bg-card">
                  <span className="text-[10px] text-muted-foreground block uppercase">Balance</span>
                  <span className="font-mono text-sm font-semibold text-emerald-400 block mt-1">
                    {nf.format((selectedCompanyForCredits.totalCredits || 0) - (selectedCompanyForCredits.creditsConsumed || 0))}
                  </span>
                </div>
              </div>

              {/* Credits Override Input */}
              <div className="space-y-1.5">
                <label htmlFor="credits-override" className="text-sm font-medium text-foreground">
                  {t.admin.modalTotalLabel}
                </label>
                <div className="relative">
                  <input
                    id="credits-override"
                    type="number"
                    min="0"
                    value={creditsInput}
                    onChange={(e) => setCreditsInput(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full rounded-xl border border-border bg-muted/30 py-3 px-4 font-mono text-lg font-semibold text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <Coins className="absolute right-4 top-3.5 h-5 w-5 text-muted-foreground/60" />
                </div>
              </div>

              {/* Presets */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  {t.admin.modalQuickPresets}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setCreditsInput(5000)}
                    className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:border-accent hover:text-accent font-medium font-mono"
                  >
                    5k
                  </button>
                  <button
                    onClick={() => setCreditsInput(15000)}
                    className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:border-accent hover:text-accent font-medium font-mono"
                  >
                    15k
                  </button>
                  <button
                    onClick={() => setCreditsInput(50000)}
                    className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:border-accent hover:text-accent font-medium font-mono"
                  >
                    50k
                  </button>
                  <button
                    onClick={() => setCreditsInput(100000)}
                    className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:border-accent hover:text-accent font-medium font-mono"
                  >
                    100k
                  </button>
                  <div className="w-px h-5 bg-border self-center mx-1" />
                  <button
                    onClick={() => setCreditsInput(prev => prev + 1000)}
                    className="rounded-lg border border-accent/20 bg-accent/5 px-2.5 py-1 text-xs text-accent hover:bg-accent/10 font-medium font-mono"
                  >
                    +1k
                  </button>
                  <button
                    onClick={() => setCreditsInput(prev => prev + 5000)}
                    className="rounded-lg border border-accent/20 bg-accent/5 px-2.5 py-1 text-xs text-accent hover:bg-accent/10 font-medium font-mono"
                  >
                    +5k
                  </button>
                  <button
                    onClick={() => setCreditsInput(prev => prev + 10000)}
                    className="rounded-lg border border-accent/20 bg-accent/5 px-2.5 py-1 text-xs text-accent hover:bg-accent/10 font-medium font-mono"
                  >
                    +10k
                  </button>
                </div>
              </div>

              {/* Status and Diagnostics */}
              {modalError && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive animate-shake">
                  <CircleAlert className="h-4 w-4 shrink-0" />
                  {modalError}
                </div>
              )}

              {modalSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
                  <Check className="h-4 w-4 shrink-0" />
                  {t.admin.modalSuccess}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setSelectedCompanyForCredits(null)}
                disabled={isPending}
                className="flex-1 rounded-xl border border-border bg-card py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreditsSave}
                disabled={isPending}
                className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                {isPending ? t.admin.modalSaving : "Assign Credits"}
              </button>
            </div>
          </div>
        </div>
      )}
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
    <div className={`rounded-2xl border p-5 transition-all duration-200 ${accent ? "glow-border hover:shadow-lg hover:shadow-accent/5" : "border-border bg-card hover:bg-card/80 hover:border-border/80"}`}>
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
    <div className={`rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-border/80 ${className ?? ""}`}>
      <h3 className="font-medium text-foreground">{title}</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-4">{children}</div>
    </div>
  )
}
