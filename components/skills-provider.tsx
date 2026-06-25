"use client"

import { createContext, useContext, useMemo } from "react"
import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { SKILLS } from "@/lib/skills"
import { resolveSkillIcon } from "@/lib/skill-icons"
import type { SkillTemplate } from "@/lib/types"

export interface ResolvedSkill {
  id: string
  name: string
  summary: string
  requiredTools: string[]
  icon: LucideIcon
  activityVerbs: string[]
  /** True for admin-authored templates, false for built-in catalog skills. */
  custom: boolean
}

interface SkillsState {
  skills: ResolvedSkill[]
  skillMap: Record<string, ResolvedSkill>
}

const SkillsContext = createContext<SkillsState | null>(null)

/**
 * Merges the built-in Skill catalog with admin-authored custom Skill Templates
 * so the marketplace, wizard, and activity feed all resolve skill metadata from
 * a single source — including templates created at runtime.
 */
export function SkillsProvider({
  customSkills,
  children,
}: {
  customSkills: SkillTemplate[]
  children: ReactNode
}) {
  const value = useMemo<SkillsState>(() => {
    const builtIn: ResolvedSkill[] = SKILLS.map((s) => ({
      id: s.id,
      name: s.name,
      summary: s.summary,
      requiredTools: s.requiredTools,
      icon: s.icon,
      activityVerbs: s.activityVerbs,
      custom: false,
    }))

    const custom: ResolvedSkill[] = (customSkills ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      summary: s.summary,
      requiredTools: s.requiredTools,
      icon: resolveSkillIcon(s.iconName),
      activityVerbs: s.activityVerbs?.length ? s.activityVerbs : ["seeding the platform"],
      custom: true,
    }))

    const skills = [...builtIn, ...custom]
    const skillMap = Object.fromEntries(skills.map((s) => [s.id, s]))
    return { skills, skillMap }
  }, [customSkills])

  return <SkillsContext.Provider value={value}>{children}</SkillsContext.Provider>
}

export function useSkills(): SkillsState {
  const ctx = useContext(SkillsContext)
  if (!ctx) throw new Error("useSkills must be used within SkillsProvider")
  return ctx
}
