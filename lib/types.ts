export type PersonaStatus = "active" | "idle" | "offline" | "seeding"

export type EntityType = "company" | "persona"

export interface Company {
  id: string
  entityType: "company"
  /** Display name of the tenant, e.g. "Acme Analytics". */
  name: string
  /** Primary domain, e.g. "acme.com". */
  domain: string
  /** Base API or MCP endpoint the platform exposes for personas to learn. */
  baseUrl: string
  createdAt: number
}

export interface CompanyInput {
  name: string
  domain: string
  baseUrl: string
}

export interface Persona {
  id: string
  entityType: "persona"
  /** The tenant this persona belongs to (multi-tenant scoping). */
  companyId: string
  name: string
  role: string
  // The platform the persona seeds, learned via an MCP/OpenAPI endpoint.
  platform: string
  mcpUrl: string
  /** Skills assigned from the Skill Marketplace (1-3 ids). */
  skillIds: string[]
  /** Skill the persona is currently exercising, surfaced in the activity feed. */
  currentSkillId?: string
  status: PersonaStatus
  // IANA timezone identifier, e.g. "America/New_York".
  timezone: string
  // Working hours in 24h local time. The persona only acts within this window.
  workStartHour: number
  workEndHour: number
  // Simulated human response latency window, in seconds.
  minLatencySeconds: number
  maxLatencySeconds: number
  // Target number of high-fidelity posts per working day.
  postsPerDay: number
  // Cumulative output and engagement signals.
  postsPublished: number
  engagementScore: number
  createdAt: number
  lastActiveAt: number
}

export interface PersonaInput {
  companyId: string
  name: string
  role: string
  platform: string
  mcpUrl: string
  skillIds: string[]
  timezone: string
  workStartHour: number
  workEndHour: number
  minLatencySeconds: number
  maxLatencySeconds: number
  postsPerDay: number
}

export interface ActivityEvent {
  id: string
  personaId: string
  personaName: string
  skillId: string
  skillName: string
  /** Composed line, e.g. "Sarah is using [Data Analyst] to process quarterly reports." */
  message: string
  at: number
}
