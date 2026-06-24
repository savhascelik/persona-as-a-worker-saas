import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { getAllPersonas } from "@/lib/db"
import type { Persona } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  let personas: Persona[] = []
  let dbError: string | null = null

  try {
    personas = await getAllPersonas()
  } catch (error) {
    // The DynamoDB credentials live in the deployed environment. If they are
    // not yet available (e.g. local preview), render the dashboard shell with
    // a clear notice instead of crashing the route.
    dbError = error instanceof Error ? error.message : "Unable to reach DynamoDB."
    console.log("[v0] Dashboard DynamoDB read failed:", dbError)
  }

  return <DashboardClient personas={personas} dbError={dbError} />
}
