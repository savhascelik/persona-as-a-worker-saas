"use client"

import { useState, useTransition } from "react"
import { saveSkillTemplateAction, updateSkillTemplateAction } from "@/app/actions"
import { Field, Modal, inputClass } from "./form-primitives"

export function CustomSkillModal({
  discoveredTools,
  onClose,
  onSaved,
  initialSkill,
  mode = "create",
}: {
  discoveredTools: string[]
  onClose: () => void
  onSaved: (id: string) => void
  initialSkill?: {
    id: string
    name: string
    summary: string
    requiredTools: string[]
    activityVerbs?: string[]
  }
  mode?: "create" | "edit" | "copy"
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(() => {
    if (!initialSkill) return ""
    return mode === "copy" ? `${initialSkill.name} (Copy)` : initialSkill.name
  })
  const [summary, setSummary] = useState(initialSkill?.summary ?? "")
  const [selectedTools, setSelectedTools] = useState<string[]>(initialSkill?.requiredTools ?? [])
  const [verbsStr, setVerbsStr] = useState(() => {
    return initialSkill?.activityVerbs?.join(", ") ?? ""
  })

  function handleToolToggle(tool: string) {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Name is required.")
      return
    }
    if (!summary.trim()) {
      setError("Summary is required.")
      return
    }
    
    const tools = selectedTools.length > 0 ? selectedTools : ["read_data"]
    const activityVerbs = verbsStr
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)

    startTransition(async () => {
      let res
      if (mode === "edit" && initialSkill) {
        res = await updateSkillTemplateAction(initialSkill.id, {
          name: name.trim(),
          summary: summary.trim(),
          requiredTools: tools,
          activityVerbs: activityVerbs.length ? activityVerbs : ["seeding the platform"],
        })
      } else {
        res = await saveSkillTemplateAction({
          name: name.trim(),
          summary: summary.trim(),
          requiredTools: tools,
          activityVerbs: activityVerbs.length ? activityVerbs : ["seeding the platform"],
          iconName: "Sparkles",
          source: "manual",
        })
      }

      if (res.ok) {
        onSaved(res.skill.id)
        onClose()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <Modal
      title={mode === "edit" ? "Edit Custom Skill" : mode === "copy" ? "Copy Custom Skill" : "Create Custom Skill"}
      description={
        mode === "edit"
          ? "Update the parameters and required tools of this custom skill."
          : mode === "copy"
            ? "Create a new copy based on this custom skill template."
            : "Bundle any subset of tools into a custom skill for your persona."
      }
      onClose={onClose}
      closeLabel="Close"
    >
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Skill Name">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Log Monitor"
              className={inputClass}
            />
          </Field>
          <Field label="Summary">
            <input
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Scans logs and posts warnings."
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Select Platform Tools (Check 1 or more)">
          <div className="max-h-36 overflow-y-auto rounded-md border border-border p-3 space-y-2">
            {discoveredTools.length === 0 ? (
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  disabled
                  checked
                  className="rounded border-input text-accent focus:ring-accent"
                />
                <code className="font-mono text-xs">read_data (default fallback)</code>
              </label>
            ) : (
              discoveredTools.map((tool) => (
                <label key={tool} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTools.includes(tool)}
                    onChange={() => handleToolToggle(tool)}
                    className="rounded border-input text-accent focus:ring-accent"
                  />
                  <code className="font-mono text-xs">{tool}</code>
                </label>
              ))
            )}
          </div>
        </Field>

        <Field label="Activity Verbs (Comma-separated fragments)">
          <input
            value={verbsStr}
            onChange={(e) => setVerbsStr(e.target.value)}
            placeholder="e.g. checking server logs, posting warnings"
            className={inputClass}
          />
          <p className="text-[10px] text-muted-foreground">
            Used for the activity feed, e.g. "Sarah is using [Skill] [verb]."
          </p>
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
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-10 items-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isPending ? (mode === "edit" ? "Saving..." : "Creating...") : (mode === "edit" ? "Save Changes" : mode === "copy" ? "Create Copy" : "Create Skill")}
          </button>
        </div>
      </form>
    </Modal>
  )
}
