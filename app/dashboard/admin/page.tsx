import { AdminClient } from "@/components/admin/admin-client"
import { getAllCompanies, getAllPersonas, getAllSkillTemplates } from "@/lib/db"
import { DEMO_COMPANIES, DEMO_PERSONAS } from "@/lib/demo-data"
import type { Company, Persona, SkillTemplate } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  let companies: Company[] = []
  let personas: Persona[] = []
  let templates: SkillTemplate[] = []

  try {
    ;[companies, personas, templates] = await Promise.all([
      getAllCompanies(),
      getAllPersonas(),
      getAllSkillTemplates(),
    ])
    if (companies.length === 0) {
      companies = DEMO_COMPANIES
      personas = DEMO_PERSONAS
    }
  } catch (error) {
    console.log("[v0] Admin DynamoDB read failed, using demo data:", error)
    companies = DEMO_COMPANIES
    personas = DEMO_PERSONAS
    templates = []
  }

  return <AdminClient companies={companies} personas={personas} initialTemplates={templates} />
}
