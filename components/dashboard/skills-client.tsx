"use client"

import { useState, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Sparkles,
  Search,
  Plus,
  AlertCircle,
  Building2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Database,
  SlidersHorizontal,
  Workflow,
  Eye,
  ShieldAlert,
  Pencil,
  Copy,
} from "lucide-react"
import { useI18n } from "@/components/i18n-provider"
import { useSession } from "@/components/session-provider"
import { useSkills } from "@/components/skills-provider"
import { deleteSkillTemplateAction } from "@/app/actions"
import { CustomSkillModal } from "./custom-skill-modal"
import { DashboardHeader } from "./dashboard-header"

import type { Company, SkillTemplate } from "@/lib/types"

export function SkillsClient({
  companies,
  customSkills,
}: {
  companies: Company[]
  customSkills: SkillTemplate[]
}) {
  const { t } = useI18n()
  const router = useRouter()
  const { skills } = useSkills()
  const { activeCompanyId, setActiveCompanyId } = useSession()
  const [customOpen, setCustomOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit" | "copy">("create")
  const [selectedSkillForModal, setSelectedSkillForModal] = useState<any>(undefined)
  
  // Transitions for deleting custom skills
  const [isPending, startTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleOpenCreate() {
    setModalMode("create")
    setSelectedSkillForModal(undefined)
    setCustomOpen(true)
  }

  function handleOpenEdit(skill: any) {
    setModalMode("edit")
    setSelectedSkillForModal(skill)
    setCustomOpen(true)
  }

  function handleOpenCopy(skill: any) {
    setModalMode("copy")
    setSelectedSkillForModal(skill)
    setCustomOpen(true)
  }

  // Filters State
  const [searchQuery, setSearchQuery] = useState("")
  const [sourceFilter, setSourceFilter] = useState<"all" | "builtin" | "custom">("all")
  const [compatibilityFilter, setCompatibilityFilter] = useState<"all" | "compatible">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 6

  const activeCompany = useMemo(() => {
    return activeCompanyId ? companies.find((c) => c.id === activeCompanyId) : undefined
  }, [companies, activeCompanyId])

  const toolSet = useMemo(() => {
    return new Set((activeCompany?.discoveredTools || []).map((t) => t.trim().toLowerCase()))
  }, [activeCompany])

  // Filter skills based on search, source, and compatibility filters
  const filteredSkills = useMemo(() => {
    return skills.filter((skill) => {
      // 1. Search Query Match
      const matchesSearch =
        skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.requiredTools.some((tool) => tool.toLowerCase().includes(searchQuery.toLowerCase()))

      if (!matchesSearch) return false

      // 2. Source Filter Match
      if (sourceFilter === "builtin" && skill.custom) return false
      if (sourceFilter === "custom" && !skill.custom) return false

      // 3. Compatibility Filter Match
      if (compatibilityFilter === "compatible") {
        const missingTools = skill.requiredTools.filter((t) => !toolSet.has(t.trim().toLowerCase()))
        if (missingTools.length > 0) return false
      }

      return true
    })
  }, [skills, searchQuery, sourceFilter, compatibilityFilter, toolSet])

  // Pagination Calculations
  const totalPages = Math.ceil(filteredSkills.length / PAGE_SIZE) || 1
  const paginatedSkills = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages)
    const start = (safePage - 1) * PAGE_SIZE
    return filteredSkills.slice(start, start + PAGE_SIZE)
  }, [filteredSkills, currentPage, totalPages])

  // If page overflows, adjust state
  if (currentPage > totalPages) {
    setCurrentPage(totalPages)
  }

  function handleDeleteSkill(id: string) {
    if (!confirm("Are you sure you want to delete this custom skill? Any active personas using this skill will revert to general platform seeding.")) {
      return
    }
    setDeleteError(null)
    startTransition(async () => {
      const res = await deleteSkillTemplateAction(id)
      if (res.ok) {
        router.refresh()
      } else if ('error' in res) {
        setDeleteError(res.error)
      }
    })
  }

  function handleCustomSkillSaved(skillId: string) {
    router.refresh()
  }

  const countBySource = useMemo(() => {
    const builtinCount = skills.filter((s) => !s.custom).length
    const customCount = skills.filter((s) => s.custom).length
    return { builtin: builtinCount, custom: customCount, total: skills.length }
  }, [skills])

  return (
    <div className="min-h-dvh pb-12">
      <DashboardHeader companies={companies} />

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Breadcrumb / Top Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{t.nav.dashboard}</span>
              <span>/</span>
              <span className="text-foreground font-medium">Skills Catalog</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Workflow className="h-6 w-6 text-accent" />
              Skills Directory
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage built-in and dynamically connected custom skills driven by company MCP tools.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            disabled={companies.length === 0}
            className="inline-flex h-10 items-center gap-2 self-start rounded-lg bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Create Custom Skill
          </button>
        </div>

        {/* Info Alerts */}
        {deleteError && (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{deleteError}</p>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
          {/* Left Sidebar: Filtering Workspace Connection & Statistics */}
          <aside className="flex flex-col gap-5">
            {/* Active Company Picker (Context-driven tool evaluation) */}
            <div className="rounded-xl border border-border bg-card/30 backdrop-blur-md p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                Active Context
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Evaluating skill compatibility based on scanned tools from:
              </p>
              <select
                value={activeCompanyId ?? ""}
                onChange={(e) => setActiveCompanyId(e.target.value || null)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-accent"
              >
                <option value="">No Active Company (All Incompatible)</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {activeCompany ? (
                <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-xs text-emerald-500">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5" />
                    Real Tools Discovered ({activeCompany.discoveredTools?.length || 0})
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1 font-mono text-[10px]">
                    {activeCompany.discoveredTools?.map((tool) => (
                      <code key={tool} className="rounded border border-emerald-500/15 bg-emerald-500/10 px-1 py-0.5">
                        {tool}
                      </code>
                    )) || <span className="text-muted-foreground italic">None</span>}
                  </div>
                </div>
              ) : (
                <div className="rounded border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground italic">
                  Select a company above to inspect true tool compatibility in real-time.
                </div>
              )}
            </div>

            {/* Catalog Breakdown */}
            <div className="rounded-xl border border-border bg-card/30 backdrop-blur-md p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Catalog Breakdown
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Built-in Skills:</span>
                  <span className="font-semibold text-foreground">{countBySource.builtin}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Custom Created:</span>
                  <span className="font-semibold text-foreground">{countBySource.custom}</span>
                </div>
                <div className="border-t border-border/40 pt-2 flex items-center justify-between font-semibold text-foreground">
                  <span>Total Available:</span>
                  <span>{countBySource.total}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Main Grid: Filter Inputs & Results list */}
          <main className="space-y-6">
            {/* Filter Bar Controls */}
            <div className="rounded-xl border border-border bg-card/30 backdrop-blur-md p-4 flex flex-col gap-4 md:flex-row md:items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="Search skills catalog by name, description, or required tools..."
                  className="h-9 w-full rounded-md border border-border bg-background/50 pl-9 pr-4 text-xs text-foreground outline-none focus:border-accent"
                />
              </div>

              {/* Source Filters tabs */}
              <div className="flex rounded-lg border border-border bg-background/40 p-0.5 shrink-0 self-start md:self-auto">
                {(["all", "builtin", "custom"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setSourceFilter(tab)
                      setCurrentPage(1)
                    }}
                    className={`h-8 rounded-md px-3 text-xs font-medium capitalize transition-all duration-200 ${
                      sourceFilter === tab
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === "builtin" ? "Built-in" : tab}
                  </button>
                ))}
              </div>

              {/* Compatibility Filter Dropdown */}
              <select
                value={compatibilityFilter}
                onChange={(e) => {
                  setCompatibilityFilter(e.target.value as "all" | "compatible")
                  setCurrentPage(1)
                }}
                className="h-9 rounded-md border border-border bg-background/50 px-3 text-xs text-foreground outline-none focus:border-accent shrink-0"
              >
                <option value="all">All Compatibility</option>
                <option value="compatible">Compatible Only</option>
              </select>
            </div>

            {/* Results Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {paginatedSkills.length === 0 ? (
                <div className="sm:col-span-2 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/20 py-16 text-center">
                  <SlidersHorizontal className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-semibold text-foreground">No matching skills found</p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-[280px]">
                    Try loosening your search filters, switching source, or ensuring compatibility mode is disabled.
                  </p>
                </div>
              ) : (
                paginatedSkills.map((skill) => {
                  const missingTools = skill.requiredTools.filter((t) => !toolSet.has(t.trim().toLowerCase()))
                  const isCompatible = missingTools.length === 0
                  const Icon = skill.icon

                  return (
                    <div
                      key={skill.id}
                      className="group relative flex flex-col rounded-xl border border-border bg-card/20 hover:bg-card/45 p-5 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] overflow-hidden"
                    >
                      {/* Premium Accent Line */}
                      <div className={`absolute top-0 left-0 right-0 h-[2px] ${skill.custom ? "bg-accent/40" : "bg-border/60"}`} />

                      <div className="flex items-start justify-between gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                          skill.custom
                            ? "border-accent/30 bg-accent/10 text-accent"
                            : "border-border bg-background text-muted-foreground"
                        }`}>
                          <Icon className="h-5 w-5" />
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Built-in vs Custom Badge */}
                          <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${
                            skill.custom
                              ? "bg-accent/15 border border-accent/20 text-accent"
                              : "bg-muted border border-border text-muted-foreground"
                          }`}>
                            {skill.custom ? "Custom" : "Built-in"}
                          </span>

                          {/* Compatibility Badge */}
                          {isCompatible ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-500 border border-emerald-500/20 uppercase tracking-wide">
                              Compatible
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[9px] font-bold text-destructive border border-destructive/20 uppercase tracking-wide">
                              <AlertCircle className="h-2.5 w-2.5" />
                              Missing Tools
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex-1">
                        <h3 className="font-semibold text-foreground text-base group-hover:text-accent transition-colors duration-200">
                          {skill.name}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          {skill.summary}
                        </p>

                        {/* Required Tools */}
                        <div className="mt-4 space-y-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                            Required Platform Tools:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {skill.requiredTools.map((tool) => {
                              const isToolMissing = !toolSet.has(tool.trim().toLowerCase())
                              return (
                                <code
                                  key={tool}
                                  className={`rounded px-1.5 py-0.5 font-mono text-[9px] border transition-colors ${
                                    isToolMissing
                                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                  }`}
                                >
                                  {tool}
                                </code>
                              )
                            })}
                          </div>
                        </div>

                        {/* Activity Verbs Details */}
                        {skill.activityVerbs && skill.activityVerbs.length > 0 && (
                          <div className="mt-4 border-t border-border/40 pt-3">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                              Execution Actions / Verbs:
                            </span>
                            <ul className="mt-1.5 space-y-1 text-[11px] text-muted-foreground italic list-disc pl-3">
                              {skill.activityVerbs.slice(0, 3).map((v) => (
                                <li key={v}>{v}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Actions Bar */}
                      <div className="mt-5 border-t border-border/40 pt-3 flex items-center justify-end gap-2">
                        {/* Copy Button (for all skills) */}
                        <button
                          type="button"
                          onClick={() => handleOpenCopy(skill)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-border/60 bg-background/20 px-2.5 text-xs font-medium text-muted-foreground hover:bg-accent/10 hover:text-foreground active:scale-95 transition-all"
                          title="Copy/Duplicate this skill"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Duplicate
                        </button>

                        {/* Edit Button (custom skills only) */}
                        {skill.custom && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(skill)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-accent/20 bg-accent/5 px-2.5 text-xs font-medium text-accent hover:bg-accent/15 active:scale-95 transition-all"
                            title="Edit this custom skill"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        )}

                        {/* Delete Button (custom skills only) */}
                        {skill.custom && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleDeleteSkill(skill.id)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
                            title="Delete this custom skill"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border/20 pt-4 text-xs">
                <span className="text-muted-foreground">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1} -{" "}
                  {Math.min(currentPage * PAGE_SIZE, filteredSkills.length)} of {filteredSkills.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background/30 hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background/30 hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {customOpen && (
        <CustomSkillModal
          discoveredTools={activeCompany?.discoveredTools || []}
          onClose={() => {
            setCustomOpen(false)
            setSelectedSkillForModal(undefined)
          }}
          onSaved={handleCustomSkillSaved}
          initialSkill={selectedSkillForModal}
          mode={modalMode}
        />
      )}
    </div>
  )
}
