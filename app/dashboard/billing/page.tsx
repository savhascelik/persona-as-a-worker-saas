import { BillingClient } from "@/components/billing/billing-client"
import { getAllCompanies } from "@/lib/db"
import { DEMO_COMPANIES } from "@/lib/demo-data"
import type { Company } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function BillingPage() {
  let companies: Company[] = []
  try {
    companies = await getAllCompanies()
    if (companies.length === 0) companies = DEMO_COMPANIES
  } catch (error) {
    console.log("[v0] Billing DynamoDB read failed, using demo data:", error)
    companies = DEMO_COMPANIES
  }

  return <BillingClient companies={companies} />
}
