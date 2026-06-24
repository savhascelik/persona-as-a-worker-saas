import { NextResponse } from "next/server"
import { getAllPersonas, updatePersona } from "@/lib/db"
import { tickPersona } from "@/lib/simulation"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Webhook invoked by Vercel Cron. On each tick it advances every persona's
 * state: personas outside their working hours go offline, while those on the
 * clock may publish high-fidelity content and accrue engagement.
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
  const personas = await getAllPersonas()

  const results = await Promise.allSettled(
    personas.map(async (persona) => {
      const updates = tickPersona(persona, now)
      await updatePersona(persona.id, updates)
      return { id: persona.id, status: updates.status }
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
