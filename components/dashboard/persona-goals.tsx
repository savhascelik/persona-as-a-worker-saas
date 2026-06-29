"use client"

import { useEffect, useState, useTransition } from "react"
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
  Plus,
  Sparkles,
  Target,
  Terminal,
  XCircle,
  Square,
  Trash2
} from "lucide-react"
import {
  createGoalAction,
  executeSingleGoalStepAction,
  getGoalDetailsAction,
  getGoalsByPersonaAction,
  runGoalLoopAction,
  stopGoalAction,
  deleteGoalAction
} from "@/app/actions/goal-actions"
import type { AgentGoal, AgentGoalStep, Company, Persona } from "@/lib/types"

export function PersonaGoals({
  persona,
  company
}: {
  persona: Persona
  company: Company
}) {
  const [goals, setGoals] = useState<AgentGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [newGoalTitle, setNewGoalTitle] = useState("")
  const [maxIterations, setMaxIterations] = useState(5)
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null)
  const [goalSteps, setGoalSteps] = useState<Record<string, AgentGoalStep[]>>({})
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()

  // Load goals for this persona
  const loadGoals = async () => {
    try {
      const list = await getGoalsByPersonaAction(persona.id)
      setGoals(list)
      // Automatically expand first goal if exists
      if (list.length > 0 && !expandedGoalId) {
        setExpandedGoalId(list[0].id)
      }
    } catch (err) {
      console.error("Failed to load goals:", err)
    } finally {
      setLoading(false)
    }
  };

  useEffect(() => {
    loadGoals()
  }, [persona.id])

  // Load steps for expanded goal
  useEffect(() => {
    if (!expandedGoalId) return
    let active = true

    const fetchSteps = async () => {
      try {
        const res = await getGoalDetailsAction(expandedGoalId)
        if (res.ok && res.steps && active) {
          setGoalSteps(prev => ({ ...prev, [expandedGoalId]: res.steps || [] }))
          
          // If the goal state changed in DB (e.g. status finished), update goals list
          if (res.goal) {
            setGoals(prev => prev.map(g => g.id === expandedGoalId ? res.goal! : g))
          }
        }
      } catch (err) {
        console.error("Failed to fetch steps:", err)
      }
    }

    fetchSteps()

    // Poll if the expanded goal is currently running
    const currentGoal = goals.find(g => g.id === expandedGoalId)
    let interval: NodeJS.Timeout | null = null

    if (currentGoal && currentGoal.status === "running") {
      interval = setInterval(() => {
        fetchSteps()
      }, 3000)
    }

    return () => {
      active = false
      if (interval) clearInterval(interval)
    }
  }, [expandedGoalId, goals])

  const handleCreateGoal = () => {
    if (!newGoalTitle.trim()) return
    startTransition(async () => {
      const res = await createGoalAction(company.id, persona.id, newGoalTitle, maxIterations)
      if (res.ok && res.goal) {
        setNewGoalTitle("")
        setMaxIterations(5)
        setGoals(prev => [res.goal!, ...prev])
        setExpandedGoalId(res.goal.id)
      }
    })
  }

  const handleRunAuto = (goalId: string) => {
    startTransition(async () => {
      const res = await runGoalLoopAction(goalId)
      if (res.ok) {
        // Optimistically set to running so polling triggers
        setGoals(prev => prev.map(g => g.id === goalId ? { ...g, status: "running" } : g))
      }
    })
  }

  const handleStop = (goalId: string) => {
    startTransition(async () => {
      const res = await stopGoalAction(goalId)
      if (res.ok) {
        setGoals(prev => prev.map(g => g.id === goalId ? { ...g, status: "failed", result: "Manually stopped by operator." } : g))
      }
    })
  }

  const handleDeleteGoal = (goalId: string) => {
    if (!confirm("Are you sure you want to delete this goal and its step logs?")) return
    startTransition(async () => {
      const res = await deleteGoalAction(goalId)
      if (res.ok) {
        setGoals(prev => prev.filter(g => g.id !== goalId))
        if (expandedGoalId === goalId) {
          setExpandedGoalId(null)
        }
      }
    })
  }

  const handleRunStep = (goalId: string) => {
    startTransition(async () => {
      const res = await executeSingleGoalStepAction(goalId)
      if (res.ok) {
        // Refresh goal details
        const details = await getGoalDetailsAction(goalId)
        if (details.ok && details.goal && details.steps) {
          setGoals(prev => prev.map(g => g.id === goalId ? details.goal! : g))
          setGoalSteps(prev => ({ ...prev, [goalId]: details.steps || [] }))
          // Automatically expand the newest step
          if (details.steps.length > 0) {
            const newestStep = details.steps[details.steps.length - 1]
            setExpandedSteps(prev => ({ ...prev, [newestStep.id]: true }))
          }
        }
      }
    })
  }

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
      case "failed": return "text-rose-500 bg-rose-500/10 border-rose-500/30"
      case "running": return "text-sky-500 bg-sky-500/10 border-sky-500/30"
      default: return "text-zinc-500 bg-zinc-500/10 border-zinc-500/30"
    }
  }

  return (
    <div className="rounded-xl border border-border/80 bg-background/50 p-6 backdrop-blur-md">
      <div className="flex items-center gap-3 border-b border-border/60 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Target className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Agentic Goals & Loop Execution</h3>
          <p className="text-xs text-muted-foreground">Assign custom directives for {persona.name} and track reasoning, tools, and results.</p>
        </div>
      </div>

      {/* Goal Creation Form */}
      <div className="mt-5 rounded-xl border border-border/50 bg-background/30 p-4">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Set New Objective / Goal</label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <input
              type="text"
              placeholder="e.g., Search the forum for new questions about databases, craft an expert reply, and link to our docs."
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="w-full sm:w-44">
            <label className="text-[10px] text-muted-foreground font-medium block">Max Iterations: {maxIterations}</label>
            <input
              type="range"
              min="1"
              max="15"
              value={maxIterations}
              onChange={(e) => setMaxIterations(Number(e.target.value))}
              className="mt-2 h-1.5 w-full accent-accent bg-muted rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <button
            type="button"
            onClick={handleCreateGoal}
            disabled={isPending || !newGoalTitle.trim()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Assign Goal
          </button>
        </div>
      </div>

      {/* Goals List */}
      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="mt-2 text-xs text-muted-foreground">Loading objectives...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border py-12 text-center">
            <Sparkles className="h-8 w-8 text-accent/60" />
            <p className="mt-3 text-sm font-medium text-foreground">No custom goals active</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs">Define a custom target prompt above. The agent will run autonomous cycles of thought and tool calls to reach it.</p>
          </div>
        ) : (
          goals.map((g) => {
            const isExpanded = expandedGoalId === g.id
            const steps = goalSteps[g.id] || []
            const running = g.status === "running"

            return (
              <div key={g.id} className="rounded-xl border border-border bg-background/40 overflow-hidden shadow-sm">
                {/* Goal Header */}
                <div
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 cursor-pointer hover:bg-accent/5 transition-colors border-b border-border/40"
                  onClick={() => setExpandedGoalId(isExpanded ? null : g.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium capitalize ${getStatusColor(g.status)}`}>
                        {g.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Step {g.currentIteration} of {g.maxIterations} max
                      </span>
                    </div>
                    <h4 className="mt-1.5 text-sm font-semibold text-foreground leading-snug">{g.title}</h4>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center" onClick={(e) => e.stopPropagation()}>
                    {running ? (
                      <button
                        type="button"
                        onClick={() => handleStop(g.id)}
                        disabled={isPending}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-rose-500/10 px-3 text-xs font-semibold text-rose-500 border border-rose-500/20 transition-all hover:bg-rose-500 hover:text-white disabled:opacity-40"
                      >
                        <Square className="h-3 w-3 fill-current" />
                        Stop
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRunAuto(g.id)}
                        disabled={isPending || g.status === "success" || g.status === "failed"}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent/10 px-3 text-xs font-semibold text-accent border border-accent/20 transition-all hover:bg-accent hover:text-white disabled:opacity-40"
                      >
                        <Play className="h-3 w-3" />
                        Autonomous Run
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRunStep(g.id)}
                      disabled={isPending || running || g.status === "success" || g.status === "failed"}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-semibold text-foreground transition-all hover:bg-accent/5 disabled:opacity-40"
                    >
                      <Activity className="h-3 w-3" />
                      Single Step
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(g.id)}
                      disabled={isPending}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-all hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-40"
                      title="Delete Goal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="text-muted-foreground hover:text-foreground p-1 cursor-pointer ml-1" onClick={() => setExpandedGoalId(isExpanded ? null : g.id)}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded steps visualization */}
                {isExpanded && (
                  <div className="bg-background/20 px-5 py-4 border-t border-border/20">
                    {g.result && (
                      <div className="mb-4 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-sm">
                        <h5 className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Final Outcome Achieved
                        </h5>
                        <p className="mt-1.5 text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">{g.result}</p>
                      </div>
                    )}

                    {g.status === "failed" && !g.result && (
                      <div className="mb-4 p-4 rounded-lg bg-rose-500/5 border border-rose-500/20 text-sm">
                        <h5 className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          Execution Terminated
                        </h5>
                        <p className="mt-1.5 text-muted-foreground whitespace-pre-wrap font-sans">
                          The loop reached limit constraints or failed to fulfill the objective safely.
                        </p>
                      </div>
                    )}

                    {steps.length === 0 ? (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        No execution history yet. Click <strong>Autonomous Run</strong> or <strong>Single Step</strong> to start.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Thought & Tool Execution Accordion</h5>
                        {steps.map((step, idx) => {
                          const stepExpanded = !!expandedSteps[step.id]
                          return (
                            <div key={step.id} className="border border-border/60 bg-background/30 rounded-lg overflow-hidden transition-all">
                              {/* Accordion Trigger Row */}
                              <div
                                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent/5 transition-colors select-none"
                                onClick={() => toggleStep(step.id)}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-accent text-[10px] font-bold">
                                    {step.iteration}
                                  </span>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-medium text-foreground">
                                      {step.action.startsWith("call_tool:") ? (
                                        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-mono text-[11px]">
                                          <Terminal className="h-3.5 w-3.5" />
                                          {step.action}
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                          Achieved Conclusion
                                        </span>
                                      )}
                                    </span>
                                    <span className="hidden sm:inline text-xs text-muted-foreground truncate max-w-sm">
                                      — {step.thought.slice(0, 60)}...
                                    </span>
                                  </div>
                                </div>
                                <div className="text-muted-foreground">
                                  {stepExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </div>
                              </div>

                              {/* Accordion Content Row */}
                              {stepExpanded && (
                                <div className="px-4 pb-4 pt-2 border-t border-border/40 space-y-3 text-xs leading-relaxed">
                                  <div>
                                    <strong className="text-foreground block font-semibold mb-1">Reasoning / Thought Process:</strong>
                                    <p className="text-muted-foreground whitespace-pre-wrap font-sans bg-background/40 p-2.5 rounded border border-border/40">
                                      {step.thought}
                                    </p>
                                  </div>

                                  {step.actionArgs && (
                                    <div>
                                      <strong className="text-foreground block font-semibold mb-1">Injected Tool Arguments:</strong>
                                      <pre className="font-mono text-[11px] bg-muted/60 p-2.5 rounded border border-border/40 overflow-x-auto text-foreground">
                                        {JSON.stringify(JSON.parse(step.actionArgs), null, 2)}
                                      </pre>
                                    </div>
                                  )}

                                  <div>
                                    <strong className="text-foreground block font-semibold mb-1">Platform Observation / Output:</strong>
                                    <pre className="font-mono text-[11px] bg-zinc-950 text-zinc-200 p-2.5 rounded border border-zinc-800 overflow-x-auto whitespace-pre-wrap leading-normal">
                                      {step.observation}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
