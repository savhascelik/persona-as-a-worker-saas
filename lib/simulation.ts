import type { Persona, PersonaStatus } from "./types"

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
    }
  }

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
      postsPublished: persona.postsPublished + 1,
      engagementScore: persona.engagementScore + engagementGain,
      lastActiveAt: now.getTime(),
    }
  }

  return {
    status: "idle" as PersonaStatus,
    lastActiveAt: now.getTime(),
  }
}

function workWindowLength(persona: Persona): number {
  const { workStartHour, workEndHour } = persona
  if (workStartHour === workEndHour) return 24
  if (workStartHour < workEndHour) return workEndHour - workStartHour
  return 24 - workStartHour + workEndHour
}
