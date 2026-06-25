import type { Company, Persona } from "./types"

/**
 * Seed data used only when DynamoDB is unreachable (e.g. local preview without
 * synced credentials). It lets the multi-tenant UI, Skill Marketplace, and Live
 * Activity Feed render meaningfully. In the deployed environment the real table
 * is the source of truth and this is never used.
 */
const now = Date.now()
const HOUR = 3600_000

export const DEMO_COMPANIES: Company[] = [
  { id: "demo-acme", entityType: "company", name: "Acme Analytics", domain: "acme.com", baseUrl: "https://api.acme.com/mcp", createdAt: now - 40 * HOUR },
  { id: "demo-orbit", entityType: "company", name: "Orbit Social", domain: "orbit.so", baseUrl: "https://orbit.so/openapi.json", createdAt: now - 20 * HOUR },
]

export const DEMO_PERSONAS: Persona[] = [
  {
    id: "demo-sarah",
    entityType: "persona",
    companyId: "demo-acme",
    name: "Sarah Okafor",
    role: "Senior Data Scientist",
    platform: "Acme Analytics",
    mcpUrl: "https://api.acme.com/mcp",
    skillIds: ["data-analyst", "content-creator"],
    currentSkillId: "data-analyst",
    status: "active",
    timezone: "America/New_York",
    workStartHour: 9,
    workEndHour: 18,
    minLatencySeconds: 45,
    maxLatencySeconds: 300,
    postsPerDay: 2,
    postsPublished: 7,
    engagementScore: 142,
    createdAt: now - 38 * HOUR,
    lastActiveAt: now - 3 * 60_000,
  },
  {
    id: "demo-marco",
    entityType: "persona",
    companyId: "demo-acme",
    name: "Marco Bianchi",
    role: "Product Researcher",
    platform: "Acme Analytics",
    mcpUrl: "https://api.acme.com/mcp",
    skillIds: ["social-engager", "trend-scout"],
    currentSkillId: "social-engager",
    status: "idle",
    timezone: "Europe/Madrid",
    workStartHour: 8,
    workEndHour: 17,
    minLatencySeconds: 30,
    maxLatencySeconds: 180,
    postsPerDay: 3,
    postsPublished: 11,
    engagementScore: 205,
    createdAt: now - 30 * HOUR,
    lastActiveAt: now - 9 * 60_000,
  },
  {
    id: "demo-yuki",
    entityType: "persona",
    companyId: "demo-orbit",
    name: "Yuki Tanaka",
    role: "Community Lead",
    platform: "Orbit Social",
    mcpUrl: "https://orbit.so/openapi.json",
    skillIds: ["content-creator", "community-moderator", "social-engager"],
    currentSkillId: "content-creator",
    status: "seeding",
    timezone: "Asia/Tokyo",
    workStartHour: 9,
    workEndHour: 19,
    minLatencySeconds: 60,
    maxLatencySeconds: 420,
    postsPerDay: 2,
    postsPublished: 4,
    engagementScore: 88,
    createdAt: now - 18 * HOUR,
    lastActiveAt: now - 60_000,
  },
]
