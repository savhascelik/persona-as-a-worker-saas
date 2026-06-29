import { NextResponse } from "next/server"
import { getAllCompanies, getAllPersonas, getAllGoals } from "@/lib/db"
import { executePersonaAgent, executeGoalLoop } from "@/lib/agent-runner"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Webhook invoked by Vercel Cron. On each tick, it executes actual AI agent loops
 * (Gemini or OpenAI) for all registered personas across companies,
 * and advances any active background Agent Goals.
 */
async function handle(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }
  }

  const now = new Date()
  const [personas, companies, allGoals] = await Promise.all([
    getAllPersonas(),
    getAllCompanies(),
    getAllGoals()
  ])

  const companyMap = new Map(companies.map((c) => [c.id, c]))

  // 1. Regular Persona Seeding Execution
  const results = await Promise.allSettled(
    personas.map(async (persona) => {
      const company = companyMap.get(persona.companyId)
      if (!company) {
        throw new Error(`Company not found for persona ${persona.id}`)
      }
      return executePersonaAgent(persona, company, now)
    }),
  )

  const updated = results.filter((r) => r.status === "fulfilled").length
  const failed = results.length - updated

  // 2. Active Agent Goals background worker (process 1 step per goal on each tick)
  const runningGoals = allGoals.filter((g) => g.status === "running")
  const goalResults = await Promise.allSettled(
    runningGoals.map(async (goal) => {
      return executeGoalLoop(goal.id, now, true)
    })
  )

  const goalsProcessed = goalResults.filter((r) => r.status === "fulfilled").length
  const goalsFailed = goalResults.length - goalsProcessed

  return NextResponse.json({
    ok: true,
    processedAt: now.toISOString(),
    personas: personas.length,
    updated,
    failed,
    runningGoals: runningGoals.length,
    goalsProcessed,
    goalsFailed,
  })
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}
