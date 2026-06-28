import { SkillsClient } from "@/components/dashboard/skills-client"
import { getAllCompanies, getAllSkillTemplates } from "@/lib/db"
import type { Company, SkillTemplate } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function SkillsPage() {
  let companies: Company[] = []
  let customSkills: SkillTemplate[] = []

  try {
    ;[companies, customSkills] = await Promise.all([
      getAllCompanies(),
      getAllSkillTemplates(),
    ])
  } catch (error) {
    console.error("DynamoDB fetch error on skills page:", error)
  }

  return <SkillsClient companies={companies} customSkills={customSkills} />
}
