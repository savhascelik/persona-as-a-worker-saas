export type PersonaStatus = "active" | "idle" | "offline" | "seeding"

export interface Persona {
  id: string
  name: string
  role: string
  // The platform the persona seeds, learned via an MCP/OpenAPI endpoint.
  platform: string
  mcpUrl: string
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
  name: string
  role: string
  platform: string
  mcpUrl: string
  timezone: string
  workStartHour: number
  workEndHour: number
  minLatencySeconds: number
  maxLatencySeconds: number
  postsPerDay: number
}
