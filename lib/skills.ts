import type { LucideIcon } from "lucide-react"
import { BarChart3, MessagesSquare, PenLine, Radar, ShieldCheck } from "lucide-react"

export type SkillId = "data-analyst" | "social-engager" | "content-creator" | "trend-scout" | "community-moderator"

export interface Skill {
  id: SkillId
  /** Short label, e.g. "Data Analyst". */
  name: string
  /** One-line capability summary shown in the marketplace. */
  summary: string
  /** MCP tools this skill requires to be exposed by the connected platform. */
  requiredTools: string[]
  icon: LucideIcon
  /** Verb fragments used to compose live activity lines. */
  activityVerbs: string[]
}

/**
 * The Skill Marketplace catalog. Skills are inspired by Gemini Skills / MCP:
 * each one declares the concrete tool calls it needs from the connected
 * platform so personas can be matched to a platform's real capabilities.
 */
export const SKILLS: Skill[] = [
  {
    id: "data-analyst",
    name: "Data Analyst",
    summary: "Reads JSON/CSV exports and surfaces patterns in your platform data.",
    requiredTools: ["read_data", "query_dataset", "export_csv"],
    icon: BarChart3,
    activityVerbs: [
      "processing quarterly reports",
      "cross-referencing cohort retention tables",
      "summarizing a 12k-row CSV export",
      "flagging an anomaly in signup funnels",
    ],
  },
  {
    id: "social-engager",
    name: "Social Engaging",
    summary: "Replies to threads and nurtures discussions with measured, on-topic responses.",
    requiredTools: ["read_thread", "post_reply", "react_to_post"],
    icon: MessagesSquare,
    activityVerbs: [
      "replying to a thread on onboarding friction",
      "welcoming three new members",
      "adding context to a pricing debate",
      "upvoting a well-reasoned feature request",
    ],
  },
  {
    id: "content-creator",
    name: "Content Creator",
    summary: "Writes long-form, creator-level posts that spark real conversations.",
    requiredTools: ["create_post", "upload_media", "publish_draft"],
    icon: PenLine,
    activityVerbs: [
      "drafting a long-form teardown of your API",
      "publishing a 1,400-word case study",
      "outlining a weekly product digest",
      "polishing a deep-dive on workflow automation",
    ],
  },
  {
    id: "trend-scout",
    name: "Trend Scout",
    summary: "Monitors topics and resurfaces emerging themes worth seeding around.",
    requiredTools: ["search_topics", "read_data"],
    icon: Radar,
    activityVerbs: [
      "scanning trending tags for the week",
      "clustering three emerging discussion themes",
      "benchmarking against competitor activity",
    ],
  },
  {
    id: "community-moderator",
    name: "Community Moderator",
    summary: "Keeps early discussions healthy by triaging low-signal and off-topic posts.",
    requiredTools: ["read_thread", "flag_content", "react_to_post"],
    icon: ShieldCheck,
    activityVerbs: [
      "triaging a flagged off-topic post",
      "merging two duplicate threads",
      "pinning a high-signal answer",
    ],
  },
]

export const SKILL_MAP: Record<string, Skill> = Object.fromEntries(SKILLS.map((s) => [s.id, s]))

export function getSkill(id: string): Skill | undefined {
  return SKILL_MAP[id]
}

export function getSkills(ids: string[]): Skill[] {
  return ids.map((id) => SKILL_MAP[id]).filter((s): s is Skill => Boolean(s))
}

/** Union of every MCP tool required by the given skill ids, de-duplicated. */
export function requiredToolsFor(ids: string[]): string[] {
  const tools = new Set<string>()
  for (const id of ids) {
    SKILL_MAP[id]?.requiredTools.forEach((t) => tools.add(t))
  }
  return [...tools]
}

export const MIN_SKILLS = 1
export const MAX_SKILLS = 3
