"use client"

import { useState, useTransition } from "react"
import { Check, Loader2, Radar, Wrench, Plus, Trash } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"
import { useSkills } from "@/components/skills-provider"
import { createCompanyAction, scanEndpointAction } from "@/app/actions"
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
  const { skillMap } = useSkills()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [mcpUrls, setMcpUrls] = useState<string[]>([""])
  const [scanning, setScanning] = useState(false)
  const [scan, setScan] = useState<{ tools: string[]; suggested: string[]; isSimulated?: boolean } | null>(null)

  const combinedUrl = mcpUrls.map((u) => u.trim()).filter(Boolean).join(",")

  async function runScan() {
    if (!combinedUrl) return
    setError(null)
    setScan(null)
    setScanning(true)
    try {
      const result = await scanEndpointAction(combinedUrl)
      if (result.ok) {
        setScan({ tools: result.tools, suggested: result.compatibleSkillIds, isSimulated: result.isSimulated })
      } else {
        setError(result.error)
      }
    } catch (e: any) {
      setError(e.message || "Failed to scan endpoint.")
    } finally {
      setScanning(false)
    }
  }

  function action(formData: FormData) {
    setError(null)
    formData.set("baseUrl", combinedUrl)
    formData.delete("suggestedSkillIds")
    scan?.suggested.forEach((id) => formData.append("suggestedSkillIds", id))
    formData.delete("discoveredTools")
    scan?.tools.forEach((tool) => formData.append("discoveredTools", tool))
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
          <div className="space-y-3">
            {mcpUrls.map((url, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  required
                  value={url}
                  onChange={(e) => {
                    const next = [...mcpUrls]
                    next[index] = e.target.value
                    setMcpUrls(next)
                    setScan(null)
                  }}
                  placeholder={index === 0 ? "https://api.acme.com/mcp" : `e.g. https://slack.acme.com/mcp (Server ${index + 1})`}
                  className={`${inputClass} font-mono text-xs`}
                />
                {mcpUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = mcpUrls.filter((_, i) => i !== index)
                      setMcpUrls(next)
                      setScan(null)
                    }}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-destructive/20 bg-destructive/5 text-destructive transition-colors hover:bg-destructive/15"
                    title="Remove Server"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}

            <div className="flex gap-2 justify-between items-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setMcpUrls([...mcpUrls, ""])
                  setScan(null)
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-accent/40 bg-accent/5 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
              >
                <Plus className="h-3.5 w-3.5" />
                Add MCP Server
              </button>

              <button
                type="button"
                onClick={runScan}
                disabled={!combinedUrl || scanning}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-accent bg-accent text-background px-4 text-xs font-bold transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radar className="h-3.5 w-3.5" />}
                <span>{scanning ? t.scanner.scanning : scan ? t.scanner.rescan : t.scanner.scan}</span>
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground/75 mt-2 leading-relaxed">
              💡 <strong>Cross-MCP Orchestration:</strong> Add multiple independent MCP endpoints. The scanner will automatically namespace and discover compatible multi-service skills.
            </p>
          </div>
        </Field>

        {/* MCP Discovery panel */}
        <div className="rounded-xl border border-border bg-background/40 p-4">
          <div className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-foreground">{t.scanner.title}</span>
            {scan && (
              <span className={`ml-auto inline-flex items-center gap-1 text-xs ${scan.isSimulated ? "text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5 text-[10px]" : "text-accent"}`}>
                <Check className="h-3 w-3" />
                {scan.isSimulated ? t.scanner.simulated : t.scanner.done}
              </span>
            )}
          </div>

          {!scan && !scanning && (
            <p className="mt-2 text-xs text-muted-foreground">{combinedUrl ? t.scanner.idle : t.scanner.needUrl}</p>
          )}

          {scanning && (
            <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t.scanner.scanning}…
            </p>
          )}

          {scan && (
            <div className="mt-3 space-y-3">
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Wrench className="h-3 w-3" />
                  {t.scanner.discoveredTools} ({scan.tools.length})
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {scan.tools.map((tool) => (
                    <code
                      key={tool}
                      className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                    >
                      {tool}
                    </code>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t.scanner.suggestedSkills}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {scan.suggested.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
                    >
                      <Check className="h-3 w-3" />
                      {skillMap[id]?.name ?? id}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">{t.scanner.note}</p>
              </div>
            </div>
          )}
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
