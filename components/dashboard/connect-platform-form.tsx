"use client"

import { useState, useTransition } from "react"
import { Check, Loader2, Radar, Wrench, Plus, Trash } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"
import { useSkills } from "@/components/skills-provider"
import { createCompanyAction, updateCompanyAction, scanEndpointAction } from "@/app/actions"
import type { Company } from "@/lib/types"
import { Field, Modal, inputClass } from "./form-primitives"

const PRESETS = [
  {
    id: "petstore",
    label: "Petstore Sandbox",
    name: "Swagger Petstore",
    domain: "petstore.swagger.io",
    url: "https://petstore.swagger.io/v2/swagger.json",
    authType: "none",
    icon: "🐶",
    description: "Public mock sandbox. Instantly discovers 20+ operations."
  },
  {
    id: "github",
    label: "GitHub Gateway",
    name: "GitHub Enterprise",
    domain: "github.com",
    url: "preset_github",
    authType: "bearer",
    icon: "🐙",
    description: "Built-in agent server. Connect using your personal token."
  },
  {
    id: "vercel",
    label: "Vercel Gateway",
    name: "Vercel Platform",
    domain: "vercel.com",
    url: "preset_vercel",
    authType: "bearer",
    icon: "▲",
    description: "Analyze deploy logs. Connect with your Vercel token."
  },
  {
    id: "slack",
    label: "Slack Gateway",
    name: "Slack Platform",
    domain: "slack.com",
    url: "preset_slack",
    authType: "bearer",
    icon: "💬",
    description: "Autonomous B2B alerts. Connect with Slack bot token."
  }
]

export function ConnectPlatformForm({
  company,
  onClose,
  onCreated,
  onUpdated,
}: {
  company?: Company
  onClose: () => void
  onCreated?: (company: Company) => void
  onUpdated?: (company: Company) => void
}) {
  const { t } = useI18n()
  const { skillMap } = useSkills()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!company

  const [name, setName] = useState(company?.name || "")
  const [domain, setDomain] = useState(company?.domain || "")

  // Initialize with company's existing data if editing
  const initialMcpServers = company
    ? company.baseUrl.split(",").map((url) => {
        const auth = company.mcpAuth?.[url]
        return {
          url: url.trim(),
          authType: (auth?.authType || "none") as "none" | "bearer" | "apiKey",
          credentials: auth?.credentials ? "__PRESERVE_EXISTING__" : "",
        }
      })
    : [{ url: "", authType: "none" as const, credentials: "" }]

  const [mcpServers, setMcpServers] = useState<{ url: string; authType: "none" | "bearer" | "apiKey"; credentials?: string }[]>(initialMcpServers)
  const [scanning, setScanning] = useState(false)
  const [scan, setScan] = useState<{ tools: string[]; suggested: string[]; isSimulated?: boolean } | null>(
    company
      ? { tools: company.discoveredTools || [], suggested: company.suggestedSkillIds || [], isSimulated: false }
      : null
  )

  const combinedUrl = mcpServers.map((s) => s.url.trim()).filter(Boolean).join(",")

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

    // Build the mcpAuthJson payload
    const mcpAuth: Record<string, { authType: string; credentials?: string }> = {}
    mcpServers.forEach((s) => {
      const url = s.url.trim()
      if (url && s.authType !== "none" && s.credentials) {
        mcpAuth[url] = {
          authType: s.authType,
          credentials: s.credentials.trim()
        }
      }
    })
    formData.set("mcpAuthJson", JSON.stringify(mcpAuth))

    startTransition(async () => {
      const result = isEdit
        ? await updateCompanyAction(company.id, formData)
        : await createCompanyAction(formData)
        if (result.ok) {
          if (isEdit) {
            onUpdated?.(result.company)
          } else {
            onCreated?.(result.company)
          }
          onClose()
        } else {
          setError(result.error)
        }
    })
  }

  const title = isEdit ? "Edit Platform Connection" : t.connect.title
  const desc = isEdit ? "Update name, domain, MCP servers, and auth credentials of this B2B SaaS platform." : t.connect.desc

  return (
    <Modal title={title} description={desc} onClose={onClose} closeLabel={t.connect.cancel}>
      <form action={action} className="mt-6 space-y-5">
        {/* Preset Selector */}
        {!isEdit && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Quick Connect Presets (Built-in MCP Gateways)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {PRESETS.map((preset) => {
                const isSelected = mcpServers.length === 1 && mcpServers[0].url === preset.url && mcpServers[0].authType === preset.authType
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setName(preset.name)
                      setDomain(preset.domain)
                      setMcpServers([{ url: preset.url, authType: preset.authType as any, credentials: "" }])
                      setScan(null)
                    }}
                    className={`flex items-start gap-2.5 text-left p-2.5 rounded-xl border transition-all ${
                      isSelected
                        ? "border-accent bg-accent/10 ring-1 ring-accent"
                        : "border-border/40 hover:border-accent/40 bg-muted/5 hover:bg-muted/10"
                    }`}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{preset.icon}</span>
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-foreground truncate">{preset.label}</span>
                      <span className="block text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-1">{preset.description}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <Field label={t.connect.name}>
          <input name="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t.connect.namePlaceholder} className={inputClass} />
        </Field>
        <Field label={t.connect.domain}>
          <input name="domain" required value={domain} onChange={(e) => setDomain(e.target.value)} placeholder={t.connect.domainPlaceholder} className={inputClass} />
        </Field>
        <Field label={t.connect.baseUrl}>
          <div className="space-y-3">
            {mcpServers.map((server, index) => (
              <div key={index} className="space-y-2 rounded-lg border border-border/40 bg-muted/10 p-3">
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    required
                    value={server.url}
                    onChange={(e) => {
                      const next = [...mcpServers]
                      next[index] = { ...server, url: e.target.value }
                      setMcpServers(next)
                      setScan(null)
                    }}
                    placeholder={index === 0 ? "https://api.acme.com/mcp" : `e.g. https://slack.acme.com/mcp (Server ${index + 1})`}
                    className={`${inputClass} font-mono text-xs`}
                  />
                  {mcpServers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = mcpServers.filter((_, i) => i !== index)
                        setMcpServers(next)
                        setScan(null)
                      }}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-destructive/20 bg-destructive/5 text-destructive transition-colors hover:bg-destructive/15"
                      title="Remove Server"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Elegant Inline Auth settings */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground font-medium">Auth:</span>
                  <select
                    value={server.authType}
                    onChange={(e) => {
                      const next = [...mcpServers]
                      next[index] = {
                        ...server,
                        authType: e.target.value as "none" | "bearer" | "apiKey",
                        credentials: server.credentials || ""
                      }
                      setMcpServers(next)
                    }}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  >
                    <option value="none">None (Public)</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="apiKey">API Key (X-API-Key)</option>
                  </select>

                  {server.authType !== "none" && (
                    <input
                      type="password"
                      required={server.credentials !== "__PRESERVE_EXISTING__"}
                      value={server.credentials === "__PRESERVE_EXISTING__" ? "" : server.credentials || ""}
                      onChange={(e) => {
                        const next = [...mcpServers]
                        next[index] = { ...server, credentials: e.target.value }
                        setMcpServers(next)
                      }}
                      placeholder={
                        server.credentials === "__PRESERVE_EXISTING__"
                          ? "Saved Credential (Leave blank to keep unchanged)"
                          : server.authType === "bearer"
                          ? "Bearer eyJhbGci..."
                          : "X-API-Key value..."
                      }
                      className="h-8 flex-1 min-w-[150px] rounded-md border border-input bg-background px-2 font-mono text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                    />
                  )}
                </div>
              </div>
            ))}

            <div className="flex gap-2 justify-between items-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setMcpServers([...mcpServers, { url: "", authType: "none", credentials: "" }])
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
            {isPending ? t.connect.submitting : isEdit ? "Save Changes" : t.connect.submit}
          </button>
        </div>
      </form>
    </Modal>
  )
}
