import { SkillsClient } from "@/components/dashboard/skills-client"
import { getAllCompanies, getAllSkillTemplates } from "@/lib/db"
import type { Company, SkillTemplate } from "@/lib/types"
import { auth } from "@clerk/nextjs/server"

export const dynamic = "force-dynamic"

export default async function SkillsPage() {
  const { userId } = await auth()
  if (!userId) {
    return <div className="p-8 text-center text-red-500 font-semibold">Session expired. Please sign in again.</div>
  }

  let companies: Company[] = []
  let customSkills: SkillTemplate[] = []

  try {
    ;[companies, customSkills] = await Promise.all([
      getAllCompanies(userId),
      getAllSkillTemplates(),
    ])
  } catch (error) {
    console.error("DynamoDB fetch error on skills page:", error)
  }

  return <SkillsClient companies={companies} customSkills={customSkills} />
}
