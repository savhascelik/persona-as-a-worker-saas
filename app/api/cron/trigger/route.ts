import { NextResponse } from "next/server"
import { getAllCompanies, getAllPersonas } from "@/lib/db"
import { executePersonaAgent } from "@/lib/agent-runner"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Webhook invoked by Vercel Cron. On each tick, it executes actual AI agent loops
 * (Gemini or OpenAI) for all registered personas across companies.
 *
 * Each persona checks its schedule and credit constraints. If active and funded,
 * the agent evaluates the target platform via MCP tools and determines a high-fidelity
 * action to run, with complete multi-tenant scoping and credit deduction.
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
  const [personas, companies] = await Promise.all([getAllPersonas(), getAllCompanies()])

  const companyMap = new Map(companies.map((c) => [c.id, c]))

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

  return NextResponse.json({
    ok: true,
    processedAt: now.toISOString(),
    personas: personas.length,
    updated,
    failed,
  })
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}
