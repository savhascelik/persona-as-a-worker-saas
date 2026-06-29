"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@clerk/nextjs/server"
import {
  createGoal,
  getGoalById,
  getGoalsByPersona,
  getGoalsByCompany,
  getGoalSteps,
  updateGoal,
  deleteGoal
} from "@/lib/db"
import { executeGoalLoop } from "@/lib/agent-runner"
import type { AgentGoal, AgentGoalStep } from "@/lib/types"

async function requireUser(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error("UNAUTHENTICATED")
  return userId
}

export async function createGoalAction(
  companyId: string,
  personaId: string,
  title: string,
  maxIterations: number = 5
): Promise<{ ok: boolean; goal?: AgentGoal; error?: string }> {
  try {
    await requireUser()

    if (!companyId || !personaId || !title.trim()) {
      return { ok: false, error: "Company ID, Persona ID, and Goal title are required." }
    }

    const goal = await createGoal({
      companyId,
      personaId,
      title: title.trim(),
      status: "pending",
      maxIterations: Math.max(1, Math.min(20, maxIterations)),
      currentIteration: 0
    })

    revalidatePath("/dashboard")
    revalidatePath(`/dashboard/personas/${personaId}`)
    return { ok: true, goal }
  } catch (err: any) {
    console.error("[Create Goal Action Error]:", err)
    return { ok: false, error: err.message || "Failed to create goal." }
  }
}

export async function getGoalsByPersonaAction(personaId: string): Promise<AgentGoal[]> {
  try {
    await requireUser()
    return await getGoalsByPersona(personaId)
  } catch (err) {
    console.error("[Get Goals By Persona Action Error]:", err)
    return []
  }
}

export async function getGoalsByCompanyAction(companyId: string): Promise<AgentGoal[]> {
  try {
    await requireUser()
    return await getGoalsByCompany(companyId)
  } catch (err) {
    console.error("[Get Goals By Company Action Error]:", err)
    return []
  }
}

export async function getGoalDetailsAction(
  goalId: string
): Promise<{ ok: boolean; goal?: AgentGoal; steps?: AgentGoalStep[]; error?: string }> {
  try {
    await requireUser()
    const goal = await getGoalById(goalId)
    if (!goal) {
      return { ok: false, error: "Goal not found." }
    }
    const steps = await getGoalSteps(goalId)
    return { ok: true, goal, steps }
  } catch (err: any) {
    console.error("[Get Goal Details Action Error]:", err)
    return { ok: false, error: err.message || "Failed to get goal details." }
  }
}

/**
 * Triggers the agentic goal loop in the background asynchronously.
 * Returns { ok: true } immediately so the client UI can start polling or revalidating.
 */
export async function runGoalLoopAction(
  goalId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireUser()
    const goal = await getGoalById(goalId)
    if (!goal) {
      return { ok: false, error: "Goal not found." }
    }

    if (goal.status === "success" || goal.status === "failed") {
      return { ok: false, error: "Goal is already completed." }
    }

    // Set status to running immediately so the UI reflects it
    await updateGoal(goalId, { status: "running" })

    // Execute in background
    executeGoalLoop(goalId)
      .then((res) => {
        console.log(`[Goal Worker Async] Finished executing goal ${goalId}:`, res)
      })
      .catch((err) => {
        console.error(`[Goal Worker Async] Error executing goal ${goalId}:`, err)
      })

    revalidatePath("/dashboard")
    revalidatePath(`/dashboard/personas/${goal.personaId}`)
    return { ok: true }
  } catch (err: any) {
    console.error("[Run Goal Loop Action Error]:", err)
    return { ok: false, error: err.message || "Failed to start goal loop." }
  }
}

/**
 * Executes a single step of the goal loop synchronously,
 * allowing the user to step through the execution interactive debugger style!
 */
export async function executeSingleGoalStepAction(
  goalId: string
): Promise<{ ok: boolean; currentIteration?: number; error?: string }> {
  try {
    await requireUser()
    const goal = await getGoalById(goalId)
    if (!goal) {
      return { ok: false, error: "Goal not found." }
    }

    if (goal.status === "success" || goal.status === "failed") {
      return { ok: false, error: "Goal is already completed." }
    }

    const res = await executeGoalLoop(goalId, new Date(), true)
    
    revalidatePath("/dashboard")
    revalidatePath(`/dashboard/personas/${goal.personaId}`)
    return res
  } catch (err: any) {
    console.error("[Execute Single Goal Step Action Error]:", err)
    return { ok: false, error: err.message || "Failed to execute step." }
  }
}

export async function stopGoalAction(
  goalId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireUser()
    const goal = await getGoalById(goalId)
    if (!goal) {
      return { ok: false, error: "Goal not found." }
    }
    
    // Changing status to failed/success acts as a stop signal because executeGoalLoop checks for status === "running"
    await updateGoal(goalId, { status: "failed", result: "Manually stopped by operator." })
    
    revalidatePath("/dashboard")
    revalidatePath(`/dashboard/personas/${goal.personaId}`)
    return { ok: true }
  } catch (err: any) {
    console.error("[Stop Goal Action Error]:", err)
    return { ok: false, error: err.message || "Failed to stop goal." }
  }
}

export async function deleteGoalAction(
  goalId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireUser()
    const goal = await getGoalById(goalId)
    if (!goal) {
      return { ok: false, error: "Goal not found." }
    }
    
    await deleteGoal(goalId)
    
    revalidatePath("/dashboard")
    revalidatePath(`/dashboard/personas/${goal.personaId}`)
    return { ok: true }
  } catch (err: any) {
    console.error("[Delete Goal Action Error]:", err)
    return { ok: false, error: err.message || "Failed to delete goal." }
  }
}
