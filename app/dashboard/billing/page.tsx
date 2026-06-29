import { BillingClient } from "@/components/billing/billing-client"
import { getAllCompanies, getCreditRequestsByUser } from "@/lib/db"
import { currentUser } from "@clerk/nextjs/server"
import type { Company, CreditRequest } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function BillingPage() {
  const user = await currentUser()
  if (!user) {
    return null
  }

  let companies: Company[] = []
  let creditRequests: CreditRequest[] = []

  try {
    companies = await getAllCompanies()
    creditRequests = await getCreditRequestsByUser(user.id)
  } catch (error) {
    console.log("[v0] Billing DynamoDB read failed:", error)
  }

  return (
    <BillingClient
      companies={companies}
      initialCreditRequests={creditRequests}
    />
  )
}

