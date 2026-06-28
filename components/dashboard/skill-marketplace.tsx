"use client"

import { useState, useMemo } from "react"
import { Check, Plus, AlertCircle, Search, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"
import { useSkills } from "@/components/skills-provider"
import { MAX_SKILLS } from "@/lib/skills"

export function SkillMarketplace({
  selected,
  onToggle,
  discoveredTools,
  onAddCustomClick,
}: {
  selected: string[]
  onToggle: (id: string) => void
  discoveredTools?: string[]
  onAddCustomClick?: () => void
}) {
  const { t } = useI18n()
  const { skills } = useSkills()
  const atLimit = selected.length >= MAX_SKILLS

  // Search & Filtering states
  const [searchQuery, setSearchQuery] = useState("")
  const [showIncompatible, setShowIncompatible] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 3

  const toolSet = useMemo(() => {
    return new Set((discoveredTools || []).map((t) => t.trim().toLowerCase()))
  }, [discoveredTools])

  // Filter skills based on search query and compatibility toggle
  const filteredSkills = useMemo(() => {
    return skills.filter((skill) => {
      const missingTools = skill.requiredTools.filter((t) => !toolSet.has(t.trim().toLowerCase()))
      const isCompatible = missingTools.length === 0

      // Match search query
      const matchesSearch =
        skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.requiredTools.some((tool) => tool.toLowerCase().includes(searchQuery.toLowerCase()))

      if (!matchesSearch) return false

      // Match compatibility filter: if showIncompatible is false, only show compatible ones
      if (!showIncompatible && !isCompatible) return false

      return true
    })
  }, [skills, searchQuery, showIncompatible, toolSet])

  // Pagination calculations
  const totalPages = Math.ceil(filteredSkills.length / PAGE_SIZE) || 1
  const paginatedSkills = useMemo(() => {
    // Clamp current page just in case filters changed the count
    const safePage = Math.min(currentPage, totalPages)
    const start = (safePage - 1) * PAGE_SIZE
    return filteredSkills.slice(start, start + PAGE_SIZE)
  }, [filteredSkills, currentPage, totalPages])

  // Adjust page if current index exceeds range
  if (currentPage > totalPages) {
    setCurrentPage(totalPages)
  }

  return (
    <div className="space-y-4">
      {/* Search & Toggle Controls Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Search skills or required tools..."
            className="h-9 w-full rounded-md border border-border bg-background/50 pl-9 pr-4 text-xs text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Compatibility Toggle Button */}
        <button
          type="button"
          onClick={() => {
            setShowIncompatible((prev) => !prev)
            setCurrentPage(1)
          }}
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-all duration-200 ${
            showIncompatible
              ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/15"
              : "border-border bg-background/40 text-muted-foreground hover:bg-accent/5 hover:text-foreground"
          }`}
        >
          {showIncompatible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          <span>{showIncompatible ? "Hide Incompatible" : "Show Incompatible"}</span>
        </button>
      </div>

      {/* Skills List */}
      <div className="grid gap-3">
        {paginatedSkills.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 bg-background/15 py-8 text-center">
            <AlertCircle className="h-6 w-6 text-muted-foreground/60 mb-2" />
            <p className="text-xs font-medium text-foreground/80">No skills match your criteria</p>
            <p className="mt-1 text-[10px] text-muted-foreground max-w-[200px]">
              Try clearing your search or enabling "Show Incompatible" to see all catalog skills.
            </p>
          </div>
        ) : (
          paginatedSkills.map((skill) => {
            const isSelected = selected.includes(skill.id)
            const missingTools = skill.requiredTools.filter((t) => !toolSet.has(t.trim().toLowerCase()))
            const isCompatible = missingTools.length === 0
            
            // Disable if selected limit is reached, or if it is incompatible on this platform and not currently selected
            const isDisabled = (!isSelected && atLimit) || (!isCompatible && !isSelected)
            const Icon = skill.icon

            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => onToggle(skill.id)}
                disabled={isDisabled}
                aria-pressed={isSelected}
                className={`group flex items-start gap-4 rounded-xl border p-4 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-accent/60 bg-accent/10 shadow-[0_0_12px_rgba(var(--accent-rgb),0.05)]"
                    : !isCompatible
                      ? "border-destructive/20 bg-destructive/5 opacity-65 hover:border-destructive/30"
                      : "border-border bg-background/40 hover:border-border/80 disabled:cursor-not-allowed disabled:opacity-40"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                    isSelected
                      ? "border-accent/50 bg-accent/15 text-accent"
                      : !isCompatible
                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-foreground text-sm">{skill.name}</span>
                      {isCompatible ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500 border border-emerald-500/20">
                          Compatible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive border border-destructive/20">
                          <AlertCircle className="h-3 w-3" />
                          Missing Tools
                        </span>
                      )}
                    </div>
                    <span
                      className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors ${
                        isSelected
                          ? "bg-accent text-accent-foreground"
                          : !isCompatible
                            ? "border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/10"
                            : "border border-border text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      {isSelected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      {isSelected ? t.skills.added : t.skills.add}
                    </span>
                  </div>
                  <p className="mt-1 text-pretty text-xs text-muted-foreground leading-normal">{skill.summary}</p>
                  
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {t.skills.requires}:
                    </span>
                    {skill.requiredTools.map((tool) => {
                      const isToolMissing = !toolSet.has(tool.trim().toLowerCase())
                      return (
                        <code
                          key={tool}
                          className={`rounded border px-1.5 py-0.5 font-mono text-[10px] transition-colors ${
                            isToolMissing
                              ? "border-destructive/30 bg-destructive/5 text-destructive"
                              : "border-emerald-500/30 bg-emerald-500/5 text-emerald-500"
                          }`}
                        >
                          {tool}
                        </code>
                      )
                    })}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Pagination Controls Row */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/20 pt-2 text-xs">
          <span className="text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1} -{" "}
            {Math.min(currentPage * PAGE_SIZE, filteredSkills.length)} of {filteredSkills.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background/30 hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background/30 hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
      
      {/* Footer Limits & Create Custom Skill Row */}
      <div className="flex items-center justify-between border-t border-border/40 pt-3">
        {atLimit ? (
          <p className="text-xs text-muted-foreground">{t.skills.limitReached}.</p>
        ) : (
          <div />
        )}
        
        {onAddCustomClick && (
          <button
            type="button"
            onClick={onAddCustomClick}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-accent/40 bg-accent/5 px-3 text-xs font-medium text-accent transition-colors hover:bg-accent/15"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Custom Skill
          </button>
        )}
      </div>
    </div>
  )
}
