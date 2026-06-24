"use client"

import { useState, useTransition } from "react"
import { X } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"
import { createPersonaAction, updatePersonaAction } from "@/app/actions"
import type { Persona } from "@/lib/types"

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

export function PersonaForm({
  persona,
  onClose,
}: {
  persona?: Persona
  onClose: () => void
}) {
  const { t } = useI18n()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isEdit = Boolean(persona)

  function action(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = isEdit
        ? await updatePersonaAction(persona!.id, formData)
        : await createPersonaAction(formData)
      if (result.ok) {
        onClose()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="glow-border max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl rounded-b-none bg-card p-6 sm:rounded-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{isEdit ? t.form.editTitle : t.form.createTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.form.createDesc}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.form.cancel}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={action} className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.form.name}>
              <input name="name" required defaultValue={persona?.name} placeholder={t.form.namePlaceholder} className={inputClass} />
            </Field>
            <Field label={t.form.role}>
              <input name="role" required defaultValue={persona?.role} placeholder={t.form.rolePlaceholder} className={inputClass} />
            </Field>
          </div>

          <Field label={t.form.platform}>
            <input name="platform" required defaultValue={persona?.platform} placeholder={t.form.platformPlaceholder} className={inputClass} />
          </Field>

          <Field label={t.form.mcpUrl}>
            <input name="mcpUrl" type="url" defaultValue={persona?.mcpUrl} placeholder={t.form.mcpPlaceholder} className={`${inputClass} font-mono text-xs`} />
          </Field>

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

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent/10"
            >
              {t.form.cancel}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-10 items-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isPending ? t.form.submitting : isEdit ? t.form.save : t.form.deploy}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
