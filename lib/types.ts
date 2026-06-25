export type PersonaStatus = "active" | "idle" | "offline" | "seeding" | "hibernating"

export type EntityType = "company" | "persona" | "skill"

/** Platform roles. ADMIN has global oversight; MANAGER owns a single company. */
export type Role = "ADMIN" | "MANAGER"

export interface Company {
  id: string
  entityType: "company"
  /** Display name of the tenant, e.g. "Acme Analytics". */
  name: string
  /** Primary domain, e.g. "acme.com". */
  domain: string
  /** Base API or MCP endpoint the platform exposes for personas to learn. */
  baseUrl: string
  /** Role of the company owner. Companies are owned by MANAGERs by default. */
  role: Role
  /** Remaining Seeding Credits. When this hits 0, personas hibernate. */
  totalCredits: number
  /** Cumulative credits consumed across the company's lifetime. */
  creditsConsumed: number
  createdAt: number
}

export interface CompanyInput {
  name: string
  domain: string
  baseUrl: string
  /** Skills auto-suggested by the MCP scanner, stored for onboarding context. */
  suggestedSkillIds?: string[]
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
  /** Cumulative Seeding Credits this persona has consumed. */
  creditsSpent: number
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

/**
 * A custom Skill Template authored by an admin via the AI-assisted generator.
 * Built-in skills live in lib/skills.ts; custom ones are persisted in DynamoDB
 * and merged into the marketplace at runtime.
 */
export interface SkillTemplate {
  id: string
  entityType: "skill"
  name: string
  summary: string
  requiredTools: string[]
  /** Lucide icon name used for rendering, e.g. "Sparkles". */
  iconName: string
  activityVerbs: string[]
  /** The natural-language prompt used to generate this template. */
  prompt: string
  createdAt: number
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
