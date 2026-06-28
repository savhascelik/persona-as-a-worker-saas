import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { AdminClient } from "@/components/admin/admin-client"
import { getAllCompanies, getAllPersonas, getAllSkillTemplates } from "@/lib/db"
import type { Company, Persona, SkillTemplate } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  // Real, server-side role check. Only Clerk users whose public metadata
  // has `role: "admin"` may load the Admin Console.
  const user = await currentUser()
  if (user?.publicMetadata?.role !== "admin") {
    redirect("/dashboard")
  }

  const [companies, personas, templates]: [Company[], Persona[], SkillTemplate[]] = await Promise.all([
    getAllCompanies(),
    getAllPersonas(),
    getAllSkillTemplates(),
  ])

  return <AdminClient companies={companies} personas={personas} initialTemplates={templates} />
}
