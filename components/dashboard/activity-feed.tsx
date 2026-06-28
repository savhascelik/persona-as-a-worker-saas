"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"
import { useSkills } from "@/components/skills-provider"
import type { Persona } from "@/lib/types"

interface FeedLine {
  id: string
  personaName: string
  skillId: string
  skillName: string
  verb: string
}

export function ActivityFeed({ personas }: { personas: Persona[] }) {
  const { t } = useI18n()
  const { skillMap } = useSkills()
  // `tick` advances on an interval to rotate the live lines.
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick((n) => n + 1), 4000)
    return () => clearInterval(interval)
  }, [])

  const lines = useMemo<FeedLine[]>(() => {
    const active = personas.filter(
      (p) => p.status !== "offline" && p.status !== "hibernating" && p.skillIds && p.skillIds.length > 0,
    )
    return active
      .map((p, i) => {
        const skillId = p.currentSkillId && skillMap[p.currentSkillId]
          ? p.currentSkillId
          : p.skillIds[(tick + i) % p.skillIds.length]
        const skill = skillMap[skillId]
        if (!skill) return null
        const verb = skill.activityVerbs[(tick + i) % skill.activityVerbs.length]
        const firstName = p.name.split(" ")[0] || p.name
        return {
          id: p.id,
          personaName: firstName,
          skillId,
          skillName: skill.name,
          verb,
        } satisfies FeedLine
      })
      .filter((l): l is FeedLine => Boolean(l))
      .slice(0, 12)
  }, [personas, tick])

  return (
    <section className="glow-border rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <h2 className="text-sm font-semibold tracking-tight">{t.activity.title}</h2>
        </div>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t.activity.subtitle}</p>

      {lines.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t.activity.empty}</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {lines.map((line) => (
            <li key={line.id} className="flex items-start gap-3 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <p className="text-pretty leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{line.personaName}</span> {t.skills.using}{" "}
                <span className="rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-xs font-medium text-accent">
                  {line.skillName}
                </span>{" "}
                {line.verb}.
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
