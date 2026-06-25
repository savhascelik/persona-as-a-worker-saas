import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { getAllCompanies, getAllPersonas } from "@/lib/db"
import { DEMO_COMPANIES, DEMO_PERSONAS } from "@/lib/demo-data"
import type { Company, Persona } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  let personas: Persona[] = []
  let companies: Company[] = []
  let dbError: string | null = null

  try {
    ;[personas, companies] = await Promise.all([getAllPersonas(), getAllCompanies()])
  } catch (error) {
    // The DynamoDB credentials live in the deployed environment. If they are
    // not yet available (e.g. local preview), fall back to seeded demo data so
    // the multi-tenant dashboard remains fully demonstrable.
    dbError = error instanceof Error ? error.message : "Unable to reach DynamoDB."
    companies = DEMO_COMPANIES
    personas = DEMO_PERSONAS
    console.log("[v0] Dashboard DynamoDB read failed, using demo data:", dbError)
  }

  return <DashboardClient personas={personas} companies={companies} dbError={dbError} />
}
