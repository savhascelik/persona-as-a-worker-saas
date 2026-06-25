"use client"

import { useState, useTransition } from "react"
import { useI18n } from "@/components/i18n-provider"
import { createCompanyAction } from "@/app/actions"
import type { Company } from "@/lib/types"
import { Field, Modal, inputClass } from "./form-primitives"

export function ConnectPlatformForm({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated?: (company: Company) => void
}) {
  const { t } = useI18n()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function action(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createCompanyAction(formData)
      if (result.ok) {
        onCreated?.(result.company)
        onClose()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Modal title={t.connect.title} description={t.connect.desc} onClose={onClose} closeLabel={t.connect.cancel}>
      <form action={action} className="mt-6 space-y-5">
        <Field label={t.connect.name}>
          <input name="name" required placeholder={t.connect.namePlaceholder} className={inputClass} />
        </Field>
        <Field label={t.connect.domain}>
          <input name="domain" required placeholder={t.connect.domainPlaceholder} className={inputClass} />
        </Field>
        <Field label={t.connect.baseUrl}>
          <input
            name="baseUrl"
            type="url"
            required
            placeholder={t.connect.baseUrlPlaceholder}
            className={`${inputClass} font-mono text-xs`}
          />
        </Field>

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
            {t.connect.cancel}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-10 items-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isPending ? t.connect.submitting : t.connect.submit}
          </button>
        </div>
      </form>
    </Modal>
  )
}
