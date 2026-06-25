import type { ActivityEvent, Persona, PersonaStatus } from "./types"
import { getSkill, SKILL_MAP } from "./skills"

/** Picks the skill a persona is exercising on a given tick (deterministic-ish). */
export function pickActiveSkill(persona: Persona, seed = Math.random()): string | undefined {
  if (!persona.skillIds || persona.skillIds.length === 0) return undefined
  const index = Math.floor(seed * persona.skillIds.length) % persona.skillIds.length
  return persona.skillIds[index]
}

/**
 * Composes a single live-activity line describing which skill a persona is
 * currently using, e.g. "Sarah is using [Data Analyst] to process quarterly reports."
 */
export function composeActivity(persona: Persona, skillId: string, seed = Math.random()): string {
  const skill = getSkill(skillId)
  const firstName = persona.name.split(" ")[0] || persona.name
  if (!skill) return `${firstName} is active on ${persona.platform}.`
  const verb = skill.activityVerbs[Math.floor(seed * skill.activityVerbs.length) % skill.activityVerbs.length]
  return `${firstName} is using [${skill.name}] ${verb}.`
}

/**
 * Builds a live activity feed from the active personas. Each working persona
 * contributes one entry reflecting the skill it is currently exercising.
 */
export function buildActivityFeed(personas: Persona[], now: Date = new Date(), limit = 12): ActivityEvent[] {
  const events: ActivityEvent[] = []
  for (const persona of personas) {
    if (persona.status === "offline") continue
    const skillId = persona.currentSkillId ?? pickActiveSkill(persona)
    if (!skillId || !SKILL_MAP[skillId]) continue
    const skill = SKILL_MAP[skillId]
    events.push({
      id: `${persona.id}-${skillId}-${persona.lastActiveAt}`,
      personaId: persona.id,
      personaName: persona.name,
      skillId,
      skillName: skill.name,
      message: composeActivity(persona, skillId, (persona.lastActiveAt % 1000) / 1000),
      at: persona.lastActiveAt || now.getTime(),
    })
  }
  return events.sort((a, b) => b.at - a.at).slice(0, limit)
}

/**
 * Returns the current hour (0-23) in a given IANA timezone.
 * Falls back to UTC if the timezone is invalid.
 */
export function currentHourInZone(timezone: string, now: Date = new Date()): number {
  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone,
    }).format(now)
    // "24" can be returned for midnight in some environments; normalize to 0.
    return Number.parseInt(formatted, 10) % 24
  } catch {
    return now.getUTCHours()
  }
}

/**
 * Determines whether a persona is within its configured working window,
 * accounting for windows that span midnight.
 */
export function isWithinWorkingHours(persona: Persona, now: Date = new Date()): boolean {
  const hour = currentHourInZone(persona.timezone, now)
  const { workStartHour, workEndHour } = persona
  if (workStartHour === workEndHour) return true
  if (workStartHour < workEndHour) {
    return hour >= workStartHour && hour < workEndHour
  }
  // Overnight shift, e.g. 22:00 -> 06:00
  return hour >= workStartHour || hour < workEndHour
}

/**
 * Computes the next persona state based on the current time. This is the core
 * loop invoked by the cron webhook. Personas only produce output during their
 * working hours, with output throttled to their posts-per-day budget.
 */
export function tickPersona(persona: Persona, now: Date = new Date()): Partial<Persona> {
  const working = isWithinWorkingHours(persona, now)

  if (!working) {
    return {
      status: "offline" as PersonaStatus,
      currentSkillId: undefined,
    }
  }

  // Select which assigned skill the persona exercises this tick.
  const currentSkillId = pickActiveSkill(persona)

  // Within working hours: decide whether to publish a high-fidelity post.
  // Probability is derived from the daily budget spread across the workday.
  const windowLength = workWindowLength(persona)
  const perTickPublishChance = windowLength > 0 ? Math.min(1, persona.postsPerDay / (windowLength * 4)) : 0
  const publishes = Math.random() < perTickPublishChance

  if (publishes) {
    // Engagement gain scales with simulated content depth (latency proxy).
    const depth = (persona.minLatencySeconds + persona.maxLatencySeconds) / 2
    const engagementGain = Math.round(4 + depth / 60 + Math.random() * 12)
    return {
      status: "active" as PersonaStatus,
      currentSkillId,
      postsPublished: persona.postsPublished + 1,
      engagementScore: persona.engagementScore + engagementGain,
      lastActiveAt: now.getTime(),
    }
  }

  return {
    status: "idle" as PersonaStatus,
    currentSkillId,
    lastActiveAt: now.getTime(),
  }
}

function workWindowLength(persona: Persona): number {
  const { workStartHour, workEndHour } = persona
  if (workStartHour === workEndHour) return 24
  if (workStartHour < workEndHour) return workEndHour - workStartHour
  return 24 - workStartHour + workEndHour
}
