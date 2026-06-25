import { BillingClient } from "@/components/billing/billing-client"
import { getAllCompanies } from "@/lib/db"
import type { Company } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function BillingPage() {
  // Real DynamoDB data only — no demo fallback. An empty table renders the
  // billing client's own empty state.
  let companies: Company[] = []
  try {
    companies = await getAllCompanies()
  } catch (error) {
    console.log("[v0] Billing DynamoDB read failed:", error)
  }

  return <BillingClient companies={companies} />
}
