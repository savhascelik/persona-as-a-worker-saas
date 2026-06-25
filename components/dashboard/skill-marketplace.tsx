"use client"

import { Check, Plus } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"
import { MAX_SKILLS, SKILLS } from "@/lib/skills"

export function SkillMarketplace({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (id: string) => void
}) {
  const { t } = useI18n()
  const atLimit = selected.length >= MAX_SKILLS

  return (
    <div className="grid gap-3">
      {SKILLS.map((skill) => {
        const isSelected = selected.includes(skill.id)
        const isDisabled = !isSelected && atLimit
        const Icon = skill.icon
        return (
          <button
            key={skill.id}
            type="button"
            onClick={() => onToggle(skill.id)}
            disabled={isDisabled}
            aria-pressed={isSelected}
            className={`group flex items-start gap-4 rounded-xl border p-4 text-left transition-colors ${
              isSelected
                ? "border-accent/60 bg-accent/10"
                : "border-border bg-background/40 hover:border-border/80 disabled:cursor-not-allowed disabled:opacity-40"
            }`}
          >
            <span
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                isSelected ? "border-accent/50 bg-accent/15 text-accent" : "border-border bg-background text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-foreground">{skill.name}</span>
                <span
                  className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium ${
                    isSelected ? "bg-accent text-accent-foreground" : "border border-border text-muted-foreground"
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
                {skill.requiredTools.map((tool) => (
                  <code
                    key={tool}
                    className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                  >
                    {tool}
                  </code>
                ))}
              </div>
            </div>
          </button>
        )
      })}
      {atLimit && <p className="text-xs text-muted-foreground">{t.skills.limitReached}.</p>}
    </div>
  )
}
