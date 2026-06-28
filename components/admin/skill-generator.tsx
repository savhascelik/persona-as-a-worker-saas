"use client"

import { useState, useTransition } from "react"
import { Loader2, Sparkles, Wand2, X } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"
import { generateSkillDraftAction, saveSkillTemplateAction } from "@/app/actions"
import { resolveSkillIcon } from "@/lib/skill-icons"
import { Field, Textarea } from "@/components/dashboard/form-primitives"
import type { SkillTemplate } from "@/lib/types"

type Draft = Omit<SkillTemplate, "id" | "entityType" | "createdAt">

export function SkillGenerator({ onSaved }: { onSaved?: (skill: SkillTemplate) => void }) {
  const { t } = useI18n()
  const [prompt, setPrompt] = useState("")
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, startGenerate] = useTransition()
  const [isSaving, startSave] = useTransition()

  function generate() {
    setError(null)
    startGenerate(async () => {
      const res = await generateSkillDraftAction(prompt)
      if (res.ok) setDraft({ ...res.draft, prompt })
      else setError(res.error)
    })
  }

  function save() {
    if (!draft) return
    startSave(async () => {
      const res = await saveSkillTemplateAction(draft)
      if ("skill" in res && res.ok) {
        onSaved?.(res.skill)
        setDraft(null)
        setPrompt("")
      } else if (!res.ok) {
        setError(res.error)
      }
    })
  }

  const DraftIcon = draft ? resolveSkillIcon(draft.iconName) : Sparkles

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 text-accent">
          <Wand2 className="h-4 w-4" />
        </span>
        <div>
          <h3 className="font-medium text-foreground">{t.generator.title}</h3>
          <p className="text-xs text-muted-foreground">{t.generator.desc}</p>
        </div>
      </div>

      <div className="mt-4">
        <Field label={t.generator.promptLabel} htmlFor="skill-prompt">
          <Textarea
            id="skill-prompt"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t.generator.promptPlaceholder}
          />
        </Field>
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <button
        type="button"
        onClick={generate}
        disabled={isGenerating || prompt.trim().length < 8}
        className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
      >
        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {isGenerating ? t.generator.generating : t.generator.generate}
      </button>

      {/* Generated draft preview */}
      {draft && (
        <div className="mt-5 rounded-xl border border-accent/30 bg-accent/[0.04] p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 text-accent">
              <DraftIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{draft.name}</p>
              <p className="mt-0.5 text-pretty text-sm text-muted-foreground">{draft.summary}</p>
            </div>
            <button
              type="button"
              aria-label={t.generator.discard}
              onClick={() => setDraft(null)}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{t.generator.tools}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {draft.requiredTools.map((tool) => (
                <code
                  key={tool}
                  className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                >
                  {tool}
                </code>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{t.generator.verbs}</p>
            <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
              {draft.activityVerbs.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={isSaving}
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSaving ? t.generator.saving : t.generator.save}
          </button>
        </div>
      )}
    </div>
  )
}
