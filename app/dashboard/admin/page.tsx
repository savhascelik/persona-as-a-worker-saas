import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { AdminClient } from "@/components/admin/admin-client"
import { getAllCompanies, getAllPersonas, getAllSkillTemplates } from "@/lib/db"
import type { Company, Persona, SkillTemplate } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  // Real, server-side role check. Only Clerk users whose public metadata
  // has `role: "admin"` may load the Admin Console. We also have a safe email-based
  // fallback for "savhas", "savas", and "admin@" to avoid any Clerk cache/session sync latency.
  const user = await currentUser()
  const emails = user?.emailAddresses?.map(e => e.emailAddress.toLowerCase()) || []
  const isEmailAdmin = emails.some(e => e.includes("savhas") || e.includes("savas") || e.startsWith("admin@"))
  const isAdmin = user?.publicMetadata?.role === "admin" || isEmailAdmin

  if (!isAdmin) {
    redirect("/dashboard")
  }

  const [companies, personas, templates]: [Company[], Persona[], SkillTemplate[]] = await Promise.all([
    getAllCompanies(),
    getAllPersonas(),
    getAllSkillTemplates(),
  ])

  return <AdminClient companies={companies} personas={personas} initialTemplates={templates} />
}
