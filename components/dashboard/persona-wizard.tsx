"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"
import { useSkills } from "@/components/skills-provider"
import { createPersonaWithSkills, updatePersonaAction } from "@/app/actions/persona-actions"
import { MAX_SKILLS } from "@/lib/skills"
import type { Company, Persona } from "@/lib/types"
import { Field, Modal, inputClass } from "./form-primitives"
import { SkillMarketplace } from "./skill-marketplace"
import { CustomSkillModal } from "./custom-skill-modal"

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "UTC",
]

export function PersonaWizard({
  companies,
  defaultCompanyId,
  defaultSkillIds,
  persona,
  onClose,
}: {
  companies: Company[]
  defaultCompanyId?: string
  defaultSkillIds?: string[]
  persona?: Persona
  onClose: () => void
}) {
  const { t } = useI18n()
  const { skillMap } = useSkills()
  const isEdit = Boolean(persona)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [skillIds, setSkillIds] = useState<string[]>(
    persona?.skillIds ?? defaultSkillIds?.slice(0, MAX_SKILLS) ?? [],
  )
  const [companyId, setCompanyId] = useState(persona?.companyId ?? defaultCompanyId ?? companies[0]?.id ?? "")

  const router = useRouter()
  const [customOpen, setCustomOpen] = useState(false)
  const activeCompany = companies.find((c) => c.id === companyId)
  const discoveredTools = activeCompany?.discoveredTools ?? []

  function handleCustomSkillSaved(skillId: string) {
    router.refresh()
    setSkillIds((prev) => {
      if (prev.includes(skillId)) return prev
      if (prev.length >= MAX_SKILLS) return prev
      return [...prev, skillId]
    })
  }

  function toggleSkill(id: string) {
    setSkillIds((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id)
      if (prev.length >= MAX_SKILLS) return prev
      return [...prev, id]
    })
  }

  function next() {
    setError(null)
    setStep((s) => Math.min(3, s + 1))
  }
  function back() {
    setError(null)
    setStep((s) => Math.max(1, s - 1))
  }

  function action(formData: FormData) {
    setError(null)
    // Inject controlled values that live outside native inputs.
    formData.set("companyId", companyId)
    formData.delete("skillIds")
    skillIds.forEach((id) => formData.append("skillIds", id))
    startTransition(async () => {
      const result = isEdit
        ? await updatePersonaAction(persona!.id, formData)
        : await createPersonaWithSkills(formData)
      if (result.ok) {
        onClose()
      } else {
        setError(result.error)
        // Surface identity/skill errors on their relevant step.
        if (result.error.toLowerCase().includes("skill")) setStep(2)
        else if (!result.error.toLowerCase().includes("latency")) setStep(1)
      }
    })
  }

  const steps = [t.wizard.step1, t.wizard.step2, t.wizard.step3]

  return (
    <Modal
      title={isEdit ? t.form.editTitle : t.form.createTitle}
      description={[t.wizard.step1Desc, t.wizard.step2Desc, t.wizard.step3Desc][step - 1]}
      onClose={onClose}
      closeLabel={t.form.cancel}
    >
      {/* Stepper */}
      <ol className="mt-5 flex items-center gap-2">
        {steps.map((label, i) => {
          const index = i + 1
          const isDone = index < step
          const isCurrent = index === step
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                  isCurrent
                    ? "bg-foreground text-background"
                    : isDone
                      ? "bg-accent text-accent-foreground"
                      : "border border-border text-muted-foreground"
                }`}
              >
                {isDone ? <Check className="h-3 w-3" /> : index}
              </span>
              <span className={`hidden truncate text-xs sm:block ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
              {index < steps.length && <span className="h-px flex-1 bg-border" />}
            </li>
          )
        })}
      </ol>

      <form action={action} className="mt-6 space-y-5">
        {/* Step 1: Basic Identity */}
        <div className={step === 1 ? "space-y-5" : "hidden"}>
          <Field label={t.form.company}>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputClass}>
              {companies.length === 0 && <option value="">{t.tenant.noCompany}</option>}
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.form.name}>
              <input name="name" defaultValue={persona?.name} placeholder={t.form.namePlaceholder} className={inputClass} />
            </Field>
            <Field label={t.form.role}>
              <input name="role" defaultValue={persona?.role} placeholder={t.form.rolePlaceholder} className={inputClass} />
            </Field>
          </div>
          <Field label={t.form.platform}>
            <input name="platform" defaultValue={persona?.platform} placeholder={t.form.platformPlaceholder} className={inputClass} />
          </Field>
          <Field label={t.form.mcpUrl}>
            <input
              name="mcpUrl"
              type="url"
              defaultValue={persona?.mcpUrl}
              placeholder={t.form.mcpPlaceholder}
              className={`${inputClass} font-mono text-xs`}
            />
          </Field>
        </div>

        {/* Step 2: Skill Selection */}
        <div className={step === 2 ? "space-y-4" : "hidden"}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{t.skills.marketplace}</span>
            <span className="text-xs text-muted-foreground">
              {skillIds.length}/{MAX_SKILLS}
            </span>
          </div>
          <SkillMarketplace
            selected={skillIds}
            onToggle={toggleSkill}
            discoveredTools={discoveredTools}
            onAddCustomClick={() => setCustomOpen(true)}
          />
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.wizard.selectedSkills}</p>
            <p className="mt-1 text-sm text-foreground">
              {skillIds.length === 0 ? t.wizard.none : skillIds.map((id) => skillMap[id]?.name ?? id).join(", ")}
            </p>
          </div>
        </div>

        {/* Step 3: Schedule & Pacing */}
        <div className={step === 3 ? "space-y-5" : "hidden"}>
          <Field label={t.form.timezone}>
            <select name="timezone" defaultValue={persona?.timezone ?? "America/New_York"} className={inputClass}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t.form.workStart}>
              <input name="workStartHour" type="number" min={0} max={23} defaultValue={persona?.workStartHour ?? 9} className={inputClass} />
            </Field>
            <Field label={t.form.workEnd}>
              <input name="workEndHour" type="number" min={0} max={23} defaultValue={persona?.workEndHour ?? 18} className={inputClass} />
            </Field>
            <Field label={t.form.postsPerDay}>
              <input name="postsPerDay" type="number" min={1} max={50} defaultValue={persona?.postsPerDay ?? 2} className={inputClass} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.form.minLatency}>
              <input name="minLatencySeconds" type="number" min={0} defaultValue={persona?.minLatencySeconds ?? 30} className={inputClass} />
            </Field>
            <Field label={t.form.maxLatency}>
              <input name="maxLatencySeconds" type="number" min={1} defaultValue={persona?.maxLatencySeconds ?? 240} className={inputClass} />
            </Field>
          </div>
        </div>

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            {t.wizard.step} {step} {t.wizard.of} 3
          </span>
          <div className="flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={back}
                className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent/10"
              >
                {t.wizard.back}
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={next}
                className="inline-flex h-10 items-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                {t.wizard.next}
              </button>
            ) : (
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex h-10 items-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isPending ? t.wizard.deploying : isEdit ? t.form.save : t.wizard.deploy}
              </button>
            )}
          </div>
        </div>
      </form>

      {customOpen && (
        <CustomSkillModal
          discoveredTools={discoveredTools}
          onClose={() => setCustomOpen(false)}
          onSaved={handleCustomSkillSaved}
        />
      )}
    </Modal>
  )
}
