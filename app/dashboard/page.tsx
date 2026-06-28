import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { getAllCompanies, getAllPersonas } from "@/lib/db"
import type { Company, Persona } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  let personas: Persona[] = []
  let companies: Company[] = []
  let dbError: string | null = null

  // Real data only. If DynamoDB is unreachable we surface the error banner and
  // render the empty state — we never substitute mock data.
  try {
    ;[personas, companies] = await Promise.all([getAllPersonas(), getAllCompanies()])
  } catch (error) {
    dbError = error instanceof Error ? error.message : "Unable to reach DynamoDB."
    console.log("[v0] Dashboard DynamoDB read failed:", dbError)
  }

  return <DashboardClient personas={personas} companies={companies} dbError={dbError} />
}
