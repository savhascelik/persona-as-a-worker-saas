import { SKILLS } from "./skills"

/**
 * The universe of MCP tools the scanner can surface. In a real deployment this
 * list is read from the platform's MCP manifest / OpenAPI document. Here we
 * derive a stable, plausible tool set from the endpoint so the discovery UX is
 * fully demonstrable without a live network call.
 */
const TOOL_CATALOG = [
  "read_data",
  "query_dataset",
  "export_csv",
  "read_thread",
  "post_reply",
  "react_to_post",
  "create_post",
  "upload_media",
  "publish_draft",
  "search_topics",
  "flag_content",
] as const

/** Deterministic hash so the same endpoint always yields the same scan. */
function hash(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export interface ScanResult {
  /** Tools discovered on the endpoint. */
  tools: string[]
  /** Built-in skill ids fully supported by the discovered tools. */
  compatibleSkillIds: string[]
}

/**
 * Simulates an MCP/OpenAPI deep scan: derives a deterministic tool set from the
 * endpoint, then matches built-in skills whose required tools are all present.
 */
export function scanEndpoint(url: string): ScanResult {
  const seed = hash(url.trim().toLowerCase() || "endpoint")

  // Always include the universally-available read tool, then admit each other
  // tool based on bits of the hash so different endpoints differ meaningfully.
  const tools = TOOL_CATALOG.filter((tool, i) => tool === "read_data" || ((seed >> i) & 1) === 1)

  const toolSet = new Set(tools)
  const compatibleSkillIds = SKILLS.filter((skill) =>
    skill.requiredTools.every((t) => toolSet.has(t)),
  ).map((s) => s.id)

  // Guarantee at least one suggestion so onboarding never dead-ends.
  if (compatibleSkillIds.length === 0) {
    const fallback = SKILLS.find((s) => s.requiredTools.some((t) => toolSet.has(t)))
    if (fallback) compatibleSkillIds.push(fallback.id)
  }

  return { tools, compatibleSkillIds }
}
