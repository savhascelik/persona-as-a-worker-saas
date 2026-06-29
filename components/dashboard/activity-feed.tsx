"use client"

import { useEffect, useState } from "react"
import { Activity, Play, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"
import { useSkills } from "@/components/skills-provider"
import { getCompanyActivitiesAction, triggerCompanyPersonasAction } from "@/app/actions"
import type { Persona, ActivityEvent } from "@/lib/types"

interface ActivityFeedProps {
  personas: Persona[]
  companyId: string | null
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp
  const diffSecs = Math.floor(diffMs / 1000)
  if (diffSecs < 10) return "Just now"
  if (diffSecs < 60) return `${diffSecs}s ago`
  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return new Date(timestamp).toLocaleDateString()
}

export function ActivityFeed({ personas, companyId }: ActivityFeedProps) {
  const { t } = useI18n()
  const { skillMap } = useSkills()
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [runMessage, setRunMessage] = useState<{ text: string; isError?: boolean } | null>(null)

  // 1. Fetch activities on mount & on companyId change
  useEffect(() => {
    let active = true
    const load = async () => {
      if (!companyId) {
        setActivities([])
        return
      }
      setLoading(true)
      try {
        const list = await getCompanyActivitiesAction(companyId, 15)
        if (active) setActivities(list)
      } catch (err) {
        console.error("Failed to load activities", err)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    // 2. Poll for new activities every 5 seconds to keep the feed alive in real-time
    const interval = setInterval(async () => {
      if (!companyId) return
      try {
        const list = await getCompanyActivitiesAction(companyId, 15)
        if (active) setActivities(list)
      } catch (err) {
        console.error("Error polling activities", err)
      }
    }, 5000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [companyId])

  // Handle manual trigger run
  const handleTriggerRun = async () => {
    if (!companyId || triggering) return
    setTriggering(true)
    setRunMessage(null)

    try {
      const companyPersonas = personas.filter(
        (p) => p.companyId === companyId
      )

      if (companyPersonas.length === 0) {
        setRunMessage({
          text: "No personas have been created for this company yet.",
          isError: true,
        })
        setTriggering(false)
        return
      }

      const res = await triggerCompanyPersonasAction(companyId)
      if (res.ok) {
        // Find successful executions
        const runs = res.results || []
        const succeeded = runs.filter((r) => r.ok).length
        const failed = runs.length - succeeded

        if (succeeded > 0) {
          setRunMessage({
            text: `Successfully executed agent loop for ${succeeded} persona(s).`,
            isError: false,
          })
        } else if (failed > 0) {
          setRunMessage({
            text: `Failed to execute agent loop: ${runs[0]?.error || "Unknown error"}`,
            isError: true,
          })
        } else {
          setRunMessage({
            text: "Agent loop checked but no action was executed.",
            isError: false,
          })
        }

        // Instantly reload logs
        const updatedList = await getCompanyActivitiesAction(companyId, 15)
        setActivities(updatedList)
      } else {
        setRunMessage({
          text: "Failed to trigger agent loops. Check backend logs.",
          isError: true,
        })
      }
    } catch (err: any) {
      setRunMessage({
        text: err.message || "An unexpected error occurred during agent run.",
        isError: true,
      })
    } finally {
      setTriggering(false)
      // Auto-clear message after 5 seconds
      setTimeout(() => setRunMessage(null), 5000)
    }
  }

  return (
    <section className="glow-border rounded-xl p-5 bg-card/40 backdrop-blur-md relative overflow-hidden">
      {/* Upper gradient line for glassmorphic premium aesthetic */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
          </span>
          <h2 className="text-sm font-semibold tracking-tight">{t.activity.title}</h2>
        </div>

        <div className="flex items-center gap-2">
          {companyId && (
            <button
              onClick={handleTriggerRun}
              disabled={triggering || personas.filter(p => p.status !== "offline" && p.status !== "hibernating").length === 0}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-all duration-300
                ${
                  triggering
                    ? "bg-accent/20 text-accent/80 cursor-not-allowed"
                    : "bg-accent/15 hover:bg-accent text-accent hover:text-accent-foreground border border-accent/20 active:scale-95"
                }
              `}
              title="Run live AI decision loop for active personas immediately"
            >
              {triggering ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3 fill-current" />
              )}
              {triggering ? "Executing Decision..." : "Trigger Agent Loop"}
            </button>
          )}
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t.activity.subtitle}</p>

      {/* Manual run action status message */}
      {runMessage && (
        <div
          className={`mt-4 flex items-start gap-2 rounded-lg p-3 text-xs border transition-all duration-300 animate-in fade-in slide-in-from-top-1
            ${
              runMessage.isError
                ? "bg-destructive/10 border-destructive/20 text-destructive-foreground"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }
          `}
        >
          {runMessage.isError ? (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <p>{runMessage.text}</p>
        </div>
      )}

      {loading && activities.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center py-6">
          <RefreshCw className="h-6 w-6 animate-spin text-accent/60 mb-2" />
          <p className="text-xs text-muted-foreground">Reading persistent logs...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-border/40 bg-background/20">
          <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-foreground/80 font-medium">No execution history found</p>
          <p className="mt-1 max-w-[260px] text-xs text-muted-foreground leading-relaxed">
            {personas.filter((p) => p.status !== "offline" && p.status !== "hibernating").length > 0
              ? "Your active personas are ready. Click 'Trigger Agent Loop' above to run their first live decisions!"
              : "Ensure your personas are deployed and within their working hours to begin executing real MCP actions."}
          </p>
        </div>
      ) : (
        <div className="mt-5 max-h-[350px] overflow-y-auto pr-1 space-y-3 scrollbar-thin">
          <ul className="space-y-3">
            {activities.map((act) => {
              const firstName = act.personaName.split(" ")[0] || act.personaName
              const isError = act.message.startsWith("Execution Failed:")
              return (
                <li
                  key={act.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors duration-200 ${
                    isError
                      ? "border-destructive/30 bg-destructive/5 hover:bg-destructive/10"
                      : "border-border/40 bg-background/10 hover:bg-background/20"
                  }`}
                >
                  <div className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold border ${
                    isError
                      ? "bg-destructive/10 border-destructive/20 text-destructive"
                      : "bg-accent/10 border-accent/20 text-accent"
                  }`}>
                    {firstName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isError ? (
                      <p className="text-xs leading-relaxed text-destructive-foreground font-medium text-pretty">
                        <span className="font-semibold text-foreground">{act.personaName}</span>{" "}
                        <span className="inline-flex rounded border border-destructive/30 bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive tracking-wide uppercase">
                          {act.skillName}
                        </span>{" "}
                        <span className="text-destructive font-medium">{act.message.replace(/^Execution Failed:\s*/, "")}</span>
                      </p>
                    ) : (
                      <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
                        <span className="font-semibold text-foreground">{act.personaName}</span>{" "}
                        {t.skills.using}{" "}
                        <span className="inline-flex rounded border border-accent/30 bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent tracking-wide uppercase">
                          {act.skillName}
                        </span>{" "}
                        <span className="text-foreground/90">{act.message.replace(new RegExp(`^${act.personaName}\\s+using\\s+\\[.*?\\]\\s+to\\s+`, "i"), "").replace(new RegExp(`^${act.personaName}\\s+exercising\\s+\\[.*?\\]:\\s*`, "i"), "")}</span>
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground/70 shrink-0 select-none bg-muted/25 rounded px-1.5 py-0.5 mt-0.5 font-mono">
                    {formatRelativeTime(act.at)}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
