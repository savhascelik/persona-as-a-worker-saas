import { NextResponse } from "next/server"
import { deductCredits, getAllCompanies, getAllPersonas, updatePersona } from "@/lib/db"
import { tickPersona } from "@/lib/simulation"
import type { Company } from "@/lib/types"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Webhook invoked by Vercel Cron. On each tick it advances every persona's
 * state: personas outside their working hours go offline, while those on the
 * clock may publish high-fidelity content and accrue engagement.
 *
 * Every in-hours action consumes Seeding Credits from the owning company. When
 * a company's balance is exhausted, its personas are parked in Hibernation and
 * no further credits are spent until the manager tops up.
 *
 * Vercel Cron requests are authenticated via the CRON_SECRET bearer token when
 * that env var is configured. If it is absent (e.g. local/preview), the handler
 * still runs so the simulation remains observable.
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

  // Track a working balance per company so multiple personas draw down the
  // same pool within a single tick.
  const balances = new Map<string, number>()
  for (const c of companies as Company[]) balances.set(c.id, c.totalCredits ?? 0)

  let hibernated = 0
  const spendByCompany = new Map<string, number>()

  const results = await Promise.allSettled(
    personas.map(async (persona) => {
      const balance = balances.get(persona.companyId) ?? 0
      const hasCredits = balance > 0
      const { updates, cost } = tickPersona(persona, { now, hasCredits })

      // Reserve the spend against the in-memory balance so siblings see it.
      if (cost > 0) {
        balances.set(persona.companyId, balance - cost)
        spendByCompany.set(persona.companyId, (spendByCompany.get(persona.companyId) ?? 0) + cost)
      }
      if (updates.status === "hibernating") hibernated += 1

      await updatePersona(persona.id, updates)
      return { id: persona.id, status: updates.status }
    }),
  )

  // Persist the aggregated credit consumption per company.
  await Promise.allSettled(
    [...spendByCompany.entries()].map(([companyId, amount]) => deductCredits(companyId, amount)),
  )

  const updated = results.filter((r) => r.status === "fulfilled").length
  const failed = results.length - updated
  const creditsConsumed = [...spendByCompany.values()].reduce((s, n) => s + n, 0)

  return NextResponse.json({
    ok: true,
    processedAt: now.toISOString(),
    personas: personas.length,
    updated,
    failed,
    hibernated,
    creditsConsumed,
  })
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}
