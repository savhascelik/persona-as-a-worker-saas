"use client"

import { Check, Plus, AlertCircle } from "lucide-react"
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

  const hasTools = discoveredTools && discoveredTools.length > 0
  const toolSet = new Set((discoveredTools || []).map((t) => t.trim().toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {skills.map((skill) => {
          const isSelected = selected.includes(skill.id)
          const missingTools = skill.requiredTools.filter((t) => !toolSet.has(t.trim().toLowerCase()))
          const isCompatible = !hasTools || missingTools.length === 0
          
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
              className={`group flex items-start gap-4 rounded-xl border p-4 text-left transition-all ${
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
                    <span className="font-medium text-foreground">{skill.name}</span>
                    {hasTools && (
                      isCompatible ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500 border border-emerald-500/20">
                          Compatible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive border border-destructive/20">
                          <AlertCircle className="h-3 w-3" />
                          Missing Tools
                        </span>
                      )
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
                <p className="mt-1 text-pretty text-sm text-muted-foreground">{skill.summary}</p>
                
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t.skills.requires}:
                  </span>
                  {skill.requiredTools.map((tool) => {
                    const isToolMissing = hasTools && !toolSet.has(tool.trim().toLowerCase())
                    return (
                      <code
                        key={tool}
                        className={`rounded border px-1.5 py-0.5 font-mono text-[11px] transition-colors ${
                          isToolMissing
                            ? "border-destructive/30 bg-destructive/5 text-destructive"
                            : hasTools
                              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-500"
                              : "border-border bg-muted text-muted-foreground"
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
        })}
      </div>
      
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
