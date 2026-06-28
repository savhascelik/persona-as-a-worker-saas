import type { ReactNode } from "react"
import { SessionProvider } from "@/components/session-provider"
import { SkillsProvider } from "@/components/skills-provider"
import { getAllSkillTemplates } from "@/lib/db"
import type { SkillTemplate } from "@/lib/types"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let customSkills: SkillTemplate[] = []
  try {
    customSkills = await getAllSkillTemplates()
  } catch {
    // DynamoDB may be unreachable locally; built-in skills still work.
    customSkills = []
  }

  return (
    <SessionProvider>
      <SkillsProvider customSkills={customSkills}>{children}</SkillsProvider>
    </SessionProvider>
  )
}
